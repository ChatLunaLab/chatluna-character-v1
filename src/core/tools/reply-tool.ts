import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { CharacterToolRunnable } from './tool-context'
import { h } from 'koishi'

export function createReplyTool() {
    return tool(
        async (input, config: CharacterToolRunnable) => {
            const elements = h.parse(input.content)
            const delay = input.delay || 0
            if (delay > 0) {
                await new Promise((resolve) => setTimeout(resolve, delay))
            }
            try {
                await config.configurable.session.send(elements)
                return 'Success'
            } catch (error) {
                return `Error: ${error.message}`
            }
        },
        {
            name: 'reply',
            description: 'Send a reply message in structured XML format.',
            schema: z.object({
                content: z.string().describe('Reply content (koishi markup).'),
                delay: z
                    .number()
                    .int()
                    .min(0)
                    .optional()
                    .describe('Optional delay in milliseconds.')
            })
        }
    )
}
