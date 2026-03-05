import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { CharacterToolRunnable, resolveToolContext } from './tool-context'

const schema = z.object({
    targetType: z.enum(['group', 'private']),
    targetId: z.string(),
    reason: z.string()
})

export function createTriggerReplyTool() {
    return tool(
        async (input, config: CharacterToolRunnable) => {
            const context = resolveToolContext(config)
            if (!context) {
                return JSON.stringify({ error: 'tool context unavailable' })
            }

            const chatService = context.ctx.chatluna_character_chat
            if (!chatService?.triggerReply) {
                return JSON.stringify({ error: 'chat service unavailable' })
            }

            const success = await chatService.triggerReply(
                input.targetType,
                input.targetId,
                input.reason
            )

            return JSON.stringify({ success })
        },
        {
            name: 'trigger_reply',
            description: 'Trigger a reply to a group or private chat',
            schema
        }
    )
}
