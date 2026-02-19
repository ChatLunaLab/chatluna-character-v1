import { Context, type Element, Service, type Session, Time } from 'koishi'
import type {
    CharacterConfig,
    Message,
    MessageCollectHandler,
    MessageCollectorConfig,
    MessageCollectorFilter,
    MessageCollectorService,
    MessageContext
} from '../types'
import { MessageParser } from '../utils/message-parser'
import { ResponseQueue } from '../core/base/response_queue'

const DEFAULT_COLLECTOR_CONFIG: MessageCollectorConfig = {
    mode: 'both',
    maxMessages: 30,
    messageExpireTime: Time.hour
}

export class MessageCollector
    extends Service
    implements MessageCollectorService
{
    private readonly _parser = new MessageParser()
    private readonly _queue = new ResponseQueue<MessageContext>()
    private readonly _contexts = new Map<string, MessageContext>()
    private readonly _filters: MessageCollectorFilter[] = []
    private readonly _config: MessageCollectorConfig

    constructor(ctx: Context, config?: Partial<MessageCollectorConfig>) {
        super(ctx, 'chatluna_character_message_collector')
        this._config = { ...DEFAULT_COLLECTOR_CONFIG, ...config }
    }

    addFilter(filter: MessageCollectorFilter): void {
        this._filters.push(filter)
    }

    onCollect(handler: MessageCollectHandler): void {
        this.ctx.on('chatluna_character/message_collect', handler)
    }

    getContext(session: Session): MessageContext | undefined {
        const key = this._getContextKey(session)
        return this._contexts.get(key)
    }

    getMessages(session: Session): Message[] {
        return this.getContext(session)?.messages ?? []
    }

    clear(session?: Session): void {
        if (!session) {
            this._contexts.clear()
            this._queue.cancelPending()
            return
        }

        const key = this._getContextKey(session)
        this._contexts.delete(key)
        this._queue.cancelPending(key)
    }

    async handleSession(session: Session): Promise<boolean> {
        if (!this._shouldCollect(session)) {
            return false
        }

        const message = this._normalizeSession(session)
        const context = this._getOrCreateContext(session)
        context.messages.push(message)
        context.userId = this._resolveUserId(session)
        context.metadata.lastActivity = Date.now()

        const config = this._getCollectorConfig(session)
        this._trimMessages(context, config)

        const characterConfig = this._getCharacterConfig(session)
        if (characterConfig?.image?.enabled) {
            await this._applyImageLimits(context, characterConfig)
        }

        const shouldTrigger = await this._runFilters(session, message, context)

        if (!shouldTrigger) {
            return false
        }

        const ticket = await this._queue.acquire(
            this._getContextKey(session),
            context
        )

        if (!ticket) {
            return false
        }

        await this.ctx.parallel(
            'chatluna_character/message_collect',
            session,
            context,
            ticket
        )
        return true
    }

    private _shouldCollect(session: Session): boolean {
        if (this._config.mode === 'both') {
            return true
        }
        if (this._config.mode === 'private') {
            return session.isDirect
        }
        return !session.isDirect
    }

    private _runFilters(
        session: Session,
        message: Message,
        context: MessageContext
    ): Promise<boolean> {
        return this._filters.reduce(async (result, filter) => {
            if (!(await result)) {
                return false
            }
            return await filter(session, message, context)
        }, Promise.resolve(true))
    }

    private _normalizeSession(session: Session): Message {
        const parsed = this._parser.parse(session.elements ?? session.content)
        const userId = this._resolveUserId(session)
        const userName = this._resolveUserName(session, userId)

        return {
            id: userId,
            name: userName,
            content:
                typeof session.content === 'string'
                    ? session.content
                    : parsed.plainText,
            messageId: session.messageId ?? undefined,
            timestamp: session.event?.timestamp ?? Date.now(),
            elements: parsed.elements,
            parsed
        }
    }

    private _getOrCreateContext(session: Session): MessageContext {
        const key = this._getContextKey(session)
        const existing = this._contexts.get(key)
        if (existing) {
            return existing
        }

        const now = Date.now()
        const context: MessageContext = {
            type: session.isDirect ? 'private' : 'group',
            guildId: session.guildId ?? undefined,
            userId: this._resolveUserId(session),
            messages: [],
            metadata: {
                lastActivity: now,
                triggerState: {
                    enabled: true,
                    updatedAt: now,
                    watchedUsers: [],
                    watchedKeywords: [],
                    watchedTopics: []
                }
            }
        }

        this._contexts.set(key, context)
        return context
    }

    private _getContextKey(session: Session): string {
        if (session.isDirect) {
            return `private:${this._resolveUserId(session)}`
        }
        return `group:${session.guildId ?? 'unknown'}`
    }

    private _getCollectorConfig(session: Session): MessageCollectorConfig {
        const loader = this.ctx.chatluna_character_config
        if (loader?.globalConfig) {
            const config = session.guildId
                ? loader.getGuildConfig(session.guildId)
                : loader.globalConfig
            return {
                ...this._config,
                maxMessages: config.global.maxMessages,
                messageExpireTime: config.global.messageExpireTime
            }
        }
        return this._config
    }

    private _getCharacterConfig(session: Session): CharacterConfig | undefined {
        const loader = this.ctx.chatluna_character_config
        if (!loader?.globalConfig) {
            return undefined
        }
        return session.guildId
            ? loader.getGuildConfig(session.guildId)
            : loader.globalConfig
    }

    private _trimMessages(
        context: MessageContext,
        config: MessageCollectorConfig
    ): void {
        const now = Date.now()
        const expireTime = config.messageExpireTime

        if (expireTime > 0) {
            context.messages = context.messages.filter((message) => {
                const timestamp = message.timestamp ?? now
                return now - timestamp <= expireTime
            })
        }

        if (config.maxMessages > 0) {
            while (context.messages.length > config.maxMessages) {
                context.messages.shift()
            }
        }
    }

    private async _applyImageLimits(
        context: MessageContext,
        config: CharacterConfig
    ): Promise<void> {
        const maxCount = Math.max(0, config.image.maxCount)
        const maxSize = Math.max(0, config.image.maxSize) * 1024 * 1024 || 0

        if (maxCount === 0 || maxSize === 0) {
            for (const message of context.messages) {
                if (message.elements?.length) {
                    message.elements = message.elements.filter(
                        (element) => element.type !== 'img'
                    )
                    message.parsed = this._parser.parse(message.elements)
                }
            }
            return
        }

        let currentCount = 0
        let currentSize = 0

        for (let i = context.messages.length - 1; i >= 0; i--) {
            const message = context.messages[i]
            if (!message.elements?.length) {
                continue
            }

            let touched = false
            const nextElements = []

            for (const element of message.elements) {
                if (element.type !== 'img') {
                    nextElements.push(element)
                    continue
                }

                const src = this._resolveImageSource(element)
                if (!src) {
                    touched = true
                    continue
                }

                const size = await this._getImageSize(src)
                if (currentCount < maxCount && currentSize + size <= maxSize) {
                    nextElements.push(element)
                    currentCount++
                    currentSize += size
                } else {
                    touched = true
                }
            }

            if (touched) {
                message.elements = nextElements
                message.parsed = this._parser.parse(nextElements)
            }

            if (currentCount >= maxCount || currentSize >= maxSize) {
                for (let j = i - 1; j >= 0; j--) {
                    const older = context.messages[j]
                    if (older.elements?.some((el) => el.type === 'img')) {
                        older.elements = older.elements.filter(
                            (el) => el.type !== 'img'
                        )
                        older.parsed = this._parser.parse(older.elements)
                    }
                }
                break
            }
        }
    }

    private _resolveImageSource(element: Element): string {
        if (!element || element.type !== 'img') {
            return ''
        }

        const attrs = element.attrs as Record<string, unknown>
        const src =
            typeof attrs.src === 'string'
                ? attrs.src
                : typeof attrs.url === 'string'
                  ? attrs.url
                  : typeof attrs.imageUrl === 'string'
                    ? attrs.imageUrl
                    : ''

        return src
    }

    private async _getImageSize(src: string): Promise<number> {
        try {
            if (!src.startsWith('data:')) {
                const resp = await this.ctx.http.get(src, {
                    responseType: 'arraybuffer'
                })
                return resp.byteLength ?? 0
            }

            const base64Data = src.replace(/^data:image\/[a-z]+;base64,/, '')
            return Math.ceil((base64Data.length * 3) / 4)
        } catch (error) {
            this.ctx.logger('chatluna-character-v1').debug(error)
            return 0
        }
    }

    private _resolveUserId(session: Session): string {
        return (
            session.author?.id ??
            session.userId ??
            session.event?.user?.id ??
            'unknown'
        )
    }

    private _resolveUserName(session: Session, fallback: string): string {
        return (
            session.author?.nick ??
            session.author?.name ??
            session.username ??
            session.event?.user?.name ??
            fallback
        )
    }
}
