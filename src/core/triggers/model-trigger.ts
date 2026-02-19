import { BaseTrigger, type TriggerContext, type TriggerResult } from './base'

export type ModelAnalysis = {
    shouldRespond: boolean
    priority: number
    reason?: string
    suggestedTone?: string
}

type ModelAnalyzer = (context: TriggerContext) => Promise<ModelAnalysis>

export class ModelTrigger extends BaseTrigger {
    readonly name = 'model'
    readonly type = 'group' as const
    private readonly _analyzer?: ModelAnalyzer

    constructor(analyzer?: ModelAnalyzer) {
        super()
        this._analyzer = analyzer
    }

    async shouldTrigger(context: TriggerContext): Promise<TriggerResult> {
        if (context.isPrivate) {
            return { shouldTrigger: false, priority: 0 }
        }
        if (!this._analyzer) {
            return { shouldTrigger: false, priority: 0 }
        }

        const analysis = await this._analyzer(context)
        return {
            shouldTrigger: analysis.shouldRespond,
            priority: analysis.priority,
            reason: analysis.reason ?? 'model_decision',
            metadata: {
                suggestedTone: analysis.suggestedTone
            }
        }
    }
}
