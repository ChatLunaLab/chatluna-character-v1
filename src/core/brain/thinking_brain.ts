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
import { Logger } from 'koishi'

const logger = new Logger('chatluna-character-v1')

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
        logger.info(
            `[ThinkingBrain.think] start guild=${context.session.guildId} user=${context.session.userId} model=${model.modelName} messages=${context.messages.length}`
        )
        const contextCallbacks = this.statsService?.createInvokeCallbacks({
            session: context.session,
            modelName: model.modelName,
            invokeType: 'thinking_context',
            conversationId: context.session.guildId ?? context.session.userId
        })
        logger.info(`[ThinkingBrain.think] running ContextAnalyzer...`)
        const contextAnalysis = await this._analyzer.analyze(
            model,
            context,
            contextCallbacks
        )
        logger.info(
            `[ThinkingBrain.think] ContextAnalysis: topic=${contextAnalysis.topic} atmosphere=${contextAnalysis.atmosphere} interestLevel=${contextAnalysis.interestLevel} groupActivity=${contextAnalysis.groupActivity}`
        )
        logger.info(`[ThinkingBrain.think] running DecisionMaker...`)
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
        logger.info(
            `[ThinkingBrain.think] BehaviorDecision: shouldRespond=${behaviorDecision.shouldRespond} responseTone=${behaviorDecision.responseTone} warmGroup=${behaviorDecision.warmGroup} observations=${behaviorDecision.observations?.length ?? 0}`
        )

        for (const hook of this._decisionHooks) {
            behaviorDecision = await hook(
                context,
                contextAnalysis,
                behaviorDecision
            )
        }

        logger.info(`[ThinkingBrain.think] running PreferenceAdjuster...`)
        const preferenceAdjustment = await this._preferenceAdjuster.adjust(
            context,
            behaviorDecision
        )

        const warmGroupTrigger = this.shouldWarmGroup(context, behaviorDecision)
        logger.info(
            `[ThinkingBrain.think] done shouldRespond=${behaviorDecision.shouldRespond} warmGroupTrigger=${warmGroupTrigger}`
        )

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
