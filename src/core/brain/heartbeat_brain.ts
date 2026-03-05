import type { Context, Session } from 'koishi'
import { computed } from 'koishi-plugin-chatluna'
import { createAgentExecutor } from 'koishi-plugin-chatluna/llm-core/agent'
import { ChatLunaChatPrompt } from 'koishi-plugin-chatluna/llm-core/chain/prompt'
import type { ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model'
import { EMPTY_PRESET } from 'koishi-plugin-chatluna/llm-core/prompt'
import type {
    CharacterConfig,
    CharacterModelSchedulerService,
    Message,
    ShortTermMemory
} from '../../types'
import { HumanMessage } from '@langchain/core/messages'
import { Logger } from 'koishi'
import { createViewActivityTool, createViewMessagesTool } from '../tools'

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

export class HeartbeatBrain {
    constructor(
        private readonly ctx: Context,
        private readonly modelScheduler: CharacterModelSchedulerService,
        private readonly config: CharacterConfig
    ) {}

    async think(context: HeartbeatContext): Promise<HeartbeatResult> {
        if (this.config.thinkingBrain?.heartbeat?.useAgent) {
            return this.thinkWithAgent(context)
        }

        return this.thinkSinglePass(context)
    }

    private async thinkSinglePass(
        context: HeartbeatContext
    ): Promise<HeartbeatResult> {
        const model = await this.modelScheduler.getThinkingModel()
        logger.info(
            `[HeartbeatBrain.think] guild=${context.guildId} messages=${context.messages.length} activityScore=${context.activityScore}`
        )

        const prompt = this.buildPrompt(context)
        const response = await model.invoke([new HumanMessage(prompt)])
        const raw = String(response.content ?? '')

        return this.parseResult(raw)
    }

    private async thinkWithAgent(
        context: HeartbeatContext
    ): Promise<HeartbeatResult> {
        const model = await this.modelScheduler.getThinkingModel()
        const tools = [createViewMessagesTool(), createViewActivityTool()]
        const toolContext = {
            ctx: this.ctx,
            session: context.session,
            config: this.config,
            messages: context.messages,
            memory: undefined,
            schedule: undefined,
            triggerInfo: undefined
        }

        const prompt = this.buildChatPrompt(model)
        const executorRef = createAgentExecutor({
            llm: computed(() => model),
            tools: computed(() => tools),
            prompt,
            agentMode: 'tool-calling',
            returnIntermediateSteps: true,
            handleParsingErrors: true,
            instructions: computed(() => this.buildPrompt(context))
        })

        try {
            const output = await executorRef.value.invoke(
                {
                    input: new HumanMessage(
                        'Inspect current chat activity with tools, then return heartbeat XML.'
                    ),
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

            return this.parseResult(String(output.output ?? ''))
        } catch (error) {
            logger.warn('[HeartbeatBrain.thinkWithAgent] agent failed', error)
            return this.thinkSinglePass(context)
        }
    }

    private buildChatPrompt(model: ChatLunaChatModel) {
        return new ChatLunaChatPrompt({
            preset: computed(() => EMPTY_PRESET),
            tokenCounter: (text) => model.getNumTokens(text),
            sendTokenLimit:
                model.invocationParams().maxTokenLimit ??
                model.getModelMaxContextSize(),
            promptRenderService: this.ctx.chatluna.promptRenderer,
            contextManager: this.ctx.chatluna.contextManager
        })
    }

    private buildPrompt(context: HeartbeatContext): string {
        const recentMessages = context.messages.slice(-20)
        const minDelay = Math.max(
            1,
            this.config.thinkingBrain?.heartbeat?.minDelayMinutes ?? 1
        )
        const maxDelay = Math.max(
            minDelay,
            this.config.thinkingBrain?.heartbeat?.maxDelayMinutes ?? 30
        )
        const history = recentMessages
            .map(
                (m) =>
                    `[${new Date(m.timestamp ?? Date.now()).toLocaleString()}] ${m.name}: ${m.content}`
            )
            .join('\n')

        const memoryText = context.shortTermMemory.length
            ? context.shortTermMemory.map((m) => `- ${m.content}`).join('\n')
            : 'None'

        return `You are analyzing the current conversation state in a heartbeat check.

Recent messages:
${history || 'No recent messages'}

Short-term memory:
${memoryText}

Activity score: ${context.activityScore ?? 'unknown'}
Last heartbeat: ${context.lastHeartbeat ? new Date(context.lastHeartbeat).toLocaleString() : 'first time'}

Analyze:
1. Should I trigger a reply? (e.g., interesting topic, someone needs response)
2. What should I observe/remember?
3. When should the next heartbeat be? (in minutes, ${minDelay}-${maxDelay})

Return XML:
<heartbeat>
  <should_trigger>true/false</should_trigger>
  <trigger_reason>reason if true</trigger_reason>
  <next_delay>minutes</next_delay>
  <observations>
    <item>observation text</item>
  </observations>
</heartbeat>`
    }

    private parseResult(raw: string): HeartbeatResult {
        const minDelay = Math.max(
            1,
            this.config.thinkingBrain?.heartbeat?.minDelayMinutes ?? 1
        )
        const maxDelay = Math.max(
            minDelay,
            this.config.thinkingBrain?.heartbeat?.maxDelayMinutes ?? 30
        )
        const defaultDelay = Math.min(
            maxDelay,
            Math.max(
                minDelay,
                this.config.thinkingBrain?.heartbeat?.defaultDelayMinutes ?? 5
            )
        )
        const shouldTrigger = this.extractTag(raw, 'should_trigger') === 'true'
        const triggerReason = this.extractTag(raw, 'trigger_reason')
        const parsedDelay = parseInt(this.extractTag(raw, 'next_delay'), 10)
        const nextDelay = Number.isFinite(parsedDelay)
            ? parsedDelay
            : defaultDelay
        const observations = this.extractObservations(raw)

        return {
            nextHeartbeatDelay:
                Math.max(minDelay, Math.min(maxDelay, nextDelay)) * 60 * 1000,
            observations,
            shouldTriggerReply: shouldTrigger,
            triggerReason: shouldTrigger ? triggerReason : undefined
        }
    }

    private extractTag(xml: string, tag: string): string {
        const match = xml.match(
            new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i')
        )
        return match?.[1]?.trim() ?? ''
    }

    private extractObservations(xml: string): string[] {
        const observations: string[] = []
        const pattern = /<item>([\s\S]*?)<\/item>/gi
        let match: RegExpExecArray | null

        while ((match = pattern.exec(xml))) {
            const item = match[1]?.trim()
            if (item) observations.push(item)
        }

        return observations
    }
}
