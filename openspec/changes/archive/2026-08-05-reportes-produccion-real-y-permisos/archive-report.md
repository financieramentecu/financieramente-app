# Archive Report: `reportes-produccion-real-y-permisos`

**Archived**: 2026-08-05  
**Schema**: `spec-driven`  
**Artifact store**: openspec (filesystem)  
**Verification**: PASS WITH WARNINGS (0 critical) — see `verify-report.md`

## Spec sync

| Capability | Action | Details |
|------------|--------|---------|
| `report-permissions` | Created | Full main spec: admin Permisos de Reportes UI, catalog by stable codes, Todas + validation, seed Performance Leader → `PRODUCCION_REAL`, server-side category authz + soft-delete. |
| `produccion-real-report` | Created | Full main spec: access gate, default filters, draft/apply, contribution multi-select, MFUND exclusion, currency modes, hierarchy tree, KPIs (Producción Real / Regular / Único / Fondeado), bars, detail table, Excel 3 sheets. |
| `admin` | Modified (delta ADDED) | Administración hub card for Permisos de Reportes → `/dashboard/admin/report-permissions` (admin-only). |
| `navigation` | Modified (delta ADDED) | Administración sub-item Permisos de Reportes; Reportes group gated by category report permissions; Producción Real → `/dashboard/reportes/produccion-real` when `PRODUCCION_REAL` enabled. |

## Tasks

37/37 tasks complete (`tasks.md`).

## Verification

`sdd-verify` verdict: **PASS WITH WARNINGS** — CRITICAL **0**, WARNING **2**, SUGGESTION **3**. Archive proceeded per user approval after verify.

Artifact reference: `openspec/changes/archive/2026-08-05-reportes-produccion-real-y-permisos/verify-report.md`

## Scope delivered

- **COM-80:** Category-level report permissions admin (catalog + `CategoryReportPermission`), APIs, audit on save, soft-delete replace.
- **COM-81:** Producción Real report under Reportes (filters, hierarchy, KPIs, Regular vs Única, detail, Excel export) with MFUND / 2ª+ Anualidad / TRM rules.
- Navigation and Admin hub wired to the new permission model; seed enables Performance Leader for `PRODUCCION_REAL`.

## Release updates at archive

- `package.json` version: `1.29.0` → `1.30.0`
- `CHANGELOG.md`: entry `## [1.30.0] - 2026-08-05`

## Known operator follow-ups

1. Run **`npx prisma migrate deploy`** (migration `20260805150000_add_report_permissions`) when the target DB is up.
2. Run **seed** so `ReportDefinition` / Performance Leader permission exist (`prisma/seeds/report-permissions.ts` via project seed pipeline).
3. Without migrate + seed, admin and Reportes menu will not behave as specified in empty environments.

## Archive location

`openspec/changes/archive/2026-08-05-reportes-produccion-real-y-permisos/`

## Contents preserved

| Artifact | Path / ID |
|----------|-----------|
| Change metadata | `.openspec.yaml` |
| Proposal | `proposal.md` |
| Design | `design.md` |
| Tasks | `tasks.md` |
| Verify report | `verify-report.md` |
| Delta specs | `specs/admin/spec.md`, `specs/navigation/spec.md`, `specs/report-permissions/spec.md`, `specs/produccion-real-report/spec.md` |
| Archive report | `archive-report.md` (this file) |

## Main specs (synced)

| Capability | Main path |
|------------|-----------|
| `report-permissions` | `openspec/specs/report-permissions/spec.md` |
| `produccion-real-report` | `openspec/specs/produccion-real-report/spec.md` |
| `admin` | `openspec/specs/admin/spec.md` (appended ADDED from this change) |
| `navigation` | `openspec/specs/navigation/spec.md` (appended ADDED from this change) |
