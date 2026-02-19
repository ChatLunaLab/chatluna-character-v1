import type {
    BehaviorDecision,
    PreferenceAdjustment,
    ThinkingContext
} from '../../types'

export class PreferenceAdjuster {
    async adjust(
        _context: ThinkingContext,
        _decision: BehaviorDecision
    ): Promise<PreferenceAdjustment> {
        return {}
    }
}
