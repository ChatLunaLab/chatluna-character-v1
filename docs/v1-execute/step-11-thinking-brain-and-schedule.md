# Step 11 - Thinking Brain and Schedule System

Goal
- Implement optional thinking brain and schedule system modules.

Deliverables
- src/brain/* modules for context analysis and decision making
- src/schedule/* modules for planner, holiday detector, location, behavior simulator
- Integration points so the agent can consume thinking and schedule contexts

Implementation tasks
1) Implement ThinkingBrain with context analysis and behavior decision using the thinking model.
2) Implement warm group checks and decision hooks.
3) Implement SchedulePlanner, HolidayDetector, and BehaviorSimulator.
4) Provide an API to expose daily plans and behavior state to the agent.

References
- docs/v1-design.md

Acceptance checklist
- Thinking brain can be enabled/disabled by config.
- Schedule system produces a daily plan and behavior state when enabled.
