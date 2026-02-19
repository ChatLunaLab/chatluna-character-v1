import { type Context, Service } from 'koishi'
import type {
    CharacterConfig,
    TriggerService as TriggerServiceType,
    TriggerState
} from '../../types'
import type { BaseTrigger, TriggerContext } from './base'
import { DecisionEngine, type DecisionResult } from './decision-engine'

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

export class TriggerService extends Service implements TriggerServiceType {
    private readonly _engine = new DecisionEngine()
    private readonly _states = new Map<string, TriggerStateMap>()

    constructor(ctx: Context) {
        super(ctx, 'chatluna_character_triggers')
    }

    registerTrigger(trigger: BaseTrigger): void {
        this._engine.registerTrigger(trigger)
    }

    listTriggers(): BaseTrigger[] {
        return this._engine.listTriggers()
    }

    async decide(context: TriggerContext): Promise<DecisionResult> {
        const stateKey = this._getStateKey(context)
        const states = this._getOrCreateStates(stateKey, context.config)
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
        return this._getOrCreateStates(stateKey)
    }

    updateState(
        stateKey: string,
        triggerName: string,
        patch: Partial<TriggerState>
    ): TriggerState {
        const states = this._getOrCreateStates(stateKey)
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
            this._states.delete(stateKey)
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

    private _getStateKey(context: TriggerContext): string {
        if (context.isPrivate) {
            return `private:${context.userId}`
        }
        return `group:${context.guildId ?? 'unknown'}`
    }

    private _getOrCreateStates(
        stateKey: string,
        config?: CharacterConfig
    ): TriggerStateMap {
        const existing = this._states.get(stateKey)
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
        this._states.set(stateKey, states)
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
            topic: triggers.topic,
            model: triggers.model,
            schedule: triggers.schedule
        }
        return lookup[triggerName]?.enabled ?? true
    }
}
