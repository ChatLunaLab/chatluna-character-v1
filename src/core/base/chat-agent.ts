import type { Context } from 'koishi'
import { BaseCharacterAgent } from './base-agent'
import {
    createCancelActiveTriggersTool,
    createMemoryTool,
    createObservationTool,
    createReplyTool,
    createScheduleNextReplyTool,
    createScheduleTool,
    createScheduleWakeUpTool,
    createTriggerControlTool
} from '../tools'

export class ChatAgent extends BaseCharacterAgent {
    constructor(ctx: Context) {
        super(ctx)
    }

    protected registerTools(): void {
        this._registry.register('reply', createReplyTool)
        this._registry.register('memory', createMemoryTool)
        this._registry.register('schedule', createScheduleTool)
        this._registry.register('trigger_control', createTriggerControlTool)
        this._registry.register('observe', createObservationTool)
        this._registry.register('schedule_wakeup', createScheduleWakeUpTool)
        this._registry.register(
            'schedule_next_reply',
            createScheduleNextReplyTool
        )
        this._registry.register(
            'cancel_active_triggers',
            createCancelActiveTriggersTool
        )
    }
}
