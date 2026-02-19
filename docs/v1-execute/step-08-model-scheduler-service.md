# Step 08 - Model Scheduler Service

Goal
- Provide a service that resolves main, analysis, and thinking models from chatluna.

Deliverables
- src/service/model-scheduler.ts with computed refs to chat models.
- Integration with config loader to react to config updates.

Implementation tasks
1) Implement getMainModel, getAnalysisModel, getThinkingModel.
2) Use chatluna platform/model naming and computed refs for late binding.
3) Refresh refs on config_updated events.

References
- docs/v1-design.md
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/plugins/chat.ts

Acceptance checklist
- Model scheduler can return usable models for all three roles.
- Config changes update the scheduler without restart.
