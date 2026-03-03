import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import {
    CharacterToolRunnable,
    resolveToolContext,
    type ToolContext
} from './tool-context'

function resolveActiveTriggerService(context: ToolContext) {
    return context.ctx.chatluna_character_triggers ?? null
}

function resolveTarget(context: ToolContext): {
    targetType: 'group' | 'private'
    targetId: string
} {
    if (context.session.isDirect) {
        return {
            targetType: 'private',
            targetId: context.session.userId ?? context.session.uid ?? ''
        }
    }
    return {
        targetType: 'group',
        targetId: context.session.guildId ?? 'unknown'
    }
}

// ─── schedule_wakeup ─────────────────────────────────────────────────

const wakeUpSchema = z.object({
    time: z
        .string()
        .describe(
            'The time to wake up, in "YYYY/MM/DD-HH:mm:ss" format. Must be in the future.'
        ),
    reason: z
        .string()
        .default('')
        .describe(
            'An optional note describing why this wake-up was scheduled. ' +
                'This will be included in the trigger reason when the wake-up fires.'
        )
})

export function createScheduleWakeUpTool() {
    return tool(
        async (input, config: CharacterToolRunnable) => {
            const context = resolveToolContext(config)
            if (!context) {
                return JSON.stringify({ error: 'tool context unavailable' })
            }

            const service = resolveActiveTriggerService(context)
            if (!service) {
                return JSON.stringify({
                    error: 'active trigger service unavailable'
                })
            }

            const { targetType, targetId } = resolveTarget(context)
            const ok = await service.registerWakeUp(
                targetType,
                targetId,
                input.time,
                input.reason
            )

            if (!ok) {
                return JSON.stringify({
                    success: false,
                    error: 'Failed to register wake-up. Check time format (YYYY/MM/DD-HH:mm:ss) and ensure it is in the future.'
                })
            }

            return JSON.stringify({
                success: true,
                targetType,
                targetId,
                time: input.time,
                reason: input.reason
            })
        },
        {
            name: 'schedule_wakeup',
            description:
                'Schedule a wake-up at a specific future time. ' +
                'When the time arrives, the character will proactively send a message. ' +
                'The wake-up is persisted to the database and survives restarts. ' +
                'Time format: YYYY/MM/DD-HH:mm:ss (e.g. 2025/01/15-08:30:00).',
            schema: wakeUpSchema
        }
    )
}

// ─── schedule_next_reply ─────────────────────────────────────────────

const nextReplySchema = z.object({
    condition: z
        .string()
        .describe(
            'A JavaScript expression that will be evaluated to decide when to trigger a proactive reply.\n' +
                'Available variables:\n' +
                '  - silence       — seconds since any user last sent a message\n' +
                '  - silenceOf(id) — seconds since user <id> last sent a message\n' +
                '  - said(id)      — true if user <id> has spoken since this trigger was created\n' +
                '  - now           — current time in epoch-ms\n' +
                '  - createdAt     — epoch-ms when this trigger was registered\n' +
                '\n' +
                'Examples:\n' +
                '  "silence > 30"                — reply after 30 seconds of silence\n' +
                '  "said(\'12345\')"              — reply when user 12345 sends a message\n' +
                '  "silence > 30 && said(\'12345\')" — both conditions must hold\n' +
                '  "silence > 30 || said(\'12345\')" — either condition triggers\n' +
                '  "silenceOf(\'12345\') > 60"     — 60s silence from that specific user'
        ),
    reason: z
        .string()
        .default('')
        .describe(
            'An optional human-readable description of why this delayed reply was scheduled.'
        )
})

export function createScheduleNextReplyTool() {
    return tool(
        async (input, config: CharacterToolRunnable) => {
            const context = resolveToolContext(config)
            if (!context) {
                return JSON.stringify({ error: 'tool context unavailable' })
            }

            const service = resolveActiveTriggerService(context)
            if (!service) {
                return JSON.stringify({
                    error: 'active trigger service unavailable'
                })
            }

            const { targetType, targetId } = resolveTarget(context)
            const ok = service.registerNextReply(
                targetType,
                targetId,
                input.condition,
                input.reason || undefined
            )

            if (!ok) {
                return JSON.stringify({
                    success: false,
                    error: 'Failed to register next_reply. The condition expression may be invalid or contain blocked keywords.'
                })
            }

            return JSON.stringify({
                success: true,
                targetType,
                targetId,
                condition: input.condition,
                reason: input.reason
            })
        },
        {
            name: 'schedule_next_reply',
            description:
                'Schedule a delayed reply that triggers when a JS condition expression evaluates to true. ' +
                'Use this to proactively follow up after a period of silence, ' +
                'or when a specific user sends a message. ' +
                'Only one next_reply can be pending at a time; new ones overwrite the previous.',
            schema: nextReplySchema
        }
    )
}

// ─── cancel_active_triggers ──────────────────────────────────────────

const cancelSchema = z.object({
    type: z
        .enum(['next_reply', 'wake_up', 'all'])
        .describe(
            'Which type of active trigger to cancel: "next_reply", "wake_up", or "all".'
        )
})

export function createCancelActiveTriggersTool() {
    return tool(
        async (input, config: CharacterToolRunnable) => {
            const context = resolveToolContext(config)
            if (!context) {
                return JSON.stringify({ error: 'tool context unavailable' })
            }

            const service = resolveActiveTriggerService(context)
            if (!service) {
                return JSON.stringify({
                    error: 'active trigger service unavailable'
                })
            }

            const { targetType, targetId } = resolveTarget(context)

            if (input.type === 'next_reply' || input.type === 'all') {
                service.clearNextReplies(targetType, targetId)
            }
            if (input.type === 'wake_up' || input.type === 'all') {
                await service.clearWakeUps(targetType, targetId)
            }

            return JSON.stringify({
                success: true,
                cancelled: input.type,
                targetType,
                targetId
            })
        },
        {
            name: 'cancel_active_triggers',
            description:
                'Cancel pending active triggers (delayed replies or scheduled wake-ups) for the current chat.',
            schema: cancelSchema
        }
    )
}
