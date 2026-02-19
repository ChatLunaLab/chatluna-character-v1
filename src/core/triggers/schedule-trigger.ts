import type { ScheduleTask } from '../../types'
import { BaseTrigger, type TriggerContext, type TriggerResult } from './base'

export class ScheduleTrigger extends BaseTrigger {
    readonly name = 'schedule'
    readonly type = 'both' as const
    private readonly _lastRun = new Map<string, number>()

    async shouldTrigger(context: TriggerContext): Promise<TriggerResult> {
        const taskFromContext = context.scheduleTask
        if (taskFromContext?.enabled) {
            return {
                shouldTrigger: true,
                priority: 60,
                reason: 'schedule_task',
                metadata: { taskId: taskFromContext.id }
            }
        }

        const tasks = context.config.triggers.schedule.tasks ?? []
        const now = Date.now()
        const targetType = context.isPrivate ? 'private' : 'group'
        const targetId = context.isPrivate ? context.userId : context.guildId

        for (const task of tasks) {
            if (!task.enabled) {
                continue
            }
            if (task.target.type !== targetType) {
                continue
            }
            if (targetId && task.target.id !== targetId) {
                continue
            }
            if (!this._shouldExecute(task, now)) {
                continue
            }
            this._lastRun.set(task.id, now)
            return {
                shouldTrigger: true,
                priority: 60,
                reason: 'schedule_task',
                metadata: { taskId: task.id, action: task.action }
            }
        }

        return { shouldTrigger: false, priority: 0 }
    }

    private _shouldExecute(task: ScheduleTask, now: number): boolean {
        const lastRun = this._lastRun.get(task.id)
        if (task.type === 'once') {
            const when = this._parseTimestamp(task.schedule)
            if (!when) {
                return false
            }
            return (!lastRun || lastRun < when) && now >= when
        }
        if (task.type === 'interval') {
            const interval = Number(task.schedule)
            if (!Number.isFinite(interval) || interval <= 0) {
                return false
            }
            if (!lastRun) {
                return true
            }
            return now - lastRun >= interval
        }
        return false
    }

    private _parseTimestamp(raw: string): number | null {
        const numeric = Number(raw)
        if (Number.isFinite(numeric) && numeric > 0) {
            return numeric
        }
        const parsed = Date.parse(raw)
        return Number.isFinite(parsed) ? parsed : null
    }
}
