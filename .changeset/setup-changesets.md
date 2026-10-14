---
'financieramente-app': patch
---

### Mejorado

- **Notas de versión consolidadas automáticamente:** Cada cambio registra su propia nota y, al publicar una versión, todas se unifican en una sola entrada del CHANGELOG con un único incremento de versión, eliminando los conflictos de CHANGELOG y versión entre ramas.

### Técnico

- Adopt `@changesets/cli` (2.x, Node 20 compatible) with `.changeset/config.json` (`baseBranch: develop`, built-in changelog disabled, private package versioning enabled).
- New `npm run release:version` (`scripts/release/consolidate-changelog.ts`) consolidates pending changesets into one CHANGELOG entry in the existing Agregado/Mejorado/Corregido/Técnico format, then runs `changeset version` and syncs `package-lock.json`; supports `--dry-run`.
- Pure parsing/rendering logic in `scripts/release/changelog-entry.ts` with unit tests; `vitest.unit.config.ts` now collects `scripts/**/*.test.ts`.
- New `changeset` job in the QA PR pipeline runs `changeset status --since=origin/develop`, skippable with the `no-changeset` label.
- `human-id` pinned to 4.1.3 via `overrides` so the Changesets CLI runs on Node 20 releases without `require(esm)` support.
