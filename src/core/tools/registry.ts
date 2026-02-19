import type { StructuredTool } from '@langchain/core/tools'
import type { ChatLunaTool } from 'koishi-plugin-chatluna/llm-core/platform/types'

export type ToolFactory = () => StructuredTool
export type ToolRegistrationOptions = Pick<
    ChatLunaTool,
    'selector' | 'authorization'
>

export class ToolRegistry {
    private readonly _factories = new Map<
        string,
        { factory: ToolFactory; options?: ToolRegistrationOptions }
    >()

    register(
        name: string,
        factory: ToolFactory,
        options?: ToolRegistrationOptions
    ): void {
        this._factories.set(name, { factory, options })
    }

    list(): string[] {
        return Array.from(this._factories.keys())
    }

    createTools(): StructuredTool[] {
        return Array.from(this._factories.values()).map((entry) =>
            entry.factory()
        )
    }

    registerToChatLuna(
        registerTool: (name: string, tool: ChatLunaTool) => () => void
    ): () => void {
        const unregisters = Array.from(this._factories.entries()).map(
            ([name, entry]) =>
                registerTool(name, {
                    createTool: () => entry.factory(),
                    selector: entry.options?.selector ?? (() => true),
                    authorization: entry.options?.authorization
                })
        )

        return () => {
            for (const unregister of unregisters) {
                unregister()
            }
        }
    }
}
