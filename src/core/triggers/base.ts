import type { Session } from 'koishi'
import type {
    CharacterConfig,
    Message,
    ScheduleTask,
    TriggerState
} from '../../types'

export type TriggerType = 'private' | 'group' | 'both'

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

export interface TriggerResult {
    shouldTrigger: boolean
    priority: number
    reason?: string
    metadata?: Record<string, unknown>
}

export interface TriggerStateUpdate extends Partial<TriggerState> {}

export abstract class BaseTrigger {
    abstract readonly name: string
    abstract readonly type: TriggerType

    abstract shouldTrigger(context: TriggerContext): Promise<TriggerResult>

    protected getState(context: TriggerContext): TriggerState {
        const now = Date.now()
        const state = context.triggerStates?.[this.name]
        return (
            state ?? {
                enabled: true,
                updatedAt: now,
                watchedUsers: [],
                watchedKeywords: [],
                watchedTopics: []
            }
        )
    }
}
