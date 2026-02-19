import { BaseTrigger, type TriggerContext, type TriggerResult } from './base'

export class KeywordTrigger extends BaseTrigger {
    readonly name = 'keyword'
    readonly type = 'group' as const

    async shouldTrigger(context: TriggerContext): Promise<TriggerResult> {
        if (context.isPrivate) {
            return { shouldTrigger: false, priority: 0 }
        }

        const state = this.getState(context)
        const messageId = context.message.messageId
        if (state.afterMessageId && messageId !== state.afterMessageId) {
            return {
                shouldTrigger: true,
                priority: 95,
                reason: 'after_message',
                metadata: { consumeAfterMessageId: true }
            }
        }

        if (state.watchedUsers.includes(context.userId)) {
            return {
                shouldTrigger: true,
                priority: 90,
                reason: 'watched_user',
                metadata: { userId: context.userId }
            }
        }

        const keywords = this._collectKeywords(context, state.watchedKeywords)
        if (keywords.length === 0) {
            return { shouldTrigger: false, priority: 0 }
        }

        const content = (context.message.content ?? '').toLowerCase()
        const matched = keywords.find((keyword) =>
            content.includes(keyword.toLowerCase())
        )
        if (!matched) {
            return { shouldTrigger: false, priority: 0 }
        }

        return {
            shouldTrigger: true,
            priority: 80,
            reason: 'keyword_match',
            metadata: { keyword: matched }
        }
    }

    private _collectKeywords(
        context: TriggerContext,
        watched: string[]
    ): string[] {
        const configKeywords = context.config.triggers.keyword.keywords ?? []
        const combined = [...configKeywords, ...watched].filter(
            (keyword) => keyword.trim().length > 0
        )
        return Array.from(new Set(combined))
    }
}
