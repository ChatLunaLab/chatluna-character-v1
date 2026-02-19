import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { CharacterToolRunnable, resolveToolContext } from './tool-context'

const searchSchema = z.object({
    query: z.string(),
    type: z.enum(['web', 'holiday', 'weather', 'news']).default('web')
})

export function createSearchTool() {
    return tool(
        async (input, config: CharacterToolRunnable) => {
            const context = resolveToolContext(config)
            if (!context) {
                return JSON.stringify({
                    error: 'tool context unavailable',
                    query: input.query,
                    type: input.type
                })
            }

            const service = (
                context.ctx as unknown as {
                    chatluna_character_search?: {
                        search: (
                            query: string,
                            type: string
                        ) => Promise<unknown>
                    }
                }
            ).chatluna_character_search

            if (!service) {
                return JSON.stringify({
                    error: 'search service unavailable',
                    query: input.query,
                    type: input.type
                })
            }

            const result = await service.search(input.query, input.type)
            return JSON.stringify(result)
        },
        {
            name: 'search',
            description: 'Search for information via external services.',
            schema: searchSchema
        }
    )
}
