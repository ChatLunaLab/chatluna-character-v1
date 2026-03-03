import type { TriggerConfig } from '../../types'
import type {
    BaseTrigger,
    TriggerContext,
    TriggerResult,
    TriggerType
} from './base'
import { Logger } from 'koishi'

const logger = new Logger('chatluna-character-v1')

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
        logger.info(
            `[DecisionEngine] registered trigger: ${trigger.name} type=${trigger.type}`
        )
    }

    listTriggers(): BaseTrigger[] {
        return [...this._triggers]
    }

    async decide(context: TriggerContext): Promise<DecisionResult> {
        const results: DecisionTriggerResult[] = []
        const guildOrUser = context.isPrivate
            ? `private:${context.userId}`
            : `group:${context.guildId ?? 'unknown'}`
        logger.info(
            `[DecisionEngine.decide] evaluating ${this._triggers.length} trigger(s) for ${guildOrUser}`
        )

        await Promise.all(
            this._triggers.map(async (trigger) => {
                if (!this._isApplicable(trigger, context)) {
                    logger.info(
                        `[DecisionEngine.decide] trigger=${trigger.name} not applicable (type=${trigger.type} isPrivate=${context.isPrivate})`
                    )
                    return
                }
                if (!this._isEnabled(trigger, context)) {
                    logger.info(
                        `[DecisionEngine.decide] trigger=${trigger.name} disabled by config or state`
                    )
                    return
                }
                const result = await trigger.shouldTrigger(context)
                logger.info(
                    `[DecisionEngine.decide] trigger=${trigger.name} shouldTrigger=${result.shouldTrigger} priority=${result.priority} reason=${result.reason ?? ''}`
                )
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
            logger.info(
                `[DecisionEngine.decide] no trigger fired for ${guildOrUser}`
            )
            return { shouldRespond: false }
        }

        logger.info(
            `[DecisionEngine.decide] ${triggered.length} trigger(s) fired, winner=${triggered[0].name} priority=${triggered[0].priority} reason=${triggered[0].reason ?? ''}`
        )
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
            mention: config.mention,
            topic: config.topic,
            model: config.model,
            schedule: config.schedule,
            idle: config.idle
        }
    }
}
