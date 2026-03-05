import { Context, Logger, Service } from 'koishi'
import { HeartbeatBrain } from '../core/brain/heartbeat_brain'
import type { CharacterConfig, ShortTermMemory } from '../types'

const logger = new Logger('chatluna-character-v1')

export class HeartbeatService extends Service {
    static inject = [
        'chatluna_character_config',
        'chatluna_character_model_scheduler',
        'chatluna_character_message_collector',
        'chatluna_character_triggers',
        'chatluna_character_chat'
    ]

    private _timers = new Map<string, NodeJS.Timeout>()
    private _shortTermMemory = new Map<string, ShortTermMemory[]>()

    constructor(ctx: Context) {
        super(ctx, 'chatluna_character_heartbeat')
    }

    protected override async start(): Promise<void> {
        const config = this.ctx.chatluna_character_config?.globalConfig
        if (!config?.applyGroup) return

        if (config.thinkingBrain?.heartbeat?.enabled === false) {
            logger.info('[HeartbeatService] disabled by config, skip startup')
            return
        }

        const initialDelay = this._getDefaultDelayMs(config)

        for (const guildId of config.applyGroup) {
            this.scheduleHeartbeat(guildId, initialDelay)
        }
    }

    protected override async stop(): Promise<void> {
        for (const timer of this._timers.values()) {
            clearTimeout(timer)
        }
        this._timers.clear()
        this._shortTermMemory.clear()
    }

    scheduleHeartbeat(guildId: string, delay: number): void {
        const existing = this._timers.get(guildId)
        if (existing) clearTimeout(existing)

        const timer = setTimeout(() => this._runHeartbeat(guildId), delay)
        this._timers.set(guildId, timer)
        logger.info(
            `[HeartbeatService] scheduled for guild=${guildId} delay=${delay}ms`
        )
    }

    private async _runHeartbeat(guildId: string): Promise<void> {
        try {
            logger.info(
                `[HeartbeatService] running heartbeat for guild=${guildId}`
            )

            const config =
                this.ctx.chatluna_character_config?.getGuildConfig(guildId)
            if (!config) return

            if (config.thinkingBrain?.heartbeat?.enabled === false) {
                logger.info(`[HeartbeatService] disabled for guild=${guildId}`)
                return
            }

            const scheduler = this.ctx.chatluna_character_model_scheduler
            const brain = new HeartbeatBrain(this.ctx, scheduler, config)

            const session = this._createSession(guildId)
            if (!session) return

            const collector = this.ctx.chatluna_character_message_collector
            const messageContext = collector?.getContext(session)
            const messages = messageContext?.messages ?? []

            const triggerService = this.ctx.chatluna_character_triggers
            const state = triggerService?.getState?.(`group:${guildId}`)

            const result = await brain.think({
                session,
                guildId,
                messages,
                activityScore: state?.activityScore,
                lastHeartbeat: Date.now(),
                shortTermMemory: this._shortTermMemory.get(guildId) ?? []
            })

            if (result.observations.length > 0) {
                const memory = this._shortTermMemory.get(guildId) ?? []
                const maxObservations = Math.max(
                    1,
                    config.thinkingBrain?.heartbeat?.maxObservations ?? 20
                )
                for (const obs of result.observations) {
                    memory.push({
                        id: `${Date.now()}-${Math.random()}`,
                        guildId,
                        content: obs,
                        timestamp: Date.now(),
                        type: 'observation'
                    })
                }
                this._shortTermMemory.set(
                    guildId,
                    memory.slice(-maxObservations)
                )
            }

            if (result.shouldTriggerReply && result.triggerReason) {
                await this.ctx.chatluna_character_chat?.triggerReply(
                    'group',
                    guildId,
                    result.triggerReason
                )
            }

            this.scheduleHeartbeat(guildId, result.nextHeartbeatDelay)
        } catch (error) {
            logger.error(`[HeartbeatService] error in guild=${guildId}`, error)
            const fallbackConfig =
                this.ctx.chatluna_character_config?.getGuildConfig(guildId)
            this.scheduleHeartbeat(
                guildId,
                this._getDefaultDelayMs(fallbackConfig)
            )
        }
    }

    private _getDefaultDelayMs(config?: CharacterConfig): number {
        const minutes = Math.max(
            1,
            config?.thinkingBrain?.heartbeat?.defaultDelayMinutes ?? 5
        )
        return minutes * 60 * 1000
    }

    private _createSession(guildId: string) {
        const bot = Object.values(this.ctx.bots)[0]
        if (!bot) return null

        const event = {
            type: 'message',
            timestamp: Date.now(),
            channel: { id: guildId, type: 0 },
            guild: { id: guildId },
            user: { id: bot.selfId, name: bot.user?.name ?? 'bot' },
            message: { id: `heartbeat:${Date.now()}`, elements: [] }
        }

        const session = bot.session(event)
        session.isDirect = false
        return session
    }
}
