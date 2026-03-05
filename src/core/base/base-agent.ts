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
import { ToolRegistry } from '../tools'

export abstract class BaseCharacterAgent {
    protected readonly _registry = new ToolRegistry()
    protected readonly _formatter = new MessageFormatter()
    protected readonly _logger: Context['logger']

    constructor(protected readonly ctx: Context) {
        this._logger = ctx.logger
        this.registerTools()
    }

    protected abstract registerTools(): void

    registerToolsToChatLuna() {
        return this._registry.registerToChatLuna((name, tool) =>
            this.ctx.chatluna.platform.registerTool(name, tool)
        )
    }

    async execute(context: AgentContext): Promise<AgentResult> {
        const logger = this._logger('chatluna-character-v1')
        logger.info(
            `[agent.execute] guild=${context.session.guildId} user=${context.session.userId} preset=${context.preset?.name} messages=${context.messages.length}`
        )
        const systemPrompt = await this.buildSystemPrompt(context)
        logger.info(
            `[agent.execute] systemPrompt length=${systemPrompt.length}`
        )
        const messages = await this.buildMessages(context)
        logger.info(`[agent.execute] built ${messages.length} message(s)`)
        const response = await this.invokeWithTools(
            context.session,
            context.config,
            systemPrompt,
            messages,
            context
        )
        logger.info(
            `[agent.execute] response length=${String(response.content ?? '').length}: ${String(response.content ?? '').slice(0, 120)}`
        )

        return {
            output: response.content as string,
            raw: response.content as string
        }
    }

    protected async invokeWithTools(
        session: Session,
        config: CharacterConfig,
        systemPrompt: string,
        messages: BaseMessage[],
        context: AgentContext
    ): Promise<AIMessageChunk> {
        const logger = this._logger('chatluna-character-v1')
        const model =
            await this.ctx.chatluna_character_model_scheduler.getMainModel()
        logger.info(
            `[agent.invokeWithTools] model=${model.modelName} tools=${this._registry
                .createTools()
                .map((t) => t.name)
                .join(',')}`
        )
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
            logger.info(
                `[agent.invokeWithTools] invoking agent executor guild=${session.guildId}`
            )
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

            logger.info(
                `[agent.invokeWithTools] agent executor finished, intermediateSteps=${output.intermediateSteps?.length ?? 0}`
            )
            this.ctx.logger.info('Agent output', output)
            return new AIMessageChunk({
                content: output.output ?? ''
            })
        } catch (error) {
            this._logger.warn('agent execution failed', error)
            return new AIMessageChunk({ content: '' })
        }
    }

    protected buildPrompt(model: ChatLunaChatModel) {
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

    protected async buildSystemPrompt(context: AgentContext): Promise<string> {
        const logger = this._logger('chatluna-character-v1')
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

        logger.info(
            `[agent.buildSystemPrompt] extras=${extras.length} (thinkingResult=${!!context.thinkingResult}, schedule=${!!context.schedule?.dailyPlan || !!context.schedule?.behaviorState}, memories=${context.memory?.relevantMemories?.length ?? 0}, triggerReason=${!!context.triggerInfo?.reason})`
        )

        if (extras.length === 0) {
            return base
        }

        return `${base}\n\n${extras.join('\n\n')}`
    }

    protected async buildMessages(
        context: AgentContext
    ): Promise<BaseMessage[]> {
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

    protected formatMessages(messages: Message[]): string[] {
        return messages.map((message) =>
            this._formatter.formatForLLM(message, { enableMessageId: true })
        )
    }

    protected formatTimestamp(timestamp: number | Date): string {
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
