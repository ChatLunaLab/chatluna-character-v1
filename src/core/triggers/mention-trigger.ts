import { BaseTrigger, type TriggerContext, type TriggerResult } from './base'

export class MentionTrigger extends BaseTrigger {
    readonly name = 'mention'
    readonly type = 'both' as const

    async shouldTrigger(context: TriggerContext): Promise<TriggerResult> {
        const config = context.config.triggers.mention
        if (!config) {
            return { shouldTrigger: false, priority: 0 }
        }

        const parsed = context.message.parsed
        if (!parsed) {
            return { shouldTrigger: false, priority: 0 }
        }

        if (config.respondToAt) {
            const selfId = context.session.bot?.selfId
            if (selfId && parsed.mentions?.some((m) => m.id === selfId)) {
                return {
                    shouldTrigger: true,
                    priority: 85,
                    reason: 'at_mention',
                    metadata: { selfId }
                }
            }
        }

        if (config.respondToQuote && parsed.quote) {
            return {
                shouldTrigger: true,
                priority: 82,
                reason: 'quote_reply',
                metadata: { quoteId: parsed.quote.id }
            }
        }

        return { shouldTrigger: false, priority: 0 }
    }
}
