import { type Context, Logger, Service } from 'koishi'
import type {
    AgentContext,
    CharacterChatService,
    CharacterConfig,
    CharacterModelSchedulerService,
    MemoryContext,
    Message,
    MessageContext,
    ScheduleContext,
    ScheduleTask,
    ThinkingResult
} from '../types'
import type { ResponseQueueTicket } from '../core/base/response_queue'
import { CharacterAgent } from '../core'
import { ThinkingBrain } from '../core/brain'
import { SchedulePlanner } from '../core/schedule/planner'
import { BehaviorSimulator } from '../core/schedule/behavior_simulator'
import { ScheduleSystem } from '../core/schedule/system'
import { HolidayDetector } from '../core/schedule/holiday_detector'
import { ResponseParser } from '../utils/response-parser'

const logger = new Logger('chatluna-character-v1')

// ─── Service ─────────────────────────────────────────────────────────

export class ChatService extends Service implements CharacterChatService {
    static inject = [
        'chatluna_character_config',
        'chatluna_character_preset',
        'chatluna_character_model_scheduler'
    ]

    private _agent: CharacterAgent | null = null
    private _parser: ResponseParser | null = null

    constructor(ctx: Context) {
        super(ctx, 'chatluna_character_chat')
    }

    protected override async start(): Promise<void> {
        this._agent = new CharacterAgent(this.ctx)
        this._parser = new ResponseParser()

        this.ctx.effect(() => this._agent!.registerToolsToChatLuna())
    }

    protected override async stop(): Promise<void> {
        this._agent = null
        this._parser = null
    }

    // ─── Public API: passive collect (called by MessageCollector) ──

    async handlePassiveCollect(
        session: import('koishi').Session,
        context: MessageContext,
        ticket: ResponseQueueTicket<MessageContext>,
        scheduleTask?: ScheduleTask
    ): Promise<void> {
        await this._handleCollectedMessage(
            session,
            context,
            ticket,
            scheduleTask,
            undefined
        )
    }

    // ─── Public API: trigger a reply ─────────────────────────────────

    async triggerReply(
        targetType: 'group' | 'private',
        targetId: string,
        reason: string
    ): Promise<boolean> {
        logger.info(
            `[ChatService.triggerReply] ${targetType}:${targetId} reason="${reason}"`
        )

        const session = this._createSession(targetType, targetId)
        if (!session) {
            logger.info(
                `[ChatService.triggerReply] could not create session for ${targetType}:${targetId}`
            )
            return false
        }

        if (targetType === 'group' && !this._isGuildEnabled(targetId)) {
            logger.info(
                `[ChatService.triggerReply] guild ${targetId} not enabled`
            )
            return false
        }

        const messageContext = this._buildTriggerMessageContext(
            session,
            targetType,
            targetId,
            reason
        )

        const ticket: ResponseQueueTicket<MessageContext> = {
            key: `active_trigger:${targetType}:${targetId}`,
            payload: messageContext,
            release: () => {}
        }

        await this._handleCollectedMessage(
            session,
            messageContext,
            ticket,
            undefined,
            reason
        )

        return true
    }

    // ─── Reply pipeline ──────────────────────────────────────────────

