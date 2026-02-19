import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import type { TriggerService, TriggerState } from '../../types'
import {
    CharacterToolRunnable,
    resolveToolContext,
    type ToolContext
} from './tool-context'

const triggerSchema = z.object({
    action: z.enum([
        'watch_user',
        'watch_keyword',
        'watch_topic',
        'wait_message',
        'clear'
    ]),
    target: z.string().optional(),
    userId: z.string().optional(),
    keyword: z.string().optional(),
    topic: z.string().optional(),
    messageId: z.string().optional()
})

function getStateKey(context: ToolContext): string {
    if (context.session.isDirect) {
        return `private:${context.session.userId ?? context.session.uid ?? ''}`
    }
    return `group:${context.session.guildId ?? 'unknown'}`
}

function resolveService(context: ToolContext): TriggerService | null {
    return context.ctx.chatluna_character_triggers ?? null
}

export function createTriggerControlTool() {
    return tool(
        async (input, config: CharacterToolRunnable) => {
            const context = resolveToolContext(config)
            if (!context) {
                return JSON.stringify({ error: 'tool context unavailable' })
            }

            const service = resolveService(context)
            if (!service?.applyToolUpdate) {
                return JSON.stringify({ error: 'trigger service unavailable' })
            }

            const stateKey = getStateKey(context)
            const result = service.applyToolUpdate(stateKey, input.action, {
                trigger: input.target,
                userId: input.userId,
                keyword: input.keyword,
                topic: input.topic,
                messageId: input.messageId
            })

            return JSON.stringify(result as Record<string, TriggerState>)
        },
        {
            name: 'trigger_control',
            description: 'Control trigger behaviors for the current chat.',
            schema: triggerSchema
        }
    )
}
