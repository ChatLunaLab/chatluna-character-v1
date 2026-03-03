import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import type {
    CharacterMemoryService,
    MemoryInput,
    MemoryQuery
} from '../../types'
import {
    CharacterToolRunnable,
    resolveToolContext,
    type ToolContext
} from './tool-context'

const memorySchema = z.object({
    action: z.enum(['save', 'query', 'delete', 'update']),
    content: z.string().optional(),
    summary: z.string().optional(),
    type: z.string().optional(),
    importance: z.number().min(1).max(10).optional(),
    expireAt: z.string().optional(),
    tags: z.array(z.string()).optional(),
    relatedUsers: z.array(z.string()).optional(),
    relatedGroups: z.array(z.string()).optional(),
    query: z.string().optional(),
    users: z.array(z.string()).optional(),
    groups: z.array(z.string()).optional(),
    timeRange: z
        .object({
            start: z.number().optional(),
            end: z.number().optional()
        })
        .optional(),
    types: z.array(z.string()).optional(),
    layers: z.array(z.enum(['short-term', 'long-term'])).optional(),
    limit: z.number().optional(),
    includeEvents: z.boolean().optional(),
    id: z.string().optional()
})

function resolveService(context: ToolContext): CharacterMemoryService | null {
    const service = context.ctx.chatluna_character_memory
    return service ?? null
}

export function createMemoryTool() {
    return tool(
        async (input, config: CharacterToolRunnable) => {
            const context = resolveToolContext(config)
            if (!context) {
                return JSON.stringify({ error: 'tool context unavailable' })
            }

            const service = resolveService(context)
            if (!service) {
                return JSON.stringify({
                    error: 'memory service unavailable'
                })
            }

            if (input.action === 'save') {
                const payload: MemoryInput = {
                    guildId: context.session.guildId ?? undefined,
                    userId: context.session.isDirect
                        ? context.session.userId
                        : undefined,
                    content: input.content ?? '',
                    summary: input.summary,
                    type: input.type,
                    importance: input.importance,
                    expireAt: input.expireAt,
                    tags: input.tags,
                    relatedUsers: input.relatedUsers,
                    relatedGroups: input.relatedGroups
                }
                return JSON.stringify(await service.save(payload))
            }

            if (input.action === 'query') {
                const payload: MemoryQuery = {
                    guildId: context.session.guildId ?? undefined,
                    userId: context.session.isDirect
                        ? context.session.userId
                        : undefined,
                    query: input.query ?? '',
                    tags: input.tags,
                    users: input.users,
                    groups: input.groups,
                    timeRange: input.timeRange,
                    types: input.types,
                    layers: input.layers,
                    limit: input.limit,
                    includeEvents: input.includeEvents
                }
                return JSON.stringify(await service.query(payload))
            }

            if (input.action === 'delete') {
                if (!input.id) {
                    return JSON.stringify({ error: 'id is required' })
                }
                return JSON.stringify(await service.delete(input.id))
            }

            if (input.action === 'update') {
                if (!input.id) {
                    return JSON.stringify({ error: 'id is required' })
                }
                return JSON.stringify(
                    await service.update(input.id, {
                        content: input.content,
                        summary: input.summary,
                        type: input.type,
                        importance: input.importance,
                        expireAt: parseExpireAt(input.expireAt),
                        tags: input.tags,
                        relatedUsers: input.relatedUsers,
                        relatedGroups: input.relatedGroups
                    })
                )
            }

            return JSON.stringify({ error: 'unknown action' })
        },
        {
            name: 'memory',
            description: 'Manage character memories.',
            schema: memorySchema
        }
    )
}

function parseExpireAt(value?: string): number | null | undefined {
    if (value === undefined) {
        return undefined
    }
    if (value === '') {
        return null
    }
    const parsed = new Date(value).getTime()
    return Number.isNaN(parsed) ? null : parsed
}
