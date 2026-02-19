import type {
    BehaviorDecision,
    CharacterModelSchedulerService,
    CharacterStatsService,
    ContextAnalysis,
    ThinkingBrainConfig,
    ThinkingContext,
    ThinkingResult
} from '../../types'
import { ContextAnalyzer } from './context_analyzer'
import { DecisionMaker } from './decision_maker'
import { PreferenceAdjuster } from './preference_adjuster'

export type DecisionHook = (
    context: ThinkingContext,
    analysis: ContextAnalysis,
    decision: BehaviorDecision
) => BehaviorDecision | Promise<BehaviorDecision>

export class ThinkingBrain {
    private readonly _analyzer = new ContextAnalyzer()
    private readonly _decisionMaker = new DecisionMaker()
    private readonly _preferenceAdjuster = new PreferenceAdjuster()
    private readonly _decisionHooks: DecisionHook[] = []

    constructor(
        private readonly modelScheduler: CharacterModelSchedulerService,
        private readonly config: ThinkingBrainConfig,
        private readonly statsService?: CharacterStatsService
    ) {}

    addDecisionHook(hook: DecisionHook): void {
        this._decisionHooks.push(hook)
    }

    async think(context: ThinkingContext): Promise<ThinkingResult> {
        const model = await this.modelScheduler.getThinkingModel()
        const contextCallbacks = this.statsService?.createInvokeCallbacks({
            session: context.session,
            modelName: model.modelName,
            invokeType: 'thinking_context',
            conversationId: context.session.guildId ?? context.session.userId
        })
        const contextAnalysis = await this._analyzer.analyze(
            model,
            context,
            contextCallbacks
        )
        let behaviorDecision = await this._decisionMaker.decide(
            model,
            context,
            contextAnalysis,
            this.statsService?.createInvokeCallbacks({
                session: context.session,
                modelName: model.modelName,
                invokeType: 'thinking_decision',
                conversationId:
                    context.session.guildId ?? context.session.userId
            })
        )

        for (const hook of this._decisionHooks) {
            behaviorDecision = await hook(
                context,
                contextAnalysis,
                behaviorDecision
            )
        }

        const preferenceAdjustment = await this._preferenceAdjuster.adjust(
            context,
            behaviorDecision
        )

        const warmGroupTrigger = this.shouldWarmGroup(context, behaviorDecision)

        return {
            contextAnalysis,
            behaviorDecision,
            preferenceAdjustment,
            shouldRespond: behaviorDecision.shouldRespond,
            warmGroupTrigger
        }
    }

    private shouldWarmGroup(
        context: ThinkingContext,
        decision: BehaviorDecision
    ): boolean {
        if (!this.config.warmGroup.enabled) {
            return false
        }
        if (!decision.warmGroup) {
            return false
        }

        const lastMessageTime =
            context.groupInfo?.lastMessageTime ??
            context.messages.at(-1)?.timestamp ??
            context.currentTime.getTime()
        const gap = context.currentTime.getTime() - lastMessageTime
        return gap >= this.config.warmGroup.threshold
    }
}