    private async _handleCollectedMessage(
        session: import('koishi').Session,
        context: MessageContext,
        ticket: ResponseQueueTicket<MessageContext>,
        scheduleTask?: ScheduleTask,
        triggerReason?: string
    ): Promise<void> {
        try {
            const isGroup = !session.isDirect
            const guildId = session.guildId ?? undefined

            if (isGroup && guildId && !this._isGuildEnabled(guildId)) {
                logger.info(
                    `[ChatService._handleCollectedMessage] guild=${guildId} not enabled, skip`
                )
                return
            }

            const configLoader = this.ctx.chatluna_character_config
            const presetService = this.ctx.chatluna_character_preset
            if (!configLoader?.globalConfig || !presetService) {
                return
            }

            const characterConfig = this._resolveCharacterConfig(guildId)
            const preset = await this._resolvePreset(characterConfig)
            if (!preset) {
                logger.warn('[ChatService] preset not available')
                return
            }

            const message = context.messages.at(-1)
            if (!message) return

            if (!session.userId || session.userId !== session.bot.selfId) {
                await this.ctx.chatluna_character_stats?.recordMessageReceived(
                    session
                )
            }

            const memory = await this._buildMemoryContext(
                characterConfig,
                session,
                message
            )

            const guildScheduler = this._bindGuildScheduler(
                this.ctx.chatluna_character_model_scheduler,
                guildId
            )

            const schedule = await this._buildScheduleContext(
                guildScheduler,
                characterConfig,
                preset.system.rawString,
                session
            )

            const triggerService = this.ctx.chatluna_character_triggers
            if (!triggerService) return

            const triggerResult = await triggerService.decide({
                session,
                message,
                messages: context.messages,
                isPrivate: session.isDirect,
                guildId,
                userId: context.userId,
                config: characterConfig,
                scheduleTask
            })

            // For active triggers, we always respond regardless of passive decide
            const shouldRespond = triggerResult.shouldRespond || !!triggerReason

            if (!shouldRespond) return

            const thinkingResult = await this._runThinkingBrain(
                guildScheduler,
                characterConfig,
                session,
                context.messages,
                memory,
                preset.status ?? ''
            )

            // For active triggers (triggerReason), skip ThinkingBrain veto
            if (
                !triggerReason &&
                thinkingResult &&
                !thinkingResult.shouldRespond
            ) {
                return
            }

            if (thinkingResult?.behaviorDecision?.observations?.length) {
                this._applyObservations(
                    session,
                    thinkingResult.behaviorDecision.observations
                )
            }

            const agentContext: AgentContext = {
                session,
                config: characterConfig,
                preset,
                messages: context.messages,
                memory,
                schedule,
                thinkingResult,
                triggerInfo: triggerResult.trigger ?? {
                    shouldTrigger: true,
                    priority: 0,
                    reason: triggerReason
                }
            }

            const result = await this._agent!.execute(agentContext)

            const sentCount = await this._handleAgentOutput(
                session,
                result.output,
                characterConfig.reply
            )

            if (sentCount > 0) {
                await this.ctx.chatluna_character_stats?.recordResponseSent(
                    session,
                    sentCount
                )
                // Notify the trigger service about the response
                const targetType = session.isDirect ? 'private' : 'group'
                const targetId = session.isDirect
                    ? (session.userId ?? '')
                    : (guildId ?? '')
                this.ctx.chatluna_character_triggers?.notifyResponseSent(
                    targetType,
                    targetId
                )
            }
        } finally {
            ticket.release()
        }
    }

    // ─── Pipeline helpers ────────────────────────────────────────────

    private _resolveCharacterConfig(
        guildId?: string
    ): CharacterConfig & { preset?: string } {
        const loader = this.ctx.chatluna_character_config
        if (guildId) {
            return loader.getGuildConfig(guildId)
        }
        return loader.globalConfig
    }

    private async _resolvePreset(
        config: CharacterConfig & { preset?: string }
    ) {
        const presetService = this.ctx.chatluna_character_preset
        const preferred = config.preset?.trim()
        if (preferred) {
            const preset = await presetService.getPreset(preferred)
            if (preset) return preset
        }

        const fallback = await presetService.getPreset('default')
        if (fallback) return fallback

        const all = await presetService.getAllPreset()
        return all[0] ?? null
    }

    private async _buildMemoryContext(
        config: CharacterConfig,
        session: import('koishi').Session,
        message: Message
    ): Promise<MemoryContext> {
        if (!config.memory?.enabled) {
            return { relevantMemories: [] }
        }
        const memoryService = this.ctx.chatluna_character_memory
        if (!memoryService) {
            return { relevantMemories: [] }
        }

        const query = message.content ?? ''
        const records = await memoryService.query({
            guildId: session.guildId ?? undefined,
            userId: session.isDirect ? session.userId : undefined,
            query,
            limit: 5,
            includeEvents: true
        })

        return { relevantMemories: records }
    }

    private async _buildScheduleContext(
        scheduler: CharacterModelSchedulerService,
        config: CharacterConfig,
        characterProfile: string,
        session: import('koishi').Session
    ): Promise<ScheduleContext | undefined> {
        const scheduleConfig = config.schedule
        if (!scheduleConfig?.enabled) return undefined

        const planner = new SchedulePlanner(
            scheduler,
            new HolidayDetector(),
            scheduleConfig,
            undefined,
            this.ctx.chatluna_character_stats
        )
        const system = new ScheduleSystem(planner, new BehaviorSimulator())
        return await system.buildContext({
            characterProfile,
            location: scheduleConfig.location,
            timezone: scheduleConfig.timezone,
            tasks: config.triggers.schedule.tasks,
            session
        })
    }

    private async _runThinkingBrain(
        scheduler: CharacterModelSchedulerService,
        config: CharacterConfig,
        session: import('koishi').Session,
        messages: Message[],
        memory: MemoryContext,
        characterState: string
    ): Promise<ThinkingResult | undefined> {
        if (!config.thinkingBrain?.enabled) return undefined
        const brain = new ThinkingBrain(
            scheduler,
            config.thinkingBrain,
            this.ctx.chatluna_character_stats
        )
        return await brain.think({
            session,
            messages,
            memory,
            characterState,
            currentTime: new Date(),
            groupInfo: session.isDirect
                ? undefined
                : {
                      lastMessageTime: messages.at(-1)?.timestamp ?? Date.now()
                  }
        })
    }

