# Step 06 - Message Collector and Response Queue

Goal
- Implement message collection for group and private chats and the response lock queue.

Deliverables
- src/service/message-collector.ts with message storage and filters.
- src/core/response-queue.ts with lock, accumulate, and latest-only behavior.
- Hooks to emit a message_collect event when a response should be triggered.

Implementation tasks
1) Store recent messages per guild or private session with size and expiry limits.
2) Normalize incoming sessions into Message objects using MessageParser.
3) Provide response lock acquisition and latest-only pending response behavior.
4) Support image processing limits similar to v0 with model constraints.

References
- docs/v1-design.md
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/service/message.ts

Acceptance checklist
- Only the latest pending response is processed when multiple messages arrive quickly.
- Message storage respects size and expiry limits.
