import {
    AIMessageChunk,
    BaseMessage,
    HumanMessage
} from '@langchain/core/messages'
import { computed } from 'koishi-plugin-chatluna'
import type { Context, Session } from 'koishi'
import { ChatLunaChatPrompt } from 'koishi-plugin-chatluna/llm-core/chain/prompt'
import { createAgentExecutor } from 'koishi-plugin-chatluna/llm-core/agent'
import { EMPTY_PRESET } from 'koishi-plugin-chatluna/llm-core/prompt'
import type { ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model'
import type {
    AgentContext,
    AgentResult,
    CharacterConfig,
    Message
} from '../../types'
import { MessageFormatter } from '../../utils/message-formatter'
import {
    createMemoryTool,
    createObservationTool,
    createReplyTool,
    createScheduleTool,
    createSearchTool,
    createTriggerControlTool,
    ToolRegistry
} from '../tools'

export class CharacterAgent {
    private readonly _registry = new ToolRegistry()
    private readonly _formatter = new MessageFormatter()
    private readonly _logger: Context['logger']

    constructor(private readonly ctx: Context) {
        this._logger = ctx.logger

        this._registry.register('reply', createReplyTool)
        this._registry.register('memory', createMemoryTool)
        this._registry.register('schedule', createScheduleTool)
        this._registry.register('search', createSearchTool)
        this._registry.register('trigger_control', createTriggerControlTool)
        this._registry.register('observe', createObservationTool)
    }

    registerToolsToChatLuna() {
        return this._registry.registerToChatLuna((name, tool) =>
            this.ctx.chatluna.platform.registerTool(name, tool)
        )
    }

    async execute(context: AgentContext): Promise<AgentResult> {
        const systemPrompt = await this.buildSystemPrompt(context)
        const messages = await this.buildMessages(context)
        const response = await this.invokeWithTools(
            context.session,
            context.config,
            systemPrompt,
            messages,
            context
        )

        return {
            output: response.content as string,
            raw: response.content as string
        }
    }

    private async invokeWithTools(
        session: Session,
        config: CharacterConfig,
        systemPrompt: string,
        messages: BaseMessage[],
        context: AgentContext
    ): Promise<AIMessageChunk> {
        const model =
            await this.ctx.chatluna_character_model_scheduler.getMainModel()
        const tools = this._registry.createTools()
        const toolContext = {
            ctx: this.ctx,
            session,
            config,
            preset: context.preset,
            messages: context.messages,
            memory: context.memory,
            schedule: context.schedule,
            triggerInfo: context.triggerInfo
        }

        const prompt = this.buildPrompt(model)
        const executorRef = createAgentExecutor({
            llm: computed(() => model),
            tools: computed(() => tools),
            prompt,
            agentMode: 'tool-calling',
            returnIntermediateSteps: true,
            handleParsingErrors: true,
            instructions: computed(() => systemPrompt)
        })

        try {
            const statsCallbacks =
                this.ctx.chatluna_character_stats?.createInvokeCallbacks({
                    session,
                    modelName: model.modelName,
                    invokeType: 'agent',
                    conversationId: session.guildId ?? session.userId
                })
            const output = await executorRef.value.invoke(
                {
                    input: messages[messages.length - 1],
                    chat_history: messages.slice(0, -1)
                },
                {
                    configurable: {
                        session,
                        userId: session.userId,
                        conversationId: session.guildId,
                        toolContext
                    },
                    callbacks: statsCallbacks
                }
            )

            return new AIMessageChunk({
                content: output.output ?? ''
            })
        } catch (error) {
            this._logger.warn('agent execution failed', error)
            return new AIMessageChunk({ content: '' })
        }
    }

    private buildPrompt(model: ChatLunaChatModel) {
        return new ChatLunaChatPrompt({
            preset: computed(() => EMPTY_PRESET),
            tokenCounter: (text) => model.getNumTokens(text),
            sendTokenLimit:
                model.invocationParams().maxTokenLimit ??
                model.getModelMaxContextSize(),
            promptRenderService: this.ctx.chatluna.promptRenderer
        })
    }

    private async buildSystemPrompt(context: AgentContext): Promise<string> {
        const now = new Date()
        const status = context.preset.status ?? ''
        const base = await context.preset.system.format(
            {
                time: this.formatTimestamp(now),
                stickers: '',
                status
            },
            this.ctx.chatluna.promptRenderer,
            {
                session: context.session
            }
        )

        const extras: string[] = []
        if (context.thinkingResult) {
            extras.push(
                `ThinkingBrain:\n${JSON.stringify(context.thinkingResult, null, 2)}`
            )
        }

        if (context.schedule?.dailyPlan || context.schedule?.behaviorState) {
            const scheduleSummary = {
                dailyPlan: context.schedule?.dailyPlan,
                behaviorState: context.schedule?.behaviorState,
                holidays: context.schedule?.holidays
            }
            extras.push(
                `Schedule:\n${JSON.stringify(scheduleSummary, null, 2)}`
            )
        }

        if (context.memory?.relevantMemories?.length) {
            const memories = context.memory.relevantMemories
                .map((memory) => `- ${memory.content}`)
                .join('\n')
            extras.push(`Relevant memories:\n${memories}`)
        }

        if (context.triggerInfo?.reason) {
            extras.push(`Trigger reason: ${context.triggerInfo.reason}`)
        }

        if (extras.length === 0) {
            return base
        }

        return `${base}\n\n${extras.join('\n\n')}`
    }

    private async buildMessages(context: AgentContext): Promise<BaseMessage[]> {
        const formatted = this.formatMessages(context.messages)
        const historyNew = formatted.slice(0, -1).join('\n')
        const historyLast = formatted.at(-1) ?? ''
        const input = await context.preset.input.format(
            {
                history_new: historyNew,
                history_last: historyLast,
                time: this.formatTimestamp(new Date()),
                stickers: '',
                status: context.preset.status ?? '',
                built: {
                    preset: context.preset.name,
                    conversationId:
                        context.session.guildId ?? context.session.userId
                }
            },
            this.ctx.chatluna.promptRenderer,
            {
                session: context.session
            }
        )

        return [new HumanMessage(input)]
    }

    private formatMessages(messages: Message[]): string[] {
        return messages.map((message) =>
            this._formatter.formatForLLM(message, { enableMessageId: true })
        )
    }

    private formatTimestamp(timestamp: number | Date): string {
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
