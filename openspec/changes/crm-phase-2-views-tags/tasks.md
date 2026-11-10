# Tasks: CRM Phase 2 — Lead table, saved views, tags and CRM fields

Strict TDD: RED test first, then GREEN.

## Phase 1: Schema
- [x] 1.1 Migration `add_lead_views_tags_fields`; `prisma generate`; ERD.
- [x] 1.2 Flags `crm_lead_table`, `crm_lead_fields`; audit actions.

## Phase 2: Table
- [x] 2.1 RED/GREEN `lead-table-query.schema.test.ts`.
- [x] 2.2 RED/GREEN `build-lead-table-where.test.ts` (search, filters, idle, owner scope).
- [x] 2.3 RED/GREEN `lead-table.service.test.ts` (sort, paging, totals).
- [x] 2.4 RED/GREEN `build-lead-table-csv.test.ts` and export service.
- [x] 2.5 RED/GREEN routes `GET /api/crm/leads`, `GET /api/crm/leads/export`, `GET /api/crm/stages`.

## Phase 3: Saved views
- [x] 3.1 RED/GREEN `lead-saved-view.service.test.ts` + routes.

## Phase 4: Tags and CRM fields
- [x] 4.1 RED/GREEN `lead-tag.service.test.ts` (catalogue, replace set) + routes.
- [x] 4.2 RED/GREEN `custom-field-values.test.ts` (validation, merge).
- [x] 4.3 RED/GREEN `lead-crm-fields.service.test.ts`, custom field definitions service + routes.
- [x] 4.4 Read model: `LeadDetail` / `LeadCard` gain tags and value.

## Phase 5: UI
- [x] 5.1 `LeadsTable` + `useLeadTable` + URL state + tests; enable tab.
- [x] 5.2 `SavedViewsMenu` + tests.
- [x] 5.3 "Datos del CRM" section in the detail sheet + tests.
- [x] 5.4 "Configurar" dialog (tags, custom fields) + tests.

## Phase 6: Docs and verify
- [x] 6.1 Changeset, env docs, plan update.
- [x] 6.2 type-check, lint, test:unit.
- [ ] 6.3 Mockup in `Financiera.pen` and integration/E2E against a disposable database (same gap as Phase 1).
