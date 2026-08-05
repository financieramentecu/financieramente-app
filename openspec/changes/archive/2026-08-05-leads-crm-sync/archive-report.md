# Archive Report: `leads-crm-sync`

**Archived**: 2026-08-05
**Artifact store**: hybrid (filesystem + Engram)

## Spec sync

| Domain | Action | Details |
|--------|--------|---------|
| `leads` | Created | Full spec: lead entity, ownership/hierarchy visibility, outcome status + `WON` terminal lock, read-only Kanban board, lead detail, manual conversion to `Client` + `Business`. |
| `leads-crm-sync` | Created | Full spec: webhook ingestion contract, API-key auth, rate limiting, upsert/partial-merge semantics, `statusKey`/`outcomeStatus` resolution, unmapped-status fallback. |
| `lead-funnel-columns` | Created | Full spec: admin CRUD for funnel columns, `externalStatusKey` mapping (immutable after creation), ordering, deletion guards, fixed "Sin mapear" column, soft-delete tombstone. |
| `navigation` | Modified (delta ADDED) | Added `Leads` top-level nav entry (visible to all roles, including `AGENTE`) and the `Columnas del Funnel de Leads` entry under Administración. |
| `security` | Modified (delta ADDED) | Added the first non-session, service-to-service authenticated inbound endpoint (API key header + timing-safe compare + in-memory rate limit). |

## Tasks

129/130 tasks complete across 14 phases. Task 7.3 (optional Playwright E2E) intentionally left unchecked — explicitly out of scope from the proposal.

## Verification

`sdd-verify` ran and found one CRITICAL blocker (a type regression: `mapLeadToBusinessDefaults` began requiring the full `LeadDetail` — including the new `ownerName` field — while `getLeadForConversion()` returns a raw Prisma `Lead` without it). Fixed via Interface Segregation: the mapper now takes `Pick<LeadDetail, 'name' | 'lastName' | 'email' | 'phone' | 'identityNumber'>` instead of the full type. Re-verified after the fix:

- `npx tsc --noEmit -p .` — clean, 0 errors.
- `npx vitest run src/features/leads src/app/api/leads src/features/shared/ui` — 40 files, 285 tests passing.
- `npx eslint` — clean, 0 warnings.

## Scope delivered

Full Leads module: CRM webhook ingestion (`POST /api/leads/crm-sync`), read-only Kanban board with admin-configurable funnel columns (drag & drop reorder, name-only edit modal, immutable `externalStatusKey`, delete confirmation + soft-delete tombstone), lead outcome status (`OPEN`/`WON`/`LOST`/`ABANDONED` with `WON` terminal lock), owner assignment (`ownerEmail`, case-insensitive, no sticky owner), hierarchy-based visibility, manual conversion to `Client` + `Business` with anti-double-conversion guard, owner avatar on card/detail, Kanban filters (outcome chips + date range, themed to match the sidebar), manual refresh + focus/visibility refetch, seed for the 22 real business funnel columns, CI/CD wiring for `LEADS_CRM_SYNC_API_KEY` (GitHub Actions + docker-compose, QA/prod), and an n8n integration guide (`docs/LEADS_WEBHOOK_INTEGRATION_GUIDE.md`).

Additional app-wide bugfix discovered and fixed along the way: the shared `Calendar`/`DateRangePicker` never highlighted a selected date range anywhere in the app (Tailwind v4 utility-class generation gap for `react-day-picker`'s conditional `data-*` variants) — patched in `src/app/globals.css`, benefiting every date-range picker in the app, not just Leads.

## Known non-blocking operator follow-ups

1. Hand-authored Prisma migrations (`Lead`/`LeadFunnelColumn`, `outcomeStatus`) not yet applied to the shared Neon dev DB, blocked by pre-existing unrelated `novedad_*` drift. Fix already documented: `prisma migrate resolve --applied <old-migration-name>`, then `prisma migrate dev`.
2. `.env.example` could not be edited by the apply-phase sandbox; `LEADS_CRM_SYNC_API_KEY` is documented in `docs/ENVIRONMENT_VARIABLES.md` instead — add the line manually before merge.
3. GitHub Secrets `LEADS_CRM_SYNC_API_KEY_QA` / `LEADS_CRM_SYNC_API_KEY_PROD` must be created manually in repo settings before the next QA/prod deploy — the workflows already reference them.
4. Root cause of the Tailwind v4 highlighting bug (`tailwind.config.js` never loaded via `@config` in `src/app/tailwind.css`) remains unresolved beyond the `Calendar` patch — a full audit is a separate future change.

## Archive location

`openspec/changes/archive/2026-08-05-leads-crm-sync/`

## Contents preserved

- `proposal.md`
- `design.md`
- `tasks.md`
- `specs/leads/spec.md`, `specs/leads-crm-sync/spec.md`, `specs/lead-funnel-columns/spec.md`, `specs/navigation/spec.md`, `specs/security/spec.md` (delta)
- `archive-report.md` (this file)

## Engram cross-references

`sdd/leads-crm-sync/proposal` (#51), `sdd/leads-crm-sync/spec` (#52), `sdd/leads-crm-sync/design` (#53), `sdd/leads-crm-sync/tasks` (#54), `sdd/leads-crm-sync/verify-report` (#56), `sdd/leads-crm-sync/archive-report` (#57).
