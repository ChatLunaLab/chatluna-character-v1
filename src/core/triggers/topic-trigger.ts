import type { Message } from '../../types'
import { BaseTrigger, type TriggerContext, type TriggerResult } from './base'

export type TopicAnalysis = {
    shouldParticipate: boolean
    topic?: string
    reason?: string
    priority?: number
}

type TopicAnalyzer = (messages: Message[]) => Promise<TopicAnalysis>

export class TopicTrigger extends BaseTrigger {
    readonly name = 'topic'
    readonly type = 'group' as const
    private readonly _buffers = new Map<string, Message[]>()
    private readonly _analyzer?: TopicAnalyzer

    constructor(analyzer?: TopicAnalyzer) {
        super()
        this._analyzer = analyzer
    }

    async shouldTrigger(context: TriggerContext): Promise<TriggerResult> {
        if (context.isPrivate || !context.guildId) {
            return { shouldTrigger: false, priority: 0 }
        }

        const state = this.getState(context)
        const watchedTopic = this._matchWatchedTopic(
            state.watchedTopics,
            context.message.content ?? ''
        )
        if (watchedTopic) {
            return {
                shouldTrigger: true,
                priority: 75,
                reason: 'watched_topic',
                metadata: { topic: watchedTopic }
            }
        }

        const bufferSize = Math.max(1, context.config.triggers.topic.bufferSize)
        const key = context.guildId
        const buffer = this._buffers.get(key) ?? []
        buffer.push(context.message)
        this._buffers.set(key, buffer)

        if (!this._analyzer || buffer.length < bufferSize) {
            return { shouldTrigger: false, priority: 0 }
        }

        const messages = buffer.slice(-bufferSize)
        this._buffers.set(key, [])

        const analysis = await this._analyzer(messages)
        if (!analysis.shouldParticipate) {
            return { shouldTrigger: false, priority: 0 }
        }

        return {
            shouldTrigger: true,
            priority: analysis.priority ?? 70,
            reason: analysis.reason ?? 'topic_interest',
            metadata: { topic: analysis.topic }
        }
    }

    private _matchWatchedTopic(
        topics: string[],
        content: string
    ): string | null {
        if (!topics?.length) {
            return null
        }
        const normalized = content.toLowerCase()
        const matched = topics.find((topic) =>
            normalized.includes(topic.toLowerCase())
        )
        return matched ?? null
    }
}
