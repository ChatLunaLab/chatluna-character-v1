# Step 10 - Memory System

Goal
- Implement layered memory storage with indexing and query capability.

Deliverables
- src/memory/* modules: short-term, long-term, event-memory, memory-indexer
- Database tables for memory records and events
- Memory service API exposed to tools and agent

Implementation tasks
1) Define memory record schema and indices.
2) Implement add/query/update/delete APIs with importance-based routing.
3) Implement MemoryIndexer using tags, users, groups, time ranges.
4) Add periodic cleanup for expired memories when enabled.

References
- docs/v1-design.md

Acceptance checklist
- Memory queries return ranked results across layers.
- Event memory is stored and retrievable.
