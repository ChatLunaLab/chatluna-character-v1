# Step 03 - Config Loader Service

Goal
- Implement the YAML config loader service and live reload behavior.

Deliverables
- src/service/config-loader.ts with load, watch, and merge logic.
- Register the loader as a Koishi Service (ctx.chatluna_character_config) via ctx.plugin.
- Default config generation for missing config.yml.

Implementation tasks
1) Implement directory creation for data/chathub/character, groups, presets.
2) Load config.yml and all groups/*.yml and keep a cached map.
3) Watch the config directory and emit a config_updated event on changes.
4) Provide getGuildConfig and saveGuildConfig methods with deep merge.

References
- docs/v1-design.md

Acceptance checklist
- Config loader creates defaults on first run and supports live reload.
- Group overrides merge correctly with the global config.
