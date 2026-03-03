import { HumanMessage } from '@langchain/core/messages'
import type { Callbacks } from '@langchain/core/callbacks/manager'
import type { ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model'
import type {
    BehaviorDecision,
    ContextAnalysis,
    ThinkingContext
} from '../../types'
import { Logger } from 'koishi'

const logger = new Logger('chatluna-character-v1')

export class DecisionMaker {
    async decide(
        model: ChatLunaChatModel,
        context: ThinkingContext,
        analysis: ContextAnalysis,
        callbacks?: Callbacks
    ): Promise<BehaviorDecision> {
        const prompt = buildDecisionPrompt(context, analysis)
        logger.info(
            `[DecisionMaker.decide] prompt length=${prompt.length} interestLevel=${analysis.interestLevel} groupActivity=${analysis.groupActivity}`
        )
        const response = await model.invoke(
            [new HumanMessage(prompt)],
            callbacks ? { callbacks } : undefined
        )
        const raw = String(response.content ?? '')
        logger.info(
            `[DecisionMaker.decide] raw response length=${raw.length}: ${raw.slice(0, 200)}`
        )
        const result = parseBehaviorDecision(raw)
        logger.info(
            `[DecisionMaker.decide] parsed: shouldRespond=${result.shouldRespond} responseTone=${result.responseTone} warmGroup=${result.warmGroup} observations=${result.observations?.length ?? 0}`
        )
        return result
    }
}

function buildDecisionPrompt(
    context: ThinkingContext,
    analysis: ContextAnalysis
): string {
    return `Based on the analysis, decide the next behavior.

Context analysis:
${JSON.stringify(analysis, null, 2)}

Current character state:
${context.characterState}

Decide:
1. Should respond?
2. What tone should the response use?
3. Should warm up the group (if it has been quiet)?
4. Any users/topics to observe?

Return XML format:
<decision>
  <should_respond>true/false</should_respond>
  <response_tone>tone</response_tone>
  <warm_group>true/false</warm_group>
  <observations>
    <observe type="user/topic/keyword">target</observe>
  </observations>
</decision>`
}

function parseBehaviorDecision(raw: string): BehaviorDecision {
    const observations = extractObservations(raw)
    return {
        shouldRespond: toBoolean(extractTag(raw, 'should_respond')),
        responseTone: extractTag(raw, 'response_tone'),
        warmGroup: toBoolean(extractTag(raw, 'warm_group')),
        observations
    }
}

function extractObservations(xml: string) {
    const pattern = /<observe(?:\s+[^>]*?)?>([\s\S]*?)<\/observe>/gi
    const attrPattern = /type=['"]?([^'"]+)['"]?/i
    const observations: BehaviorDecision['observations'] = []
    let match: RegExpExecArray | null

    while ((match = pattern.exec(xml))) {
        const tag = match[0]
        const target = match[1]?.trim()
        if (!target) {
            continue
        }
        const attrMatch = tag.match(attrPattern)
        const type = (attrMatch?.[1] ?? 'topic') as 'user' | 'topic' | 'keyword'
        observations.push({ type, target })
    }

    return observations
}

function extractTag(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'))
    return match?.[1]?.trim() ?? ''
}

function toBoolean(value: string): boolean {
    return value.trim().toLowerCase() === 'true'
}
