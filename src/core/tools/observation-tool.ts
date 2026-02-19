import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import type { TriggerService } from '../../types'
import {
    CharacterToolRunnable,
    resolveToolContext,
    type ToolContext
} from './tool-context'

const observationSchema = z.object({
    type: z.enum(['user', 'topic', 'keyword']),
    target: z.string(),
    action: z.enum(['start', 'stop']),
    notifyOn: z.enum(['any', 'mention', 'reply']).optional()
})

function resolveService(context: ToolContext): TriggerService | null {
    return context.ctx.chatluna_character_triggers ?? null
}

function getStateKey(context: ToolContext): string {
    if (context.session.isDirect) {
        return `private:${context.session.userId ?? context.session.uid ?? ''}`
    }
    return `group:${context.session.guildId ?? 'unknown'}`
}

export function createObservationTool() {
    return tool(
        async (input, config: CharacterToolRunnable) => {
            const context = resolveToolContext(config)
            if (!context) {
                return JSON.stringify({ error: 'tool context unavailable' })
            }

            const service = resolveService(context)
            if (!service) {
                return JSON.stringify({ error: 'trigger service unavailable' })
            }

            const stateKey = getStateKey(context)

            if (input.action === 'start' && service.applyToolUpdate) {
                const action =
                    input.type === 'user'
                        ? 'watch_user'
                        : input.type === 'topic'
                          ? 'watch_topic'
                          : 'watch_keyword'
                const payload =
                    input.type === 'user'
                        ? { userId: input.target }
                        : input.type === 'topic'
                          ? { topic: input.target }
                          : { keyword: input.target }

                return JSON.stringify(
                    service.applyToolUpdate(stateKey, action, payload)
                )
            }

            const states = service.getStates(stateKey)
            const triggerName =
                input.type === 'user'
                    ? 'keyword'
                    : input.type === 'topic'
                      ? 'topic'
                      : 'keyword'
            const state = states[triggerName]

            if (!state) {
                return JSON.stringify(states)
            }

            if (input.type === 'user') {
                state.watchedUsers = state.watchedUsers.filter(
                    (id) => id !== input.target
                )
            } else if (input.type === 'topic') {
                state.watchedTopics = state.watchedTopics.filter(
                    (topic) => topic !== input.target
                )
            } else {
                state.watchedKeywords = state.watchedKeywords.filter(
                    (keyword) => keyword !== input.target
                )
            }

            service.updateState(stateKey, triggerName, state)
            return JSON.stringify(service.getStates(stateKey))
        },
        {
            name: 'observe',
            description: 'Observe a user, keyword, or topic.',
            schema: observationSchema
        }
    )
}
