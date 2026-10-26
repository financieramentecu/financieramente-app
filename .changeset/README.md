# Changesets

Every PR to `develop` adds one changeset file here. At release time all pending
changesets are consolidated into a single `CHANGELOG.md` entry and one version bump
(`npm run release:version`). Never edit `CHANGELOG.md` or the `package.json` version by hand.

## Add a changeset

Run `npx changeset` (pick `financieramente-app` and the bump type), or create
`.changeset/<short-kebab-name>.md` by hand. Then write the body in the format below.

## Bump type (Semantic Versioning)

- `major`: breaking changes (API incompatibilities, data schema removals).
- `minor`: new features, backward-compatible additions.
- `patch`: bug fixes, documentation, internal optimizations.

The release uses the highest bump among the pending changesets.

## Body format (required)

Only these headings are allowed, each followed by `- ` bullets (indent continuation
lines of a multi-line bullet). Omit sections you do not need. Anything else makes
`release:version` fail.

- `### Agregado`, `### Mejorado`, `### Corregido`: user-facing, written in Spanish.
- `### Técnico`: technical details, written in English.

## Example

```md
---
'financieramente-app': minor
---

### Agregado

- **Exportar liquidaciones a Excel:** Los administradores pueden descargar las liquidaciones filtradas.

### Técnico

- New `exportSettlements()` service in `src/features/settlements/services/`.
```

PRs that truly need no release note (docs-only, CI-only) use the `no-changeset` label instead.
