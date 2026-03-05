import type { Context } from 'koishi'
import { BaseCharacterAgent } from './base-agent'
import {
    createViewMessagesTool,
    createTriggerReplyTool,
    createViewActivityTool,
    createMemoryTool
} from '../tools'

export class ThinkAgent extends BaseCharacterAgent {
    constructor(ctx: Context) {
        super(ctx)
    }

    protected registerTools(): void {
        this._registry.register('view_messages', createViewMessagesTool)
        this._registry.register('trigger_reply', createTriggerReplyTool)
        this._registry.register('view_activity', createViewActivityTool)
        this._registry.register('memory', createMemoryTool)
    }
}
