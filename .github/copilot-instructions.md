# Project instructions

This is a data-driven TypeScript visual-novel / dialogue-training engine.

- Keep story content, character display names, dialogue, choices, labels, and branching data under `property/`.
- Do not hard-code story copy or character names in `src/`.
- Keep stable IDs in data and resolve display values at runtime.
- When adding a scene, update `property/manifest.json`.
- Validate new content with the schema/parsers in `src/domain/schema.ts`.
