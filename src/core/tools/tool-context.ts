import type { Context, Session } from 'koishi'
import type { TriggerResult } from '../triggers/base'
import type {
    CharacterConfig,
    MemoryContext,
    Message,
    PresetTemplate,
    ScheduleContext
} from '../../types'
import type { ChatLunaToolRunnable } from 'koishi-plugin-chatluna/llm-core/platform/types'

export interface ToolContext {
    ctx: Context
    session: Session
    config?: CharacterConfig
    preset?: PresetTemplate
    messages?: Message[]
    memory?: MemoryContext
    schedule?: ScheduleContext
    triggerInfo?: TriggerResult
}

export type CharacterToolRunnable = ChatLunaToolRunnable & {
    configurable: ChatLunaToolRunnable['configurable'] & {
        toolContext?: ToolContext
    }
}

export function resolveToolContext(
    config?: ChatLunaToolRunnable | CharacterToolRunnable
): ToolContext | null {
    const toolContext = (
        config?.configurable as {
            toolContext?: ToolContext
        } | null
    )?.toolContext
    if (toolContext) {
        return toolContext
    }

    const session = config?.configurable?.session
    if (!session) {
        return null
    }

    return {
        ctx: session.app,
        session
    }
}
