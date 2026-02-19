import { HumanMessage } from '@langchain/core/messages'
import type { Callbacks } from '@langchain/core/callbacks/manager'
import type { ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model'
import type { ContextAnalysis, ThinkingContext } from '../../types'

export class ContextAnalyzer {
    async analyze(
        model: ChatLunaChatModel,
        context: ThinkingContext,
        callbacks?: Callbacks
    ): Promise<ContextAnalysis> {
        const prompt = buildContextPrompt(context)
        const response = await model.invoke(
            [new HumanMessage(prompt)],
            callbacks ? ({ callbacks } as any) : undefined
        )
        return parseContextAnalysis(String(response.content ?? ''))
    }
}

function buildContextPrompt(context: ThinkingContext): string {
    const now = formatTimestamp(context.currentTime)
    const history = context.messages
        .slice(-20)
        .map(
            (message) =>
                `[${formatTimestamp(message.timestamp ?? Date.now())}] ${
                    message.name
                }: ${message.content}`
        )
        .join('\n')
    const memories = context.memory?.relevantMemories ?? []
    const memoryText = memories.length
        ? memories.map((memory) => `- ${memory.content}`).join('\n')
        : 'None.'

    return `Analyze the current conversation context.

Current time: ${now}
Conversation history:
${history || 'No recent messages.'}

Character memories:
${memoryText}

Please analyze:
1. The current topic.
2. The conversation atmosphere.
3. Whether someone is discussing a topic I care about.
4. Whether the group is currently active.
5. How long since I last participated.

Return XML format:
<analysis>
  <topic>topic</topic>
  <atmosphere>atmosphere</atmosphere>
  <interest_level>0-10</interest_level>
  <group_activity>active/normal/cold</group_activity>
  <last_participation>time description</last_participation>
</analysis>`
}

function parseContextAnalysis(raw: string): ContextAnalysis {
    return {
        topic: extractTag(raw, 'topic'),
        atmosphere: extractTag(raw, 'atmosphere'),
        interestLevel: toNumber(extractTag(raw, 'interest_level'), 0),
        groupActivity: extractTag(raw, 'group_activity'),
        lastParticipation: extractTag(raw, 'last_participation')
    }
}

function extractTag(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'))
    return match?.[1]?.trim() ?? ''
}

function toNumber(value: string, fallback: number): number {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : fallback
}

function formatTimestamp(timestamp: number | Date): string {
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
