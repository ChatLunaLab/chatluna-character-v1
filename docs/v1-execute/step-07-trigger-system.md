# Step 07 - Trigger System

Goal
- Implement trigger classes and the decision engine for group and private triggers.

Deliverables
- src/triggers/base.ts, index.ts, decision-engine.ts
- Trigger implementations: private, activity, keyword, topic, model, schedule
- Trigger state management service per guild

Implementation tasks
1) Define TriggerContext, TriggerResult, and TriggerState types.
2) Implement PrivateTrigger and ActivityTrigger using v1 rules.
3) Port the activity scoring ideas from v0 filter into ActivityTrigger helper logic.
4) Implement DecisionEngine to run triggers in parallel and choose highest priority.
5) Add APIs for tool-driven trigger state updates.

References
- docs/v1-design.md
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/plugins/filter.ts
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/plugins/interception.ts

Acceptance checklist
- Each trigger declares type (private, group, both) and can be enabled per config.
- Decision engine returns a single winning trigger with full metadata.
