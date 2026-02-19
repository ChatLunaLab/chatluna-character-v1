# Step 02 - Config Interfaces and Plugin Schema

Goal
- Define the v1 configuration model: minimal Koishi plugin config plus YAML-driven runtime config types.

Deliverables
- src/config.ts with the Koishi Schema for the plugin (applyGroup, webui.enabled).
- src/types.ts with CharacterConfig, GuildConfig, TriggerConfig, MemoryConfig, ReplyConfig, ImageConfig, MuteConfig, and shared domain types.
- A typed deep-merge helper for guild overrides (if not placed in ConfigLoader later).

Implementation tasks
1) Create config interfaces that mirror the YAML structure in the v1 design.
2) Define the Koishi Schema that only captures plugin-scoped settings.
3) Keep message and preset types aligned with the new MessageParser and Preset loader.
4) Export event names and service injection types in a single place for later steps.

References
- docs/v1-design.md
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/index.ts
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/types.ts

Acceptance checklist
- YAML types cover all fields in the v1 config examples.
- Koishi plugin schema is minimal and matches v1 design.
