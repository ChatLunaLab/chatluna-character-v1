import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { CharacterToolRunnable, resolveToolContext } from './tool-context'

const schema = z.object({
    targetType: z.enum(['group', 'private']),
    targetId: z.string()
})

export function createViewActivityTool() {
    return tool(
        async (input, config: CharacterToolRunnable) => {
            const context = resolveToolContext(config)
            if (!context) {
                return JSON.stringify({ error: 'tool context unavailable' })
            }

            const triggerService = context.ctx.chatluna_character_triggers
            if (!triggerService?.getState) {
                return JSON.stringify({ error: 'trigger service unavailable' })
            }

            const stateKey = `${input.targetType}:${input.targetId}`
            const state = triggerService.getState(stateKey)

            if (!state) {
                return JSON.stringify({ error: 'no activity data' })
            }

            return JSON.stringify({
                activityScore: state.activityScore ?? 0,
                lastActivity: state.lastActivity
                    ? new Date(state.lastActivity).toLocaleString()
                    : 'unknown',
                messageCount: state.messageCount ?? 0
            })
        },
        {
            name: 'view_activity',
            description:
                'View activity score and stats for a group or private chat',
            schema
        }
    )
}
