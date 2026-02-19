# Step 13 - Plugins, Entry Wiring, and Integration

Goal
- Wire all services and plugins together and finalize the v1 entry flow.

Deliverables
- src/plugins/chat.ts, commands.ts, config.ts, filter.ts, interception.ts, private-chat.ts
- src/index.ts and src/plugin.ts fully integrated
- Entry flow covering group, private, scheduled, and WebUI triggers

Implementation tasks
1) Implement chat plugin to run trigger decision, optional thinking brain, agent execution, and output handling.
2) Implement commands and config plugin stubs (clear group, debug, schema registration if needed).
3) Implement interception to honor disableChatLuna behavior from YAML config.
4) Implement private chat entry and schedule entry handlers.
5) Add integration tests or a manual test checklist for basic flows.

References
- docs/v1-design.md
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/index.ts
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/plugin.ts
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/plugins/chat.ts
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/plugins/commands.ts
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/plugins/filter.ts
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/plugins/interception.ts

Acceptance checklist
- All services initialize in order and can be toggled via YAML config.
- Group chat and private chat flows both reach the agent and send responses.

Manual test checklist
- Start Koishi with `chatluna-character-v1` enabled and confirm YAML config is generated under `data/chathub/character/config.yml`.
- Send a group message in an `applyGroup` guild and confirm a response is generated after triggers pass.
- Send a direct message to the bot and confirm a response is generated.
- Toggle `global.disableChatLuna` in YAML and verify the main ChatLuna plugin does not respond in the target guild.
- Add a schedule task in YAML (`triggers.schedule.tasks`) and confirm it triggers a response at the expected time.
