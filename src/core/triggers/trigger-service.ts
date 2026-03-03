import { type Context, Logger, Service, Time } from 'koishi'
import { randomUUID } from 'node:crypto'
import type {
    CharacterConfig,
    IdleTriggerConfig,
    PendingNextReply,
    PendingWakeUpReply,
    ScheduleTask,
    TriggerService as TriggerServiceType,
    TriggerState
} from '../../types'
import type { BaseTrigger, TriggerContext } from './base'
import { DecisionEngine, type DecisionResult } from './decision-engine'

const logger = new Logger('chatluna-character-v1')

const SCHEDULER_TICK = Time.second

// ─── Types ───────────────────────────────────────────────────────────

export type TriggerStateMap = Record<string, TriggerState>

export type TriggerToolAction =
    | 'watch_user'
    | 'watch_keyword'
    | 'watch_topic'
    | 'wait_message'
    | 'clear'

export type TriggerToolPayload = {
    trigger?: string
    userId?: string
    keyword?: string
    topic?: string
    messageId?: string
}

// ─── Per-target active trigger state ─────────────────────────────────

interface ActiveTargetState {
    /** Last message time per userId */
    messageTimestampsByUserId: Record<string, number>
    /** Global last-user-message time */
    lastUserMessageTime: number
    /** Pending next_reply triggers */
    pendingNextReplies: PendingNextReply[]
    /** Pending wake_up triggers (in-memory cache, source of truth is DB) */
    pendingWakeUpReplies: PendingWakeUpReply[]
    /** Last time we responded via an active trigger */
    lastActiveTriggerAt?: number
    /** Idle retry count (for exponential backoff) */
    idleRetryCount: number
    /** Current calculated idle wait (seconds), undefined = needs recalculation */
    currentIdleWaitSeconds?: number
    /** Last time the service triggered a response for this target */
    lastResponseTime: number
}

// ─── JS expression sandbox for next_reply conditions ─────────────────

const CONDITION_BLOCKED_PATTERN =
    /\b(eval|Function|import|require|process|globalThis|window|document|fetch|XMLHttpRequest|setTimeout|setInterval|Proxy|Reflect|constructor|__proto__)\b/

function validateCondition(condition: string): boolean {
    if (!condition || condition.length > 512) return false
    if (CONDITION_BLOCKED_PATTERN.test(condition)) return false
    return true
}

interface ConditionContext {
    silence: number
    silenceOf: (userId: string) => number
    said: (userId: string) => boolean
    now: number
    createdAt: number
}

function evaluateCondition(condition: string, ctx: ConditionContext): boolean {
    try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
        const fn = new Function(
            'silence',
            'silenceOf',
            'said',
            'now',
            'createdAt',
            `"use strict"; return !!(${condition});`
        )
        return fn(ctx.silence, ctx.silenceOf, ctx.said, ctx.now, ctx.createdAt)
    } catch {
        logger.warn(
            `[TriggerService] failed to evaluate condition: ${condition}`
        )
        return false
    }
}

// ─── Wake-up time parser ─────────────────────────────────────────────

function parseWakeUpTimeToTimestamp(rawTime: string): number | null {
    const matched = rawTime
        .trim()
        .match(/^(\d{4})\/(\d{2})\/(\d{2})-(\d{2}):(\d{2}):(\d{2})$/)
    if (!matched) return null

    const [, rawYear, rawMonth, rawDay, rawHour, rawMinute, rawSecond] = matched

    const year = Number.parseInt(rawYear, 10)
    const month = Number.parseInt(rawMonth, 10)
    const day = Number.parseInt(rawDay, 10)
    const hour = Number.parseInt(rawHour, 10)
    const minute = Number.parseInt(rawMinute, 10)
    const second = Number.parseInt(rawSecond, 10)

    if (
        !Number.isFinite(year) ||
        !Number.isFinite(month) ||
        !Number.isFinite(day) ||
        !Number.isFinite(hour) ||
        !Number.isFinite(minute) ||
        !Number.isFinite(second)
    ) {
        return null
    }

    const date = new Date(year, month - 1, day, hour, minute, second, 0)
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day ||
        date.getHours() !== hour ||
        date.getMinutes() !== minute ||
        date.getSeconds() !== second
    ) {
        return null
    }

    return date.getTime()
}

