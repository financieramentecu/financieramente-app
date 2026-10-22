# Release Management: Changelog & Versioning (Changesets)

**MANDATORY:** Every product change in this repo must leave a release note and eventually bump the version. Never close a feature/bugfix/COM without a changeset.

Releases use [Changesets](https://github.com/changesets/changesets). Guide: [.changeset/README.md](../../.changeset/README.md).

## 1. Add a changeset (every PR to `develop`)

Create `.changeset/<short-kebab-name>.md` (`npx changeset` or by hand):

```md
---
'financieramente-app': minor
---

### Agregado

- **Nombre visible:** Descripción para el usuario final.

### Técnico

- Implementation detail in English.
```

**Bump type (SemVer):**

| Type | When |
|------|------|
| `major` | Breaking changes (API incompatibilities, schema removals) |
| `minor` | New features, backward-compatible capabilities |
| `patch` | Bug fixes, docs with product impact, internal optimizations |

**Body rules:**
- Only headings: `### Agregado`, `### Mejorado`, `### Corregido`, `### Técnico`
- First three: Spanish, user/product facing
- `### Técnico`: English (models, APIs, files, migrations)
- Omit unused sections

CI fails PRs to `develop` without a changeset unless labeled `no-changeset` (docs/CI-only).

## 2. Never edit CHANGELOG / version by hand (day to day)

- Do **not** edit `CHANGELOG.md` or `package.json` `"version"` during feature work.
- Never commit or push directly to `develop`, `qa`, or `main` — every change to these branches goes through a PR. From a branch synced with `develop`, run `npm run release:version` (preview: `npm run release:version -- --dry-run`).
- That consolidates pending changesets into **one** `## [X.Y.Z] - YYYY-MM-DD` entry (Bogotá date), bumps `package.json` / `package-lock.json`, and deletes consumed changesets.
- Then commit `chore(release): vX.Y.Z` on that branch, open a PR into `develop` and merge it.
- Release flow is `develop → qa → main`: after the release commit is on `develop`, open a PR `develop` → `qa` and merge it, then a PR `qa` → `main` and merge it, then tag `main`.

## 3. When this is mandatory

**Always apply when:**
- Closing any user-facing feature, bugfix, or COM ticket
- Opening / merging a PR to `develop`
- Completing `/sdd-archive` (archive adds/updates the changeset, does not edit CHANGELOG by hand)
- Code already merged without a note → add a **retroactive changeset** in a PR to `develop` (do not edit CHANGELOG/version in that PR)

**Skip only when:**
- Docs-only / CI-only / infra with no product impact → use `no-changeset` label

## 4. Retroactive gaps

If work landed without a changeset, create the missing `.changeset/*.md` on a branch from `develop` and open a PR. Leave CHANGELOG/version untouched; they update later when someone runs `npm run release:version` on `develop`.

## Related

- [changelog-version.mdc](./changelog-version.mdc) — always-on agent rule
- `CLAUDE.md` — Release Management section
- `.changeset/README.md` — authoring format
