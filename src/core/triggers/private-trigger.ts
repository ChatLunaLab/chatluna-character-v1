import { BaseTrigger, type TriggerContext, type TriggerResult } from './base'

export class PrivateTrigger extends BaseTrigger {
    readonly name = 'private'
    readonly type = 'private' as const

    async shouldTrigger(context: TriggerContext): Promise<TriggerResult> {
        if (!context.isPrivate) {
            return { shouldTrigger: false, priority: 0 }
        }

        const state = this.getState(context)
        if (!state.enabled) {
            return { shouldTrigger: false, priority: 0 }
        }

        const messageId = context.message.messageId
        if (state.afterMessageId && messageId !== state.afterMessageId) {
            return {
                shouldTrigger: true,
                priority: 120,
                reason: 'after_message',
                metadata: { consumeAfterMessageId: true }
            }
        }

        return {
            shouldTrigger: true,
            priority: 100,
            reason: 'private_message'
        }
    }
}
