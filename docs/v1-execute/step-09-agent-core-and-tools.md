# Step 09 - Agent Core and Tools

Goal
- Implement the CharacterAgent and tool definitions for reply, memory, schedule, search, and trigger control.

Deliverables
- src/core/agent.ts
- src/tools/* with tool definitions and bindings
- Tool registry that is injected into the agent executor

Implementation tasks
1) Build the system prompt from preset + config + optional thinking brain output.
2) Build messages from MessageCollector and MessageFormatter output.
3) Implement tool definitions with zod schemas and actual handlers.
4) Integrate with chatluna tool-calling executor.

References
- docs/v1-design.md
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/plugins/chat.ts

Acceptance checklist
- Agent can respond using tool calling and produce structured output for ResponseParser.
- Tool handlers call into services (memory, schedule, trigger control).
