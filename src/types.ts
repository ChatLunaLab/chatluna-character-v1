import type { Element, Session } from 'koishi'
import type { Callbacks } from '@langchain/core/callbacks/manager'
import type { ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model'
import type { ChatLunaService } from 'koishi-plugin-chatluna/services/chat'
import type { ResponseQueueTicket } from './core/base/response_queue'
import { DecisionResult, TriggerResult } from './core/triggers'
import type { BaseTrigger } from './core/triggers/base'
import type { PlatformModelInfo } from 'koishi-plugin-chatluna/llm-core/platform/types'

export interface GlobalConfig {
    maxMessages: number
    messageExpireTime: number
    disableChatLuna: boolean
}

export interface ModelConfig {
    main: string
    analysis: string
    thinking?: string
}

export interface TriggerSwitchConfig {
    enabled: boolean
}

export interface ActivityTriggerConfig extends TriggerSwitchConfig {
    lowerLimit: number
    upperLimit: number
    cooldownTime: number
}

export interface KeywordTriggerConfig extends TriggerSwitchConfig {
    keywords: string[]
}

export interface TopicTriggerConfig extends TriggerSwitchConfig {
    bufferSize: number
}

export type ScheduleTaskType = 'cron' | 'interval' | 'once'
export type ScheduleTaskAction =
    | 'warm_group'
    | 'greeting'
    | 'reminder'
    | 'custom'

export interface ScheduleTaskTarget {
    type: 'group' | 'private'
    id: string
}

export interface ScheduleTask {
    id: string
    type: ScheduleTaskType
    target: ScheduleTaskTarget
    schedule: string
    action: ScheduleTaskAction
    enabled: boolean
}

export interface Holiday {
    name: string
    date: string
    description?: string
}

export interface TimeRange {
    start: string
    end: string
}

export interface Activity {
    time: string
    duration: number
    description: string
    affectsMood?: boolean
    moodChange?: number
}

export interface MoodPoint {
    time: string
    value: number
    description?: string
}

export interface SpecialEvent {
    time: string
    title: string
    description?: string
}

export interface DailyPlan {
    date: string
    activities: Activity[]
    moodCurve: MoodPoint[]
    availableForChat: TimeRange[]
    specialEvents: SpecialEvent[]
}

export interface BehaviorState {
    activity?: Activity
    mood?: MoodPoint
    isAvailable: boolean
    suggestedTone?: string
}

export interface ScheduleContext {
    tasks: ScheduleTask[]
    location?: string
    timezone?: string
    dailyPlan?: DailyPlan
    behaviorState?: BehaviorState
    holidays?: Holiday[]
}

export type MemoryLayer = 'short-term' | 'long-term'

export interface MemoryTimeRange {
    start?: number
    end?: number
}

export interface EventRecord {
    id: string
    guildId?: string
    type: string
    description: string
    participants: string[]
    timestamp: number
    metadata?: Record<string, unknown>
}

export interface EventInput {
    guildId?: string
    type: string
    description: string
    participants: string[]
    timestamp?: number
    metadata?: Record<string, unknown>
}

export interface MemoryRecord {
    id: string
    guildId?: string
    userId?: string
    content: string
    summary?: string
    type?: 'event' | 'fact' | 'opinion' | 'impression' | string
    importance?: number
    tags?: string[]
    relatedUsers?: string[]
    relatedGroups?: string[]
    createdAt?: number
    expireAt?: number | null
    accessCount?: number
    lastAccessAt?: number
    layer?: MemoryLayer
}

export interface CharacterMemoryRow {
    id: string
    guildId?: string
    userId?: string
    content: string
    summary?: string
    type?: string
    importance: number
    tags: string[]
    relatedUsers: string[]
    relatedGroups: string[]
    createdAt: Date
    expireAt: Date | null
    accessCount: number
    lastAccessAt: Date | null
    layer: MemoryLayer
}

export interface CharacterEventRow {
    id: string
    guildId?: string
    type: string
    description: string
    participants: string[]
    timestamp: Date
    metadata: Record<string, unknown>
}

export interface MemoryInput {
    guildId?: string
    userId?: string
    content: string
    summary?: string
    type?: 'event' | 'fact' | 'opinion' | 'impression' | string
    importance?: number
    expireAt?: number | string | null
    tags?: string[]
    relatedUsers?: string[]
    relatedGroups?: string[]
}

export interface MemoryQuery {
    guildId?: string
    userId?: string
    query: string
    tags?: string[]
    users?: string[]
    groups?: string[]
    timeRange?: MemoryTimeRange
    types?: string[]
    layers?: MemoryLayer[]
    limit?: number
    includeEvents?: boolean
}

export interface ShortTermMemory {
    id: string
    guildId?: string
    content: string
    timestamp: number
    type: 'observation' | 'analysis' | 'decision'
}

export interface MemoryContext {
    relevantMemories: MemoryRecord[]
    shortTerm?: MemoryRecord[]
    longTerm?: MemoryRecord[]
}

export type StatsPeriod = 'day' | 'week' | 'month'

export interface StatsInvokeMeta {
    session?: Session
    guildId?: string
    userId?: string
    conversationId?: string
    modelName?: string
    invokeType?: string
}

export interface TokenUsageInput extends StatsInvokeMeta {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
}

export interface CharacterTokenUsageRow {
    id: string
    guildId?: string
    userId?: string
    conversationId?: string
    modelName: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    invokeType?: string
    timestamp: Date
}

export interface CharacterDailyStatsRow {
    id: string
    guildId: string
    date: string
    receivedMessages: number
    sentResponses: number
    totalTokens: number
    totalInvocations: number
}

export interface CharacterStatsOverview {
    totalTokens: number
    totalMessages: number
    totalResponses: number
    activeGroups: number
    tokenTrend: number
    messageTrend: number
}

export interface CharacterGroupRanking {
    guildId: string
    preset?: string
    tokens: number
    messages: number
    responses: number
}

export interface StatsActivityItem {
    id: string
    guildId: string
    type: string
    description: string
    modelName?: string
    tokens?: number
    timestamp: number
}

export interface MentionTriggerConfig extends TriggerSwitchConfig {
    respondToAt: boolean
    respondToQuote: boolean
}

export interface ScheduleTriggerConfig extends TriggerSwitchConfig {
    tasks: ScheduleTask[]
}

export interface TriggerConfig {
    private: TriggerSwitchConfig
    activity: ActivityTriggerConfig
    keyword: KeywordTriggerConfig
    mention: MentionTriggerConfig
    topic: TopicTriggerConfig
    model: TriggerSwitchConfig
    schedule: ScheduleTriggerConfig
    idle: IdleTriggerConfig
}

export interface HeartbeatConfig {
    enabled: boolean
    useAgent: boolean
    defaultDelayMinutes: number
    minDelayMinutes: number
    maxDelayMinutes: number
    maxObservations: number
}

export interface ThinkingBrainConfig {
    enabled: boolean
    warmGroup: {
        enabled: boolean
        threshold: number
    }
    heartbeat: HeartbeatConfig
}

export interface GroupInfo {
    lastMessageTime: number
    activeUsers?: number
    memberCount?: number
}

export interface ContextAnalysis {
    topic: string
    atmosphere: string
    interestLevel: number
    groupActivity: string
    lastParticipation: string
}

export type ObservationType = 'user' | 'topic' | 'keyword'

export interface ObservationTarget {
    type: ObservationType
    target: string
}

export interface BehaviorDecision {
    shouldRespond: boolean
    responseTone: string
    warmGroup: boolean
    observations: ObservationTarget[]
}

export type PreferenceAdjustment = Record<string, unknown>

export interface ThinkingContext {
    session: Session
    messages: Message[]
    memory: MemoryContext
    characterState: string
    currentTime: Date
    groupInfo?: GroupInfo
}

export interface ThinkingResult {
    contextAnalysis: ContextAnalysis
    behaviorDecision: BehaviorDecision
    preferenceAdjustment: PreferenceAdjustment
    shouldRespond: boolean
    warmGroupTrigger: boolean
}

export interface ScheduleConfig {
    enabled: boolean
    location: string
    timezone: string
}

export interface MemoryConfig {
    enabled: boolean
    maxShortTermMemories: number
    maxLongTermMemories: number
    autoCleanup: boolean
}

export interface ReplyConfig {
    typingTime: number
    largeTextSize: number
    largeTextTypingTime: number
    splitSentence: boolean
    splitVoice: boolean
    markdownRender: boolean
    isAt: boolean
    modelCompletionCount: number
    maxTokens: number
}

export interface ImageConfig {
    enabled: boolean
    maxCount: number
    maxSize: number
}

export interface MuteConfig {
    time: number
    forceEnabled: boolean
}

export interface CharacterConfig {
    applyGroup: string[]
    reverseApplyGroup?: boolean
    preset?: string
    global: GlobalConfig
    models: ModelConfig
    triggers: TriggerConfig
    thinkingBrain?: ThinkingBrainConfig
    schedule?: ScheduleConfig
    memory: MemoryConfig
    reply: ReplyConfig
    image: ImageConfig
    mute: MuteConfig
}

export interface GuildConfig extends Partial<CharacterConfig> {
    preset: string
}

export interface PromptTemplate {
    rawString: string
    format(
        variables: Record<string, unknown>,
        variableService: ChatLunaService['promptRenderer'],
        configurable: Parameters<
            ChatLunaService['promptRenderer']['renderTemplate']
        >[2]['configurable']
    ): Promise<string>
}

export interface PresetTemplate {
    name: string
    status?: string
    nick_name: string[]
    input: PromptTemplate
    system: PromptTemplate
    mute_keyword?: string[]
    path?: string
}

export interface WebPresetPayload {
    name: string
    status?: string
    nick_name?: string[]
    input: string
    system: string
    mute_keyword?: string[]
}

export interface MentionInfo {
    id: string
    name?: string
}

export interface QuoteInfo {
    id: string
    content?: string
}

export interface ImageInfo {
    src: string
    hash?: string
}

export interface FaceInfo {
    id: string
    name?: string
}

export interface ParsedMessage {
    elements: Element[]
    plainText: string
    mentions: MentionInfo[]
    quote?: QuoteInfo
    images: ImageInfo[]
    faces: FaceInfo[]
}

export interface Message {
    id: string
    name: string
    content: string
    messageId?: string
    timestamp?: number
    elements?: Element[]
    parsed?: ParsedMessage
}

export interface MessageCollectorConfig {
    mode: 'group' | 'private' | 'both'
    maxMessages: number
    messageExpireTime: number
}

export type MessageCollectorFilter = (
    session: Session,
    message: Message,
    context: MessageContext
) => boolean | Promise<boolean>

export type MessageCollectHandler = (
    session: Session,
    context: MessageContext,
    ticket: ResponseQueueTicket<MessageContext>
) => void | Promise<void>

export interface MessageContext {
    type: 'group' | 'private'
    guildId?: string
    userId: string
    messages: Message[]
    metadata: {
        lastActivity: number
        triggerState: TriggerState
    }
}

export interface AgentContext {
    session: Session
    config: CharacterConfig
    preset: PresetTemplate
    messages: Message[]
    memory: MemoryContext
    schedule?: ScheduleContext
    thinkingResult?: ThinkingResult
    triggerInfo?: TriggerResult
}

export interface AgentResult {
    output: string
    raw: string
}

export interface TriggerState {
    enabled: boolean
    updatedAt: number
    watchedUsers: string[]
    watchedKeywords: string[]
    watchedTopics: string[]
    afterMessageId?: string
}

// ─── Active trigger types ────────────────────────────────────────────

/**
 * A pending next_reply trigger.
 *
 * `condition` is a JavaScript expression string evaluated in a sandbox with:
 *   - `silence` — seconds since last user message in this target
 *   - `silenceOf(userId)` — seconds since last message from a specific user
 *   - `said(userId)` — whether the user has spoken since this trigger was created
 *   - `now` — current epoch-ms
 *   - `createdAt` — epoch-ms when this trigger was registered
 *
 * Examples:
 *   "silence > 30"
 *   "said('12345')"
 *   "silence > 30 && said('12345')"
 *   "silence > 30 || said('12345')"
 *   "silenceOf('12345') > 60"
 */
export interface PendingNextReply {
    /** JS expression condition string. */
    condition: string
    /** Human-readable description of why this was registered. */
    reason: string
    createdAt: number
}

export interface PendingWakeUpReply {
    /** Target time in "YYYY/MM/DD-HH:mm:ss" format. */
    rawTime: string
    reason: string
    naturalReason: string
    /** Epoch-ms timestamp when the wake-up should fire. */
    triggerAt: number
    createdAt: number
}

/** Database row for persisted wake-up triggers (survives restart). */
export interface CharacterActiveTriggerRow {
    id: string
    /** "group" | "private" */
    targetType: string
    /** guildId or userId */
    targetId: string
    /** "wake_up" | "next_reply" */
    triggerType: string
    /** Raw time string for wake_up, raw reason for next_reply */
    payload: string
    /** Human-readable reason */
    reason: string
    /** Epoch-ms when the trigger should fire */
    triggerAt: number
    /** Epoch-ms when the trigger was created */
    createdAt: Date
}

/** Configuration for idle (long-silence) active trigger. */
export interface IdleTriggerConfig extends TriggerSwitchConfig {
    /** Minutes of silence before first idle trigger. */
    intervalMinutes: number
    /** Retry strategy: 'fixed' or 'exponential'. */
    retryStyle: 'fixed' | 'exponential'
    /** Max interval minutes (for exponential). */
    maxIntervalMinutes: number
    /** Whether to add jitter to the wait time. */
    enableJitter: boolean
}

// ─── Chat service interface (reply pipeline only) ───────────────────

export interface CharacterChatService {
    /**
     * Trigger a reply in the given target (group or private).
     * This drives the full pipeline: build context → trigger decide →
     * thinking brain → agent execute → send response.
     *
     * @returns `true` if a reply was actually sent.
     */
    triggerReply(
        targetType: 'group' | 'private',
        targetId: string,
        reason: string
    ): Promise<boolean>

    /**
     * Handle a passively-collected message (called by MessageCollector).
     * This is the entry point for the normal message → trigger → reply flow.
     */
    handlePassiveCollect(
        session: Session,
        context: MessageContext,
        ticket: ResponseQueueTicket<MessageContext>,
        scheduleTask?: ScheduleTask
    ): Promise<void>
}

export const CHARACTER_EVENTS = {
    configUpdated: 'chatluna_character/config_updated'
} as const

export const PRESET_EVENTS = {
    updated: 'chatluna_character/preset_updated'
} as const

export type CharacterEventName =
    (typeof CHARACTER_EVENTS)[keyof typeof CHARACTER_EVENTS]

export interface CharacterConfigLoaderService {
    globalConfig: CharacterConfig

    getGuildConfig(guildId: string): CharacterConfig & { preset?: string }
    saveConfig?(config: CharacterConfig): Promise<void>
    saveGuildConfig?(guildId: string, config: GuildConfig): Promise<void>
}

export interface CharacterPresetService {
    getPreset(name: string): Promise<PresetTemplate | null>
    getAllPreset(): Promise<PresetTemplate[]>
    savePreset(preset: PresetTemplate): Promise<void>
    deletePreset(name: string): Promise<void>
}

export interface CharacterModelSchedulerService {
    getMainModel(guildId?: string): Promise<ChatLunaChatModel>
    getAnalysisModel(guildId?: string): Promise<ChatLunaChatModel>
    getThinkingModel(guildId?: string): Promise<ChatLunaChatModel>
}

export interface CharacterMemoryService {
    save(input: MemoryInput): Promise<MemoryRecord>
    query(input: MemoryQuery): Promise<MemoryRecord[]>
    delete(id: string): Promise<boolean>
    update(
        id: string,
        patch: Partial<MemoryRecord>
    ): Promise<MemoryRecord | null>
    saveEvent?(event: EventInput): Promise<EventRecord>
    queryEvents?(input: MemoryQuery): Promise<EventRecord[]>
}

export interface CharacterScheduleService {
    addTask(task: ScheduleTask): Promise<ScheduleTask>
    listTasks(target?: ScheduleTaskTarget): Promise<ScheduleTask[]>
    removeTask(id: string): Promise<boolean>
    updateTask(
        id: string,
        patch: Partial<ScheduleTask>
    ): Promise<ScheduleTask | null>
}

export interface CharacterStatsService {
    createInvokeCallbacks(meta: StatsInvokeMeta): Callbacks
    recordTokenUsage(input: TokenUsageInput): Promise<void>
    recordMessageReceived(session: Session): Promise<void>
    recordResponseSent(session: Session, count?: number): Promise<void>
    getStatsOverview(): Promise<CharacterStatsOverview>
    getGroupRankings(
        type: 'tokens' | 'messages' | 'responses',
        limit?: number
    ): Promise<CharacterGroupRanking[]>
    getTokenUsageChart(
        period: StatsPeriod
    ): Promise<{ labels: string[]; values: number[] }>
    getMessageActivityChart(period: StatsPeriod): Promise<{
        labels: string[]
        received: number[]
        sent: number[]
    }>
    getRecentActivities(limit?: number): Promise<StatsActivityItem[]>
    getModelUsageDistribution(
        period: StatsPeriod
    ): Promise<{ model: string; value: number }[]>
    getModelUsageChart(period: StatsPeriod): Promise<{
        labels: string[]
        datasets: { model: string; data: number[] }[]
    }>
    getModelGroupRankings(
        limit?: number
    ): Promise<{ guildId: string; modelName: string; tokens: number }[]>
}

export interface ChatLunaCharacterService {
    configLoader: CharacterConfigLoaderService
    preset: CharacterPresetService
    modelScheduler: CharacterModelSchedulerService
}

export interface CharacterHeartbeatService {
    scheduleHeartbeat(guildId: string, delay: number): void
}

export interface MessageCollectorService {
    addFilter(filter: MessageCollectorFilter): void
    onCollect(handler: MessageCollectHandler): void
    handleSession(session: Session): Promise<boolean>
    getContext(session: Session): MessageContext | undefined
    getMessages(session: Session): Message[]
    clear(session?: Session): void
}

export interface TriggerContext {
    session: Session
    message: Message
    messages: Message[]
    isPrivate: boolean
    guildId?: string
    userId: string
    config: CharacterConfig
    triggerStates?: Record<string, TriggerState>
    scheduleTask?: ScheduleTask
}

export interface TriggerService {
    // ─── Passive trigger management (message-driven) ─────────────────
    registerTrigger(trigger: BaseTrigger): void
    listTriggers(): BaseTrigger[]
    decide(context: TriggerContext): Promise<DecisionResult>
    getStates(stateKey: string): Record<string, TriggerState>
    getState?(stateKey: string):
        | {
              activityScore?: number
              lastActivity?: number
              messageCount?: number
          }
        | undefined
    updateState(
        stateKey: string,
        triggerName: string,
        patch: Partial<TriggerState>
    ): TriggerState
    applyToolUpdate?(
        stateKey: string,
        action: string,
        payload: Record<string, unknown>
    ): Record<string, TriggerState>

    // ─── Active trigger management (timer-driven) ────────────────────

    /**
     * Register a delayed reply whose condition is a JS expression.
     *
     * The expression is evaluated in a sandbox with these variables:
     *   - `silence`  — seconds since last user message
     *   - `silenceOf(userId)` — seconds since last message from that user
     *   - `said(userId)` — true if user sent a message since trigger was created
     *   - `now` — current epoch-ms
     *   - `createdAt` — epoch-ms when trigger was registered
     */
    registerNextReply(
        targetType: 'group' | 'private',
        targetId: string,
        condition: string,
        reason?: string
    ): boolean

    /**
     * Register a wake-up trigger at a specific time.
     * Time format: "YYYY/MM/DD-HH:mm:ss".
     * Persisted to database; survives restart.
     */
    registerWakeUp(
        targetType: 'group' | 'private',
        targetId: string,
        rawTime: string,
        reason: string
    ): Promise<boolean>

    /** Record that a user just sent a message in a target. */
    recordUserMessage(
        targetType: 'group' | 'private',
        targetId: string,
        userId: string
    ): void

    /**
     * Notify the service that a response was sent for a target.
     * Used to clear stale next_reply triggers.
     */
    notifyResponseSent(targetType: 'group' | 'private', targetId: string): void

    /** Clear all pending next_reply triggers for a target. */
    clearNextReplies(targetType: 'group' | 'private', targetId: string): void

    /** Clear all pending wake_up triggers for a target. */
    clearWakeUps(
        targetType: 'group' | 'private',
        targetId: string
    ): Promise<void>

    /** Clear everything (next_reply + wake_up) for a target. */
    clearAll(targetType: 'group' | 'private', targetId: string): Promise<void>

    /** List pending next-reply triggers for a target. */
    listNextReplies(
        targetType: 'group' | 'private',
        targetId: string
    ): PendingNextReply[]

    /** List pending wake-up triggers for a target. */
    listWakeUps(
        targetType: 'group' | 'private',
        targetId: string
    ): PendingWakeUpReply[]
}

export function mergeGuildConfig(
    base: CharacterConfig,
    override: Partial<GuildConfig>
): CharacterConfig & { preset?: string } {
    return {
        ...base,
        ...override,
        global: { ...base.global, ...override.global },
        models: { ...base.models, ...override.models },
        triggers: {
            ...base.triggers,
            ...override.triggers,
            private: {
                ...base.triggers.private,
                ...override.triggers?.private
            },
            activity: {
                ...base.triggers.activity,
                ...override.triggers?.activity
            },
            keyword: {
                ...base.triggers.keyword,
                ...override.triggers?.keyword
            },
            mention: {
                ...base.triggers.mention,
                ...override.triggers?.mention
            },
            topic: {
                ...base.triggers.topic,
                ...override.triggers?.topic
            },
            model: { ...base.triggers.model, ...override.triggers?.model },
            schedule: {
                ...base.triggers.schedule,
                ...override.triggers?.schedule
            },
            idle: {
                ...base.triggers.idle,
                ...override.triggers?.idle
            }
        },
        thinkingBrain: mergeThinkingBrainConfig(
            base.thinkingBrain,
            override.thinkingBrain
        ),
        schedule: mergeOptional(base.schedule, override.schedule),
        memory: { ...base.memory, ...override.memory },
        reply: { ...base.reply, ...override.reply },
        image: { ...base.image, ...override.image },
        mute: { ...base.mute, ...override.mute }
    }
}

function mergeThinkingBrainConfig(
    base: ThinkingBrainConfig | undefined,
    override: Partial<ThinkingBrainConfig> | undefined
): ThinkingBrainConfig | undefined {
    if (!base && !override) {
        return undefined
    }

    const baseHeartbeat = {
        enabled: base?.heartbeat?.enabled ?? true,
        useAgent: base?.heartbeat?.useAgent ?? true,
        defaultDelayMinutes: base?.heartbeat?.defaultDelayMinutes ?? 5,
        minDelayMinutes: base?.heartbeat?.minDelayMinutes ?? 1,
        maxDelayMinutes: base?.heartbeat?.maxDelayMinutes ?? 30,
        maxObservations: base?.heartbeat?.maxObservations ?? 20
    }

    return {
        enabled: override?.enabled ?? base?.enabled ?? false,
        warmGroup: {
            enabled:
                override?.warmGroup?.enabled ??
                base?.warmGroup?.enabled ??
                true,
            threshold:
                override?.warmGroup?.threshold ??
                base?.warmGroup?.threshold ??
                1800000
        },
        heartbeat: {
            ...baseHeartbeat,
            ...override?.heartbeat
        }
    }
}

function mergeOptional<T>(
    base: T | undefined,
    override: Partial<T> | undefined
): T | undefined {
    if (!base && !override) {
        return undefined
    }
    if (!base) {
        return override as T
    }
    if (!override) {
        return base
    }
    return { ...base, ...override }
}

declare module 'koishi' {
    interface Events {
        'chatluna_character/config_updated': () => void
        'chatluna_character/preset_updated': () => void
        'chatluna_character/message_collect': MessageCollectHandler
    }

    interface Tables {
        chatluna_character_memory: CharacterMemoryRow
        chatluna_character_event: CharacterEventRow
        chatluna_character_token_usage: CharacterTokenUsageRow
        chatluna_character_daily_stats: CharacterDailyStatsRow
        chatluna_character_active_trigger: CharacterActiveTriggerRow
    }

    interface Context {
        chatluna_character_config: CharacterConfigLoaderService
        chatluna_character_preset: CharacterPresetService
        chatluna_character_model_scheduler: CharacterModelSchedulerService
        chatluna_character: ChatLunaCharacterService
        chatluna_character_message_collector: MessageCollectorService
        chatluna_character_triggers: TriggerService
        chatluna_character_chat: CharacterChatService
        chatluna_character_heartbeat?: CharacterHeartbeatService
        chatluna_character_memory?: CharacterMemoryService
        chatluna_character_schedule?: CharacterScheduleService
        chatluna_character_stats?: CharacterStatsService
    }
}

declare module '@koishijs/console' {
    interface Events {
        'character/getConfig': () => Promise<CharacterConfig>
        'character/saveConfig': (
            nextConfig: CharacterConfig
        ) => Promise<{ success: boolean }>
        'character/getGuildConfig': (
            guildId: string
        ) => Promise<CharacterConfig & { preset?: string }>
        'character/saveGuildConfig': (
            guildId: string,
            nextConfig: GuildConfig
        ) => Promise<{ success: boolean }>
        'character/getPresets': () => Promise<WebPresetPayload[]>
        'character/getPreset': (
            name: string
        ) => Promise<WebPresetPayload | null>
        'character/savePreset': (
            preset: WebPresetPayload
        ) => Promise<{ success: boolean }>
        'character/deletePreset': (
            name: string
        ) => Promise<{ success: boolean }>
        'character/getAvailableModels': () => Promise<string[]>
        'character/getAvailableModelInfos': () => Promise<PlatformModelInfo[]>
        'character/getMemories': (
            guildId?: string,
            options?: Omit<MemoryQuery, 'query' | 'guildId'>
        ) => Promise<MemoryRecord[]>
        'character/deleteMemory': (id: string) => Promise<boolean>
        'character/getTriggerStates': (
            guildId: string
        ) => Promise<Record<string, TriggerState>>
        'character/updateTriggerState': (
            guildId: string,
            type: string,
            state: Partial<TriggerState>
        ) => Promise<TriggerState>
        'character/getStats': () => Promise<CharacterStatsOverview>
        'character/getGroupRankings': (options: {
            type: 'tokens' | 'messages' | 'responses'
            limit?: number
        }) => Promise<CharacterGroupRanking[]>
        'character/getRecentActivities': (options?: {
            limit?: number
        }) => Promise<StatsActivityItem[]>
        'character/getTokenUsageChart': (options: {
            period: StatsPeriod
        }) => Promise<{ labels: string[]; values: number[] }>
        'character/getMessageActivityChart': (options: {
            period: StatsPeriod
        }) => Promise<{ labels: string[]; received: number[]; sent: number[] }>
        'character/getModelUsageDistribution': (options: {
            period: StatsPeriod
        }) => Promise<{ model: string; value: number }[]>
        'character/getModelUsageChart': (options: {
            period: StatsPeriod
        }) => Promise<{
            labels: string[]
            datasets: { model: string; data: number[] }[]
        }>
        'character/getModelGroupRankings': (options?: {
            limit?: number
        }) => Promise<{ guildId: string; modelName: string; tokens: number }[]>
        'character/getActiveTriggers': (guildId: string) => Promise<{
            nextReplies: PendingNextReply[]
            wakeUps: PendingWakeUpReply[]
        }>
        'character/cancelActiveTrigger': (
            guildId: string,
            kind: 'next_reply' | 'wake_up' | 'all'
        ) => Promise<{ success: boolean }>
        'character/getGroups': (keywords: string) => Promise<
            {
                id: string
                name: string
                platform: string
                botId: string
            }[]
        >
    }
}

export type DeepNonNullable<T> = T extends (infer U)[]
    ? DeepNonNullable<NonNullable<U>>[]
    : T extends object
      ? { [K in keyof T]-?: DeepNonNullable<NonNullable<T[K]>> }
      : NonNullable<T>
