# Step 04 - Preset Service

Goal
- Provide preset loading, caching, and CRUD operations for YAML presets.

Deliverables
- src/preset.ts or src/service/preset.ts that loads presets from data/chathub/character/presets.
- Preset parsing into prompt templates that use chatluna prompt renderer.
- Preset watch and event emission for WebUI updates.

Implementation tasks
1) Implement loadAllPresets and watch logic.
2) Parse system and input templates with prompt renderer.
3) Expose getPreset, getAllPresets, savePreset, deletePreset methods.
4) Surface a preset_updated event for console UI refresh.

References
- docs/v1-design.md
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/preset.ts

Acceptance checklist
- Presets load from disk and are hot-reloaded.
- CRUD methods update the in-memory cache and files.
