# Archive Report: negocios-filtro-novedades (COM-78)

**Date:** 2026-08-13  
**Archiver:** openspec-archive-change  
**Artifact store:** openspec  
**Schema:** OpenSpec experimental change workflow

## Verdict: ARCHIVED

Change archived after verify **PASS WITH WARNINGS**. Delta specs synced to main; release bumped **1.31.1 → 1.32.0** (MINOR).

---

## Preconditions

| Check | Result |
|-------|--------|
| `verify-report.md` present | Yes |
| Verify verdict | **PASS WITH WARNINGS** (0 critical, 2 warnings) |
| Tasks complete | 12/12 `[x]` |
| Archive target free | `openspec/changes/archive/2026-08-13-negocios-filtro-novedades` did not exist |

---

## Spec sync

**Source:** `openspec/changes/negocios-filtro-novedades/specs/negocios/spec.md`  
**Target:** `openspec/specs/negocios/spec.md`

Merged **ADDED** requirements (no wipe of existing main content). Inserted before `## REMOVED Requirements`:

1. **Advanced filter Novedades (COM-78)** — MultiSelect options, empty = Todos, independent of Estado  
2. **Filter by selected novedad statuses (OR within dimension)** — `IN` / multi OR  
3. **Sin novedad maps to null novedadStatus** — sentinel + mixed OR with concrete statuses  
4. **Novedades combines with other filters via AND** — list / export / stats parity for `novedadStatuses`

No MODIFIED / REMOVED / RENAMED sections in the delta.

---

## Archive move

```
openspec/changes/negocios-filtro-novedades
  → openspec/changes/archive/2026-08-13-negocios-filtro-novedades
```

`.openspec.yaml`, proposal, design, specs, tasks, verify-report, and `state.yaml` moved with the folder. `state.yaml` updated to `status: archived`, `phases.archive: complete`.

---

## Release

| Item | Action |
|------|--------|
| `package.json` | `"version": "1.32.0"` |
| `package-lock.json` | Root `financieramente-app` version → `1.32.0` (both top-level and `packages[""]`) |
| `CHANGELOG.md` | New `## [1.32.0] - 2026-08-13` (Agregado + Técnico) inserted above `## [1.31.1]` |

Bump rationale: MINOR — new user-facing advanced filter dimension (Novedades / Sin novedad).

---

## Warnings carried from verify (non-blocking)

1. Optional follow-up: AdvancedFiltersSheet interaction test (select Novedades → Aplicar/Limpiar → assert URL `novedadStatuses`).  
2. QA note: label **Cancelado** (novedad) vs Estado Cancelado — mitigated by **Novedades** section title.

---

## Artifacts

| Artifact | Path / value |
|----------|----------------|
| Archive | `openspec/changes/archive/2026-08-13-negocios-filtro-novedades/` |
| Archive report | `.../archive-report.md` (this file) |
| Main spec | `openspec/specs/negocios/spec.md` |
| Changelog | `## [1.32.0] - 2026-08-13` |
| Package version | `1.32.0` |

## Next recommended

Commit COM-78 implementation + OpenSpec archive + release files; open PR to `develop`. Do not push unless requested.

## Risks

- Working tree may still hold uncommitted app changes alongside archive/release edits — commit hygiene needed before merge.  
- Verify warnings remain optional follow-ups; no code change at archive.
