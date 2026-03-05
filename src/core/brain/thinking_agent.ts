import { HumanMessage } from '@langchain/core/messages'
import type { Callbacks } from '@langchain/core/callbacks/manager'
import type { ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model'
import type {
    BehaviorDecision,
    CharacterModelSchedulerService,
    CharacterStatsService,
    ContextAnalysis,
    ThinkingBrainConfig,
    ThinkingContext,
    ThinkingResult,
    Message,
    ShortTermMemory
} from '../../types'
import type { Context, Session } from 'koishi'
import { Logger } from 'koishi'
import { computed } from 'koishi-plugin-chatluna'
import { createAgentExecutor } from 'koishi-plugin-chatluna/llm-core/agent'
import { ChatLunaChatPrompt } from 'koishi-plugin-chatluna/llm-core/chain/prompt'
import { EMPTY_PRESET } from 'koishi-plugin-chatluna/llm-core/prompt'
import {
    createViewMessagesTool,
    createTriggerReplyTool,
    createViewActivityTool,
    createMemoryTool,
    ToolRegistry
} from '../tools'

const logger = new Logger('chatluna-character-v1')

export interface HeartbeatContext {
    session: Session
    guildId?: string
    messages: Message[]
    activityScore?: number
    lastHeartbeat?: number
    shortTermMemory: ShortTermMemory[]
}

export interface HeartbeatResult {
    nextHeartbeatDelay: number
    observations: string[]
    shouldTriggerReply?: boolean
    triggerReason?: string
}

export type DecisionHook = (
    context: ThinkingContext,
    analysis: ContextAnalysis,
    decision: BehaviorDecision
) => BehaviorDecision | Promise<BehaviorDecision>

export class ThinkingAgent {
    private readonly _decisionHooks: DecisionHook[] = []
    private readonly _toolRegistry = new ToolRegistry()

    constructor(
        private readonly ctx: Context,
        private readonly modelScheduler: CharacterModelSchedulerService,
        private readonly config: ThinkingBrainConfig,
        private readonly statsService?: CharacterStatsService
    ) {
        this._toolRegistry.register('view_messages', createViewMessagesTool)
        this._toolRegistry.register('trigger_reply', createTriggerReplyTool)
        this._toolRegistry.register('view_activity', createViewActivityTool)
        this._toolRegistry.register('memory', createMemoryTool)
    }

    addDecisionHook(hook: DecisionHook): void {
        this._decisionHooks.push(hook)
    }

    async think(context: ThinkingContext): Promise<ThinkingResult> {
        const model = await this.modelScheduler.getThinkingModel()
        logger.info(`[ThinkingAgent.think] start guild=${context.session.guildId} user=${context.session.userId}`)

        const callbacks = this.statsService?.createInvokeCallbacks({
            session: context.session,
            modelName: model.modelName,
            invokeType: 'thinking',
            conversationId: context.session.guildId ?? context.session.userId
        })

        const prompt = this._buildThinkingPrompt(context)
        const response = await model.invoke([new HumanMessage(prompt)], callbacks ? { callbacks } : undefined)
        const raw = String(response.content ?? '')
        
        const { contextAnalysis, behaviorDecision } = this._parseThinkingResult(raw)
        
        for (const hook of this._decisionHooks) {
            await hook(context, contextAnalysis, behaviorDecision)
        }

        const warmGroupTrigger = this._shouldWarmGroup(context, behaviorDecision)
        
        logger.info(`[ThinkingAgent.think] done shouldRespond=${behaviorDecision.shouldRespond} warmGroup=${warmGroupTrigger}`)

        return {
            contextAnalysis,
            behaviorDecision,
            preferenceAdjustment: {},
            shouldRespond: behaviorDecision.shouldRespond,
            warmGroupTrigger
        }
    }

    async heartbeat(context: HeartbeatContext): Promise<HeartbeatResult> {
        const model = await this.modelScheduler.getThinkingModel()
        logger.info(`[ThinkingAgent.heartbeat] guild=${context.guildId} activityScore=${context.activityScore}`)

        const tools = this._toolRegistry.createTools()
        const toolContext = {
            ctx: this.ctx,
            session: context.session,
            config: this.config as any,
            messages: context.messages,
            memory: undefined,
            schedule: undefined,
            triggerInfo: undefined
        }

        const systemPrompt = this._buildHeartbeatSystemPrompt(context)
        const prompt = this._buildPrompt(model)
        const executor = createAgentExecutor({
            llm: computed(() => model),
            tools: computed(() => tools),
            prompt,
            agentMode: 'tool-calling',
            returnIntermediateSteps: true,
            handleParsingErrors: true,
            instructions: computed(() => systemPrompt)
        })

        try {
            const output = await executor.value.invoke(
                {
                    input: new HumanMessage('Analyze current state and decide next action'),
                    chat_history: []
                },
                {
                    configurable: {
                        session: context.session,
                        userId: context.session.userId,
                        conversationId: context.guildId,
                        toolContext
                    }
                }
            )

            logger.info(`[ThinkingAgent.heartbeat] agent output: ${output.output}`)
            return this._parseHeartbeatResult(String(output.output ?? ''))
        } catch (error) {
            logger.warn('[ThinkingAgent.heartbeat] agent failed', error)
            return {
                nextHeartbeatDelay: 5 * 60 * 1000,
                observations: [],
                shouldTriggerReply: false
            }
        }
    }

    private _buildThinkingPrompt(context: ThinkingContext): string {
        const now = this._formatTime(context.currentTime)
        const history = context.messages.slice(-20).map(m => 
            `[${this._formatTime(m.timestamp ?? Date.now())}] ${m.name}: ${m.content}`
        ).join('\n')
        
        const memories = context.memory?.relevantMemories ?? []
        const memoryText = memories.length ? memories.map(m => `- ${m.content}`).join('\n') : 'None'

        return `Analyze conversation and decide behavior.

Current time: ${now}
History:
${history || 'No messages'}

Memories:
${memoryText}

Character state: ${context.characterState}

Analyze and decide:
1. Topic and atmosphere
2. Interest level (0-10)
3. Group activity (active/normal/cold)
4. Should respond?
5. Response tone
6. Should warm group if quiet?

Return XML:
<thinking>
  <topic>topic</topic>
  <atmosphere>atmosphere</atmosphere>
  <interest_level>0-10</interest_level>
  <group_activity>active/normal/cold</group_activity>
  <should_respond>true/false</should_respond>
  <response_tone>tone</response_tone>
  <warm_group>true/false</warm_group>
  <observations>
    <observe type="user/topic/keyword">target</observe>
  </observations>
</thinking>`
    }

    private _buildPrompt(model: ChatLunaChatModel) {
        return new ChatLunaChatPrompt({
            preset: computed(() => EMPTY_PRESET),
            tokenCounter: (text) => model.getNumTokens(text),
            sendTokenLimit: model.invocationParams().maxTokenLimit ?? model.getModelMaxContextSize(),
            promptRenderService: this.ctx.chatluna.promptRenderer,
            contextManager: this.ctx.chatluna.contextManager
        })
    }

    private _buildHeartbeatSystemPrompt(context: HeartbeatContext): string {
        const memoryText = context.shortTermMemory.length
            ? context.shortTermMemory.map(m => `- ${m.content}`).join('\n')
            : 'None'

        return `You are performing a heartbeat check to monitor conversation activity.

Current context:
- Guild: ${context.guildId ?? 'private'}
- Activity score: ${context.activityScore ?? 'unknown'}
- Last heartbeat: ${context.lastHeartbeat ? new Date(context.lastHeartbeat).toLocaleString() : 'first time'}

Short-term memory:
${memoryText}

Your task:
1. Use available tools to analyze recent messages and activity
2. Decide if you should trigger a reply (e.g., interesting topic, someone needs response)
3. Note any observations worth remembering
4. Determine when the next heartbeat should occur (1-30 minutes)

After analysis, provide your decision in XML format:
<heartbeat>
  <should_trigger>true/false</should_trigger>
  <trigger_reason>reason if true</trigger_reason>
  <next_delay>minutes</next_delay>
  <observations>
    <item>observation text</item>
  </observations>
</heartbeat>`
    }

    private _parseThinkingResult(raw: string): { contextAnalysis: ContextAnalysis; behaviorDecision: BehaviorDecision } {
        const contextAnalysis: ContextAnalysis = {
            topic: this._extractTag(raw, 'topic'),
            atmosphere: this._extractTag(raw, 'atmosphere'),
            interestLevel: this._toNumber(this._extractTag(raw, 'interest_level'), 0),
            groupActivity: this._extractTag(raw, 'group_activity'),
            lastParticipation: ''
        }

        const behaviorDecision: BehaviorDecision = {
            shouldRespond: this._toBoolean(this._extractTag(raw, 'should_respond')),
            responseTone: this._extractTag(raw, 'response_tone'),
            warmGroup: this._toBoolean(this._extractTag(raw, 'warm_group')),
            observations: this._extractObservations(raw)
        }

        return { contextAnalysis, behaviorDecision }
    }

    private _parseHeartbeatResult(raw: string): HeartbeatResult {
        const shouldTrigger = this._extractTag(raw, 'should_trigger') === 'true'
        const triggerReason = this._extractTag(raw, 'trigger_reason')
        const nextDelay = parseInt(this._extractTag(raw, 'next_delay') || '5', 10)
        const observations = this._extractHeartbeatObservations(raw)

        return {
            nextHeartbeatDelay: Math.max(1, Math.min(30, nextDelay)) * 60 * 1000,
            observations,
            shouldTriggerReply: shouldTrigger,
            triggerReason: shouldTrigger ? triggerReason : undefined
        }
    }

    private _shouldWarmGroup(context: ThinkingContext, decision: BehaviorDecision): boolean {
        if (!this.config.warmGroup.enabled || !decision.warmGroup) return false

        const lastMessageTime = context.groupInfo?.lastMessageTime ?? 
            context.messages.at(-1)?.timestamp ?? 
            context.currentTime.getTime()
        const gap = context.currentTime.getTime() - lastMessageTime
        return gap >= this.config.warmGroup.threshold
    }

    private _extractTag(xml: string, tag: string): string {
        const match = xml.match(new RegExp(`<${tag}>([\s\S]*?)</${tag}>`, 'i'))
        return match?.[1]?.trim() ?? ''
    }

    private _extractObservations(xml: string): BehaviorDecision['observations'] {
        const pattern = /<observe(?:\s+[^>]*?)?>([\s\S]*?)<\/observe>/gi
        const attrPattern = /type=['"]?([^'"]+)['"]?/i
        const observations: BehaviorDecision['observations'] = []
        let match: RegExpExecArray | null

        while ((match = pattern.exec(xml))) {
            const tag = match[0]
            const target = match[1]?.trim()
            if (!target) continue
            const attrMatch = tag.match(attrPattern)
            const type = (attrMatch?.[1] ?? 'topic') as 'user' | 'topic' | 'keyword'
            observations.push({ type, target })
        }

        return observations
    }

    private _extractHeartbeatObservations(xml: string): string[] {
        const observations: string[] = []
        const pattern = /<item>([\s\S]*?)<\/item>/gi
        let match: RegExpExecArray | null

        while ((match = pattern.exec(xml))) {
            const item = match[1]?.trim()
            if (item) observations.push(item)
        }

        return observations
    }

    private _toBoolean(value: string): boolean {
        return value.trim().toLowerCase() === 'true'
    }

    private _toNumber(value: string, fallback: number): number {
        const numeric = Number(value)
        return Number.isFinite(numeric) ? numeric : fallback
    }

    private _formatTime(timestamp: number | Date): string {
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
        return date.toLocaleString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZoneName: 'short'
        })
    }
}
