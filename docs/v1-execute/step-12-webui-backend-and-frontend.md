# Step 12 - WebUI Backend and Frontend

Goal

- Implement the Koishi Console WebUI for managing config, presets, triggers, and memory.

Deliverables

- src/webui/backend.ts (or service/webui-service.ts) with console listeners
- client/ entry wiring for the dashboard and components
- APIs for config, presets, groups, memory, triggers, and models

Implementation tasks

1. Register console entry (dev/prod) and i18n resources.
2. Implement backend listeners that call config loader, preset service, memory, and triggers.
3. Implement basic front-end navigation and editors for config and presets.
4. Add model list fetch via chatluna service.

References

- docs/v1-design.md
- /mnt/g/projects/koishi_projects/koishi-new/external/emojiluna/client/\*\*
- /mnt/g/projects/koishi_projects/koishi-new/external/emojiluna/src/backend.ts

Acceptance checklist

- WebUI can read and write YAML config and preset files.
- Basic group and memory views work without errors.
