import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import {
    CharacterToolRunnable,
    resolveToolContext,
    type ToolContext
} from './tool-context'

const schema = z.object({
    targetType: z.enum(['group', 'private']),
    targetId: z.string(),
    limit: z.number().optional()
})

export function createViewMessagesTool() {
    return tool(
        async (input, config: CharacterToolRunnable) => {
            const context = resolveToolContext(config)
            if (!context) {
                return JSON.stringify({ error: 'tool context unavailable' })
            }

            const collector = context.ctx.chatluna_character_message_collector
            if (!collector) {
                return JSON.stringify({
                    error: 'message collector unavailable'
                })
            }

            const session = {
                ...context.session,
                isDirect: input.targetType === 'private',
                guildId:
                    input.targetType === 'group' ? input.targetId : undefined,
                userId:
                    input.targetType === 'private'
                        ? input.targetId
                        : context.session.userId
            }

            const messageContext = collector.getContext(session as any)
            if (!messageContext?.messages) {
                return JSON.stringify({ messages: [] })
            }

            const messages = messageContext.messages.slice(-(input.limit ?? 10))
            return JSON.stringify({
                messages: messages.map((m) => ({
                    name: m.name,
                    content: m.content,
                    timestamp: new Date(
                        m.timestamp ?? Date.now()
                    ).toLocaleString()
                }))
            })
        },
        {
            name: 'view_messages',
            description: 'View recent messages from a group or private chat',
            schema
        }
    )
}
