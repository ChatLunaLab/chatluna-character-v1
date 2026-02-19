# Step 01 - Foundation and File Layout

Goal

- Establish the v1 source tree from scratch and provide minimal entrypoints so later steps can plug in services and plugins.

Deliverables

- New src/ layout matching the v1 design modules (empty or minimal stubs are fine).
- Minimal src/index.ts and src/plugin.ts that export the plugin name and prepare plugin wiring.
- Placeholder barrels for core/, triggers/, brain/, memory/, schedule/, tools/, service/, plugins/, utils/, client/.

Implementation tasks

1. Create the directory tree described in the v1 design and add empty index.ts barrels per folder.
2. Create src/index.ts with Koishi plugin metadata (name, inject) and an apply stub that wires the upcoming services.
3. Create src/plugin.ts that collects plugin sub-modules in a single place (same pattern as v0, but using v1 module list).
4. Add a shared src/constants.ts if needed for event names and paths.

References

- docs/v1-design.md
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/index.ts
- /mnt/g/projects/koishi_projects/koishi-new/external/chatluna-character/src/plugin.ts

Acceptance checklist

- The v1 tree exists and mirrors the design doc structure.
- The v1 plugin can be loaded without runtime errors even if modules are stubs.
