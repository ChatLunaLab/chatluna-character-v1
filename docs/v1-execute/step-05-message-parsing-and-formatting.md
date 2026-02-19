# Step 05 - Message Parsing and Formatting

Goal
- Replace the v0 custom lexer with Koishi h.parse based parsing and response formatting.

Deliverables
- src/utils/message-parser.ts
- src/utils/message-formatter.ts
- src/utils/response-parser.ts
- Removal of legacy textMatchLexer style helpers in v1 codebase.

Implementation tasks
1) Implement MessageParser to extract plain text, mentions, quotes, images, and faces from Element arrays.
2) Implement MessageFormatter to serialize Message to XML-like format for LLM input.
3) Implement ResponseParser to parse LLM output and post-process elements (markdown, html entities, at filtering, split).
4) Provide unit-level helpers for sentence splitting and markdown rendering (reuse minimal transform if needed).

References
- docs/v1-design.md
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/utils.ts

Acceptance checklist
- h.parse is the only parser for message elements.
- Response parsing returns Element groups suitable for sender output.
