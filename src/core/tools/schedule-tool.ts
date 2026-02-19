import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import type {
    CharacterScheduleService,
    DeepNonNullable,
    ScheduleTask,
    ScheduleTaskTarget
} from '../../types'
import {
    CharacterToolRunnable,
    resolveToolContext,
    type ToolContext
} from './tool-context'

const scheduleSchema = z.object({
    action: z.enum(['add', 'list', 'remove', 'update']),
    task: z.object({
        id: z.string().optional(),
        type: z.enum(['cron', 'interval', 'once']),
        target: z.object({
            type: z.enum(['group', 'private']),
            id: z.string()
        }),
        schedule: z.string(),
        action: z.enum(['warm_group', 'greeting', 'reminder', 'custom']),
        enabled: z.boolean().optional()
    }),
    taskId: z.string().optional(),
    target: z
        .object({
            type: z.enum(['group', 'private']),
            id: z.string()
        })
        .optional()
})

function resolveService(context: ToolContext): CharacterScheduleService | null {
    const service = context.ctx.chatluna_character_schedule

    return service ?? null
}

export function createScheduleTool() {
    return tool(
        async (input, config: CharacterToolRunnable) => {
            const context = resolveToolContext(config)
            if (!context) {
                return JSON.stringify({ error: 'tool context unavailable' })
            }

            const service = resolveService(context)
            if (!service) {
                return JSON.stringify({
                    error: 'schedule service unavailable'
                })
            }

            if (input.action === 'add') {
                if (!input.task) {
                    return JSON.stringify({ error: 'task is required' })
                }
                const target = input.task.target as DeepNonNullable<
                    typeof input.task.target
                >
                const task: ScheduleTask = {
                    id: input.task.id ?? '',
                    type: input.task.type,
                    target,
                    schedule: input.task.schedule,
                    action: input.task.action,
                    enabled: input.task.enabled ?? true
                }
                return JSON.stringify(await service.addTask(task))
            }

            if (input.action === 'list') {
                const target = input.target as ScheduleTaskTarget | undefined
                return JSON.stringify(await service.listTasks(target))
            }

            if (input.action === 'remove') {
                const id = input.taskId ?? input.task?.id
                if (!id) {
                    return JSON.stringify({ error: 'taskId is required' })
                }
                return JSON.stringify(await service.removeTask(id))
            }

            if (input.action === 'update') {
                const id = input.taskId ?? input.task?.id
                if (!id || !input.task) {
                    return JSON.stringify({
                        error: 'taskId and task are required'
                    })
                }
                return JSON.stringify(
                    await service.updateTask(id, {
                        ...(input.task as Partial<ScheduleTask>),
                        enabled: input.task.enabled ?? true
                    })
                )
            }

            return JSON.stringify({ error: 'unknown action' })
        },
        {
            name: 'schedule',
            description: 'Manage schedule tasks.',
            schema: scheduleSchema
        }
    )
}
