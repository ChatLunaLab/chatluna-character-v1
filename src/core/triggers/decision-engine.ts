import type { TriggerConfig } from '../../types'
import type {
    BaseTrigger,
    TriggerContext,
    TriggerResult,
    TriggerType
} from './base'

export interface DecisionTriggerResult extends TriggerResult {
    trigger: BaseTrigger
    name: string
    type: TriggerType
}

export interface DecisionResult {
    shouldRespond: boolean
    trigger?: DecisionTriggerResult
    allTriggers?: DecisionTriggerResult[]
}

export class DecisionEngine {
    private readonly _triggers: BaseTrigger[] = []

    registerTrigger(trigger: BaseTrigger): void {
        this._triggers.push(trigger)
    }

    listTriggers(): BaseTrigger[] {
        return [...this._triggers]
    }

    async decide(context: TriggerContext): Promise<DecisionResult> {
        const results: DecisionTriggerResult[] = []

        await Promise.all(
            this._triggers.map(async (trigger) => {
                if (!this._isApplicable(trigger, context)) {
                    return
                }
                if (!this._isEnabled(trigger, context)) {
                    return
                }
                const result = await trigger.shouldTrigger(context)
                results.push({
                    ...result,
                    trigger,
                    name: trigger.name,
                    type: trigger.type
                })
            })
        )

        const triggered = results
            .filter((result) => result.shouldTrigger)
            .sort((a, b) => b.priority - a.priority)

        if (triggered.length === 0) {
            return { shouldRespond: false }
        }

        return {
            shouldRespond: true,
            trigger: triggered[0],
            allTriggers: triggered
        }
    }

    private _isApplicable(
        trigger: BaseTrigger,
        context: TriggerContext
    ): boolean {
        if (trigger.type === 'both') {
            return true
        }
        if (context.isPrivate) {
            return trigger.type === 'private'
        }
        return trigger.type === 'group'
    }

    private _isEnabled(trigger: BaseTrigger, context: TriggerContext): boolean {
        const config = this._getTriggerConfig(context.config.triggers)
        const configEnabled = config[trigger.name]?.enabled ?? true
        if (!configEnabled) {
            return false
        }

        const state = context.triggerStates?.[trigger.name]
        return state?.enabled ?? true
    }

    private _getTriggerConfig(
        config: TriggerConfig
    ): Record<string, { enabled: boolean }> {
        return {
            private: config.private,
            activity: config.activity,
            keyword: config.keyword,
            topic: config.topic,
            model: config.model,
            schedule: config.schedule
        }
    }
}