// ─── Service ─────────────────────────────────────────────────────────

export class TriggerService extends Service implements TriggerServiceType {
    static inject = ['database', 'chatluna_character_config']

    // Passive trigger engine
    private readonly _engine = new DecisionEngine()
    private readonly _passiveStates = new Map<string, TriggerStateMap>()

    // Active trigger state
    private readonly _activeStates = new Map<string, ActiveTargetState>()
    private _schedulerDispose: (() => void) | null = null

    constructor(ctx: Context) {
        super(ctx, 'chatluna_character_triggers')

        // Define the DB table for persistent wake-up triggers
        ctx.database.extend(
            'chatluna_character_active_trigger',
            {
                id: { type: 'char', length: 255 },
                targetType: { type: 'char', length: 16 },
                targetId: { type: 'char', length: 255 },
                triggerType: { type: 'char', length: 32 },
                payload: { type: 'text' },
                reason: { type: 'text' },
                triggerAt: { type: 'integer', length: 8 },
                createdAt: { type: 'timestamp' }
            },
            {
                autoInc: false,
                primary: 'id',
                unique: ['id']
            }
        )
    }

    protected override async start(): Promise<void> {
        // Load persisted wake-up triggers from DB
        await this._loadPersistedWakeUps()

        // Start the 1-second scheduler tick
        const interval = setInterval(
            () => this._schedulerTick(),
            SCHEDULER_TICK
        )
        this._schedulerDispose = () => clearInterval(interval)
    }

