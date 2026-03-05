import type { Context } from 'koishi'
import type { AgentContext, AgentResult } from '../../types'
import { ChatAgent } from './chat-agent'
import { ThinkAgent } from './think-agent'
import type { BaseCharacterAgent } from './base-agent'

export class CharacterAgent {
    private readonly _agent: BaseCharacterAgent

    constructor(ctx: Context, mode: 'chat' | 'think' = 'chat') {
        this._agent = mode === 'chat' ? new ChatAgent(ctx) : new ThinkAgent(ctx)
    }

    registerToolsToChatLuna() {
        return this._agent.registerToolsToChatLuna()
    }

    async execute(context: AgentContext): Promise<AgentResult> {
        return this._agent.execute(context)
    }
}

export { BaseCharacterAgent } from './base-agent'
export { ChatAgent } from './chat-agent'
export { ThinkAgent } from './think-agent'
