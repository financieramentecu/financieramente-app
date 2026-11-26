# Tasks: CRM Phase 0 — Foundation

Strict TDD: every RED test is written and seen failing before its GREEN implementation.

## Phase 1: Navigation
- [x] 1.1 RED: `menu-builder.test.ts` — ADMIN/ASISTENTE/ANALISTA: `Negocios` has sub-items `Ver Negocios`, `CRM`; no `Leads`. CONSULTOR: flat `Negocios`. AGENTE: `['Dashboard','Mis Negocios','Calculadora']` and `CRM` inside `Mis Negocios`.
- [x] 1.2 GREEN: `menu-items.tsx` + `menu-builder.ts`.
- [x] 1.3 RED/GREEN: `breadcrumb-utils.test.ts` — `crm` → `CRM`.

## Phase 2: CRM page
- [x] 2.1 RED: `crm-tabs.test.tsx` — Pipeline selected and renders the board; other tabs disabled.
- [x] 2.2 GREEN: `lib/crm-tabs.ts`, `components/crm-tabs.tsx`, `app/dashboard/negocios/crm/page.tsx`.
- [x] 2.3 `app/dashboard/leads/page.tsx` → redirect.

## Phase 3: Stage history
- [x] 3.1 Schema + migration `add_lead_stage_history` + `prisma generate`.
- [x] 3.2 RED/GREEN: `should-record-stage-change.test.ts`.
- [x] 3.3 RED/GREEN: `lead-stage-history.service.test.ts` (inserts, skips, swallows + Sentry).
- [x] 3.4 RED/GREEN: `lead-sync.service.test.ts` — create, change, unchanged, historical `updatedAt`.
- [x] 3.5 RED/GREEN: `lead-csv-import.service.test.ts` — change recorded with `CSV_IMPORT` + actor.

## Phase 4: GHL badge
- [x] 4.1 RED/GREEN: lead detail sheet test — badge with/without `externalCrmId`.

## Phase 5: Docs & verify
- [x] 5.1 `prisma/ERD.md`, changeset (baseline specs are merged at archive).
- [x] 5.2 `npm run type-check`, `npm run lint`, `npm run test:unit`.