    protected override async stop(): Promise<void> {
        this._schedulerDispose?.()
        this._schedulerDispose = null
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Passive trigger API (message-driven)
    // ═══════════════════════════════════════════════════════════════════

    registerTrigger(trigger: BaseTrigger): void {
        this._engine.registerTrigger(trigger)
    }

    listTriggers(): BaseTrigger[] {
        return this._engine.listTriggers()
    }

    async decide(context: TriggerContext): Promise<DecisionResult> {
        const stateKey = this._getPassiveStateKey(context)
        const states = this._getOrCreatePassiveStates(stateKey, context.config)
        const result = await this._engine.decide({
            ...context,
            triggerStates: states
        })

        const consume = result.trigger?.metadata?.consumeAfterMessageId
        if (consume && result.trigger) {
            const state = states[result.trigger.name]
            if (state?.afterMessageId) {
                delete state.afterMessageId
                state.updatedAt = Date.now()
            }
        }

        return result
    }

    getStates(stateKey: string): TriggerStateMap {
        return this._getOrCreatePassiveStates(stateKey)
    }

    updateState(
        stateKey: string,
        triggerName: string,
        patch: Partial<TriggerState>
    ): TriggerState {
        const states = this._getOrCreatePassiveStates(stateKey)
        const current = states[triggerName] ?? this._createDefaultState(true)

        const next: TriggerState = {
            ...current,
            ...patch,
            watchedUsers: patch.watchedUsers ?? current.watchedUsers,
            watchedKeywords: patch.watchedKeywords ?? current.watchedKeywords,
            watchedTopics: patch.watchedTopics ?? current.watchedTopics,
            updatedAt: Date.now()
        }

        states[triggerName] = next
        return next
    }

    applyToolUpdate(
        stateKey: string,
        action: string,
        payload: Record<string, unknown>
    ): TriggerStateMap {
        const safePayload = payload as TriggerToolPayload
        const safeAction = action as TriggerToolAction
        const target = safePayload.trigger
        if (safeAction === 'clear') {
            if (target) {
                this.updateState(
                    stateKey,
                    target,
                    this._createDefaultState(true)
                )
                return this.getStates(stateKey)
            }
            this._passiveStates.delete(stateKey)
            return this.getStates(stateKey)
        }

        if (safeAction === 'watch_user' && safePayload.userId) {
            const name = target ?? 'keyword'
            const current = this.getStates(stateKey)[name]
            const watched = new Set(current?.watchedUsers ?? [])
            watched.add(safePayload.userId)
            this.updateState(stateKey, name, {
                watchedUsers: Array.from(watched)
            })
        }

        if (safeAction === 'watch_keyword' && safePayload.keyword) {
            const name = target ?? 'keyword'
            const current = this.getStates(stateKey)[name]
            const watched = new Set(current?.watchedKeywords ?? [])
            watched.add(safePayload.keyword)
            this.updateState(stateKey, name, {
                watchedKeywords: Array.from(watched)
            })
        }

        if (safeAction === 'watch_topic' && safePayload.topic) {
            const name = target ?? 'topic'
            const current = this.getStates(stateKey)[name]
            const watched = new Set(current?.watchedTopics ?? [])
            watched.add(safePayload.topic)
            this.updateState(stateKey, name, {
                watchedTopics: Array.from(watched)
            })
        }

        if (safeAction === 'wait_message' && safePayload.messageId) {
            const name = target ?? 'private'
            this.updateState(stateKey, name, {
                afterMessageId: safePayload.messageId
            })
        }

        return this.getStates(stateKey)
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Active trigger API (timer-driven)
    // ═══════════════════════════════════════════════════════════════════

    // ─── next_reply ──────────────────────────────────────────────────

    registerNextReply(
        targetType: 'group' | 'private',
        targetId: string,
        condition: string,
        reason?: string
    ): boolean {
        if (!validateCondition(condition)) {
            logger.warn(
                `[TriggerService.registerNextReply] invalid condition: ${condition}`
            )
            return false
        }

        const state = this._getOrCreateActiveState(targetType, targetId)
        const pending: PendingNextReply = {
            condition,
            reason: reason ?? `Triggered by next_reply condition: ${condition}`,
            createdAt: Date.now()
        }

        // Single-slot: later overwrites earlier
        state.pendingNextReplies = [pending]
        logger.info(
            `[TriggerService.registerNextReply] ${targetType}:${targetId} condition="${condition}"`
        )
        return true
    }

    clearNextReplies(targetType: 'group' | 'private', targetId: string): void {
        const key = `${targetType}:${targetId}`
        const state = this._activeStates.get(key)
        if (state) {
            state.pendingNextReplies = []
        }
    }

    listNextReplies(
        targetType: 'group' | 'private',
        targetId: string
    ): PendingNextReply[] {
        const key = `${targetType}:${targetId}`
        return this._activeStates.get(key)?.pendingNextReplies ?? []
    }

    // ─── wake_up ─────────────────────────────────────────────────────

    async registerWakeUp(
        targetType: 'group' | 'private',
        targetId: string,
        rawTime: string,
        reason: string
    ): Promise<boolean> {
        const triggerAt = parseWakeUpTimeToTimestamp(rawTime)
        if (triggerAt == null) {
            return false
        }

        const now = Date.now()
        if (triggerAt <= now) {
            logger.info(
                `[TriggerService.registerWakeUp] time already passed: ${rawTime}`
            )
            return false
        }

        const normalizedReason = reason.trim()
        const configuredAtText = this._formatTimestamp(now)

        const pending: PendingWakeUpReply = {
            rawTime,
            reason: normalizedReason,
            naturalReason: normalizedReason
                ? `You configured this wake-up at ${configuredAtText} to trigger at ${rawTime}, note: "${normalizedReason}"`
                : `You configured this wake-up at ${configuredAtText} to trigger at ${rawTime}`,
            triggerAt,
            createdAt: now
        }

        const state = this._getOrCreateActiveState(targetType, targetId)
        state.pendingWakeUpReplies.push(pending)

        const id = randomUUID()
        await this.ctx.database.create('chatluna_character_active_trigger', {
            id,
            targetType,
            targetId,
            triggerType: 'wake_up',
            payload: rawTime,
            reason: normalizedReason,
            triggerAt,
            createdAt: new Date(now)
        })

        logger.info(
            `[TriggerService.registerWakeUp] ${targetType}:${targetId} time="${rawTime}" reason="${normalizedReason}" dbId=${id}`
        )
        return true
    }

    async clearWakeUps(
        targetType: 'group' | 'private',
        targetId: string
    ): Promise<void> {
        const key = `${targetType}:${targetId}`
        const state = this._activeStates.get(key)
        if (state) {
            state.pendingWakeUpReplies = []
        }
        await this.ctx.database.remove('chatluna_character_active_trigger', {
            targetType,
            targetId,
            triggerType: 'wake_up'
        })
    }

    async clearAll(
        targetType: 'group' | 'private',
        targetId: string
    ): Promise<void> {
        this.clearNextReplies(targetType, targetId)
        await this.clearWakeUps(targetType, targetId)
    }

    listWakeUps(
        targetType: 'group' | 'private',
        targetId: string
    ): PendingWakeUpReply[] {
        const key = `${targetType}:${targetId}`
        return this._activeStates.get(key)?.pendingWakeUpReplies ?? []
    }

    // ─── User message recording ──────────────────────────────────────

    recordUserMessage(
        targetType: 'group' | 'private',
        targetId: string,
        userId: string
    ): void {
        const state = this._getOrCreateActiveState(targetType, targetId)
        const now = Date.now()
        state.lastUserMessageTime = now
        state.messageTimestampsByUserId[userId] = now
        // Reset idle state on new user message
        state.idleRetryCount = 0
        state.currentIdleWaitSeconds = undefined
    }

    notifyResponseSent(
        targetType: 'group' | 'private',
        targetId: string
    ): void {
        const state = this._activeStates.get(`${targetType}:${targetId}`)
        if (state) {
            state.lastResponseTime = Date.now()
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Scheduler tick (active trigger evaluation)
    // ═══════════════════════════════════════════════════════════════════

    private async _schedulerTick(): Promise<void> {
        const loader = this.ctx.chatluna_character_config
        if (!loader?.globalConfig) return

        // Check config-based schedule tasks
        await this._checkScheduleTasks()

        // Evaluate all known targets + all enabled guilds
        const targetKeys = new Set<string>(this._activeStates.keys())
        for (const guildId of loader.globalConfig.applyGroup ?? []) {
            targetKeys.add(`group:${guildId}`)
        }

        for (const key of targetKeys) {
            try {
                await this._evaluateActiveTarget(key)
            } catch (e) {
                logger.error(
                    `[TriggerService._schedulerTick] failed for ${key}`,
                    e
                )
            }
        }
    }

    // ─── Config-based schedule tasks ─────────────────────────────────

    private readonly _scheduleTaskLastRun = new Map<string, number>()

    private async _checkScheduleTasks(): Promise<void> {
        const loader = this.ctx.chatluna_character_config
        if (!loader?.globalConfig?.triggers.schedule.enabled) return

        const chatService = this.ctx.chatluna_character_chat
        if (!chatService) return

        const tasks = loader.globalConfig.triggers.schedule.tasks ?? []
        for (const task of tasks) {
            if (!task.enabled) continue
            if (!this._shouldExecuteScheduleTask(task)) continue

            logger.info(
                `[TriggerService.schedule] task triggered id=${task.id} type=${task.type} target=${task.target.type}:${task.target.id}`
            )

            if (
                task.target.type === 'group' &&
                !this._isGuildEnabled(task.target.id)
            ) {
                continue
            }

            await chatService.triggerReply(
                task.target.type,
                task.target.id,
                `schedule_task:${task.action}`
            )
        }
    }

    private _shouldExecuteScheduleTask(task: ScheduleTask): boolean {
        const now = Date.now()
        const last = this._scheduleTaskLastRun.get(task.id)
        if (task.type === 'once') {
            const when = this._parseScheduleTime(task.schedule)
            if (!when) return false
            if (last && last >= when) return false
            if (now >= when) {
                this._scheduleTaskLastRun.set(task.id, now)
                return true
            }
            return false
        }
        if (task.type === 'interval') {
            const interval = Number(task.schedule)
            if (!Number.isFinite(interval) || interval <= 0) return false
            if (!last || now - last >= interval) {
                this._scheduleTaskLastRun.set(task.id, now)
                return true
            }
        }
        return false
    }

    private _parseScheduleTime(raw: string): number | null {
        const numeric = Number(raw)
        if (Number.isFinite(numeric) && numeric > 0) return numeric
        const parsed = Date.parse(raw)
        return Number.isFinite(parsed) ? parsed : null
    }

    // ─── Active target evaluation ────────────────────────────────────

    private async _evaluateActiveTarget(key: string): Promise<void> {
        const [targetType, targetId] = key.split(':') as [
            'group' | 'private',
            string
        ]
        if (!targetId) return

        const state = this._activeStates.get(key)
        if (!state) return

        const chatService = this.ctx.chatluna_character_chat
        if (!chatService) return

        const now = Date.now()

        // 1. Check wake_up triggers
        const wakeUp = this._findWakeUpTrigger(state, now)
        if (wakeUp) {
            const reason = `Triggered by wake_up_reply: ${wakeUp.naturalReason}`
            state.pendingWakeUpReplies = state.pendingWakeUpReplies.filter(
                (p) =>
                    !(
                        p.createdAt === wakeUp.createdAt &&
                        p.triggerAt === wakeUp.triggerAt
                    )
            )
            await this.ctx.database.remove(
                'chatluna_character_active_trigger',
                {
                    targetType,
                    targetId,
                    triggerType: 'wake_up',
                    triggerAt: wakeUp.triggerAt
                }
            )
            await chatService.triggerReply(targetType, targetId, reason)
            return
        }

        // 2. Check next_reply triggers
        this._clearStaleNextReplies(state)
        const nextReplyReason = this._findNextReplyTriggerReason(state)
        if (nextReplyReason) {
            state.pendingNextReplies = []
            state.lastActiveTriggerAt = now
            await chatService.triggerReply(
                targetType,
                targetId,
                nextReplyReason
            )
            return
        }

        // 3. Check idle trigger (group only)
        if (targetType === 'group') {
            const config = this._getCharacterConfig(targetId)
            if (!config) return
            const idleConfig = config.triggers.idle
            if (!idleConfig?.enabled) return

            const idleReason = this._findIdleTriggerReason(
                state,
                idleConfig,
                now
            )
            if (idleReason) {
                const previousLastUserMessage = state.lastUserMessageTime
                await chatService.triggerReply(targetType, targetId, idleReason)
                this._updateIdleRetryState(
                    state,
                    Date.now(),
                    previousLastUserMessage
                )
            }
        }
    }

    // ─── Wake-up evaluation ──────────────────────────────────────────

    private _findWakeUpTrigger(
        state: ActiveTargetState,
        now: number
    ): PendingWakeUpReply | undefined {
        for (const wakeUp of state.pendingWakeUpReplies) {
            if (now >= wakeUp.triggerAt) {
                return wakeUp
            }
        }
        return undefined
    }

    // ─── Next-reply evaluation (JS expression) ───────────────────────

    private _clearStaleNextReplies(state: ActiveTargetState): void {
        const pending = state.pendingNextReplies
        if (
            pending.length > 0 &&
            pending.some(
                (trigger) => state.lastResponseTime > trigger.createdAt
            )
        ) {
            state.pendingNextReplies = []
        }
    }

    private _findNextReplyTriggerReason(
        state: ActiveTargetState
    ): string | undefined {
        const now = Date.now()

        for (const trigger of state.pendingNextReplies) {
            const conditionCtx: ConditionContext = {
                silence: Math.max(
                    0,
                    Math.floor((now - state.lastUserMessageTime) / 1000)
                ),
                silenceOf: (userId: string) => {
                    const ts = state.messageTimestampsByUserId?.[userId] ?? 0
                    if (ts <= 0) return Infinity
                    return Math.max(0, Math.floor((now - ts) / 1000))
                },
                said: (userId: string) => {
                    const ts = state.messageTimestampsByUserId?.[userId] ?? 0
                    return ts >= trigger.createdAt
                },
                now,
                createdAt: trigger.createdAt
            }

            if (evaluateCondition(trigger.condition, conditionCtx)) {
                return trigger.reason
            }
        }
        return undefined
    }

    // ─── Idle trigger evaluation ─────────────────────────────────────

    private _findIdleTriggerReason(
        state: ActiveTargetState,
        idleConfig: IdleTriggerConfig,
        now: number
    ): string | undefined {
        if (state.lastUserMessageTime <= 0) return undefined

        const hasTriggeredSinceLastMessage =
            state.lastActiveTriggerAt != null &&
            state.lastActiveTriggerAt >= state.lastUserMessageTime

        if (state.currentIdleWaitSeconds == null) {
            const baseWaitSeconds = hasTriggeredSinceLastMessage
                ? this._getIdleRetryIntervalSeconds(state, idleConfig)
                : Math.max(idleConfig.intervalMinutes, 1) * 60
            state.currentIdleWaitSeconds = idleConfig.enableJitter
                ? this._applyJitter(baseWaitSeconds)
                : baseWaitSeconds
        }

        const waitSeconds = state.currentIdleWaitSeconds
        const triggerAnchorTime = hasTriggeredSinceLastMessage
            ? (state.lastActiveTriggerAt ?? state.lastUserMessageTime)
            : state.lastUserMessageTime
        const passiveReady = now - triggerAnchorTime >= waitSeconds * 1000

        if (!passiveReady) return undefined

        const elapsedSeconds = Math.max(
            1,
            Math.floor((now - state.lastUserMessageTime) / 1000)
        )
        return `No new messages for ${elapsedSeconds}s`
    }

    private _getIdleRetryIntervalSeconds(
        state: ActiveTargetState,
        config: IdleTriggerConfig
    ): number {
        const baseMinutes = Math.max(config.intervalMinutes, 1)
        const baseSeconds = baseMinutes * 60

        if (config.retryStyle === 'fixed') {
            return baseSeconds
        }

        const retried = Math.max(state.idleRetryCount, 0)
        const backoffSeconds = baseSeconds * Math.pow(2, retried)
        const maxMinutes = Math.max(config.maxIntervalMinutes ?? 1440, 1)
        const maxSeconds = maxMinutes * 60
        return Math.min(backoffSeconds, maxSeconds)
    }

    private _applyJitter(waitSeconds: number): number {
        const ratio = 0.05 + Math.random() * 0.05
        const direction = Math.random() < 0.5 ? -1 : 1
        const multiplier = 1 + direction * ratio
        return Math.max(1, Math.round(waitSeconds * multiplier))
    }

    private _updateIdleRetryState(
        state: ActiveTargetState,
        completedAt: number,
        previousLastUserMessageTime: number
    ): void {
        const userMessageArrivedDuringTrigger =
            state.lastUserMessageTime !== previousLastUserMessageTime
        if (userMessageArrivedDuringTrigger) return

        const hasTriggeredSinceLastMessage =
            state.lastActiveTriggerAt != null &&
            state.lastActiveTriggerAt >= state.lastUserMessageTime
        if (hasTriggeredSinceLastMessage) {
            state.idleRetryCount = (state.idleRetryCount ?? 0) + 1
        } else {
            state.idleRetryCount = 1
        }
        state.lastActiveTriggerAt = completedAt
        state.currentIdleWaitSeconds = undefined
    }

    // ─── DB persistence for wake-ups ─────────────────────────────────

    private async _loadPersistedWakeUps(): Promise<void> {
        const now = Date.now()

        const rows = await this.ctx.database.get(
            'chatluna_character_active_trigger',
            { triggerType: 'wake_up' }
        )

        const expiredIds: string[] = []

        for (const row of rows) {
            if (row.triggerAt <= now) {
                expiredIds.push(row.id)
                logger.info(
                    `[TriggerService] discarding expired wake-up: ${row.targetType}:${row.targetId} triggerAt=${new Date(row.triggerAt).toISOString()}`
                )
                continue
            }

            const state = this._getOrCreateActiveState(
                row.targetType as 'group' | 'private',
                row.targetId
            )

            const createdAt =
                row.createdAt instanceof Date
                    ? row.createdAt.getTime()
                    : Number(row.createdAt)

            const configuredAtText = this._formatTimestamp(createdAt)

            state.pendingWakeUpReplies.push({
                rawTime: row.payload,
                reason: row.reason,
                naturalReason: row.reason
                    ? `You configured this wake-up at ${configuredAtText} to trigger at ${row.payload}, note: "${row.reason}"`
                    : `You configured this wake-up at ${configuredAtText} to trigger at ${row.payload}`,
                triggerAt: row.triggerAt,
                createdAt
            })

            logger.info(
                `[TriggerService] loaded persisted wake-up: ${row.targetType}:${row.targetId} triggerAt=${new Date(row.triggerAt).toISOString()}`
            )
        }

        if (expiredIds.length > 0) {
            await this.ctx.database.remove(
                'chatluna_character_active_trigger',
                { id: { $in: expiredIds } }
            )
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Private helpers
    // ═══════════════════════════════════════════════════════════════════

    private _formatTimestamp(epochMs: number): string {
        const d = new Date(epochMs)
        const pad = (n: number) => String(n).padStart(2, '0')
        return (
            `${d.getFullYear()}/${pad(d.getMonth() + 1)}` +
            `/${pad(d.getDate())}-${pad(d.getHours())}` +
            `:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
        )
    }

    private _isGuildEnabled(guildId: string): boolean {
        const applyGroup =
            this.ctx.chatluna_character_config?.globalConfig?.applyGroup ?? []
        return applyGroup.includes(guildId)
    }

    private _getCharacterConfig(guildId: string): CharacterConfig | undefined {
        const loader = this.ctx.chatluna_character_config
        if (!loader?.globalConfig) return undefined
        return loader.getGuildConfig(guildId)
    }

    // ─── Passive state helpers ───────────────────────────────────────

    private _getPassiveStateKey(context: TriggerContext): string {
        if (context.isPrivate) {
            return `private:${context.userId}`
        }
        return `group:${context.guildId ?? 'unknown'}`
    }

    private _getOrCreatePassiveStates(
        stateKey: string,
        config?: CharacterConfig
    ): TriggerStateMap {
        const existing = this._passiveStates.get(stateKey)
        if (existing) {
            return existing
        }

        const states: TriggerStateMap = {}
        for (const trigger of this._engine.listTriggers()) {
            const enabled = config
                ? this._isConfigEnabled(config, trigger.name)
                : true
            states[trigger.name] = this._createDefaultState(enabled)
        }
        this._passiveStates.set(stateKey, states)
        return states
    }

    private _createDefaultState(enabled: boolean): TriggerState {
        return {
            enabled,
            updatedAt: Date.now(),
            watchedUsers: [],
            watchedKeywords: [],
            watchedTopics: []
        }
    }

    private _isConfigEnabled(
        config: CharacterConfig,
        triggerName: string
    ): boolean {
        const triggers = config.triggers
        const lookup: Record<string, { enabled: boolean }> = {
            private: triggers.private,
            activity: triggers.activity,
            keyword: triggers.keyword,
            mention: triggers.mention,
            topic: triggers.topic,
            model: triggers.model,
            schedule: triggers.schedule,
            idle: triggers.idle
        }
        return lookup[triggerName]?.enabled ?? true
    }

    // ─── Active state helpers ────────────────────────────────────────

    private _getOrCreateActiveState(
        targetType: 'group' | 'private',
        targetId: string
    ): ActiveTargetState {
        const key = `${targetType}:${targetId}`
        const existing = this._activeStates.get(key)
        if (existing) return existing

        const state: ActiveTargetState = {
            messageTimestampsByUserId: {},
            lastUserMessageTime: 0,
            pendingNextReplies: [],
            pendingWakeUpReplies: [],
            idleRetryCount: 0,
            lastResponseTime: 0
        }
        this._activeStates.set(key, state)
        return state
    }
}