    private _applyObservations(
        session: import('koishi').Session,
        observations: ThinkingResult['behaviorDecision']['observations']
    ): void {
        if (!this.ctx.chatluna_character_triggers?.applyToolUpdate) return
        const stateKey = session.isDirect
            ? `private:${session.userId ?? session.uid ?? ''}`
            : `group:${session.guildId ?? 'unknown'}`

        for (const observation of observations) {
            const action =
                observation.type === 'user'
                    ? 'watch_user'
                    : observation.type === 'topic'
                      ? 'watch_topic'
                      : 'watch_keyword'
            const payload =
                observation.type === 'user'
                    ? { userId: observation.target }
                    : observation.type === 'topic'
                      ? { topic: observation.target }
                      : { keyword: observation.target }
            this.ctx.chatluna_character_triggers.applyToolUpdate(
                stateKey,
                action,
                {
                    trigger: observation.type === 'topic' ? 'topic' : 'keyword',
                    ...payload
                }
            )
        }
    }

    private async _handleAgentOutput(
        session: import('koishi').Session,
        output: string,
        replyConfig: CharacterConfig['reply']
    ): Promise<number> {
        const parsed = await this._parser!.parse(output, {
            allowAt: replyConfig.isAt,
            markdownRender: replyConfig.markdownRender,
            splitSentence: replyConfig.splitSentence
        })

        let sentCount = 0
        for (const group of parsed.messageGroups) {
            if (!group.length) continue
            const text = this._extractText(group)
            const delay = this._calculateDelay(text, replyConfig)
            if (delay > 0) {
                await new Promise((resolve) => setTimeout(resolve, delay))
            }
            await session.send(group)
            sentCount += 1
        }

        return sentCount
    }

    private _extractText(elements: import('koishi').Element[]): string {
        const texts: string[] = []
        for (const element of elements) {
            if (element.type === 'text') {
                texts.push(String(element.attrs?.content ?? ''))
            }
        }
        return texts.join('')
    }

    private _calculateDelay(
        text: string,
        replyConfig: CharacterConfig['reply']
    ): number {
        const size = Math.max(0, text.length)
        const base =
            size > replyConfig.largeTextSize
                ? replyConfig.largeTextTypingTime
                : replyConfig.typingTime
        return Math.max(0, size * base)
    }

    // ─── Session / context helpers ───────────────────────────────────

    private _createSession(
        targetType: 'group' | 'private',
        targetId: string
    ): import('koishi').Session | null {
        const bot = Object.values(this.ctx.bots)[0]
        if (!bot) return null

        const isDirect = targetType === 'private'
        const event = {
            type: 'message',
            timestamp: Date.now(),
            channel: {
                id: targetId,
                type: isDirect ? 1 : 0
            },
            guild: isDirect ? undefined : { id: targetId },
            user: {
                id: isDirect ? targetId : bot.selfId,
                name: bot.user?.name ?? 'bot'
            },
            message: {
                id: `active_trigger:${Date.now()}`,
                elements: []
            }
        }

        const session = bot.session(event)
        session.isDirect = isDirect
        return session
    }

    private _buildTriggerMessageContext(
        session: import('koishi').Session,
        targetType: 'group' | 'private',
        targetId: string,
        reason: string
    ): MessageContext {
        // Try to get existing messages from the message collector
        const collector = this.ctx.chatluna_character_message_collector
        const existingContext = collector?.getContext(session)

        const message: Message = {
            id: session.userId ?? session.bot.selfId,
            name: session.bot.user?.name ?? 'bot',
            content: `[active_trigger:${reason}]`,
            timestamp: Date.now()
        }

        return {
            type: targetType,
            guildId: targetType === 'group' ? targetId : undefined,
            userId:
                targetType === 'private' ? targetId : (session.userId ?? ''),
            messages: existingContext?.messages?.length
                ? existingContext.messages
                : [message],
            metadata: {
                lastActivity: Date.now(),
                triggerState: {
                    enabled: true,
                    updatedAt: Date.now(),
                    watchedUsers: [],
                    watchedKeywords: [],
                    watchedTopics: []
                }
            }
        }
    }

    private _isGuildEnabled(guildId: string): boolean {
        const applyGroup =
            this.ctx.chatluna_character_config?.globalConfig?.applyGroup ?? []
        return applyGroup.includes(guildId)
    }

    private _bindGuildScheduler(
        scheduler: CharacterModelSchedulerService,
        guildId?: string
    ): CharacterModelSchedulerService {
        return {
            getMainModel: () => scheduler.getMainModel(guildId),
            getAnalysisModel: () => scheduler.getAnalysisModel(guildId),
            getThinkingModel: () => scheduler.getThinkingModel(guildId)
        }
    }
}
