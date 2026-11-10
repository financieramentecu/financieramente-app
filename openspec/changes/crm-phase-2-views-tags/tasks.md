# Tasks: CRM Phase 2 — Lead table, saved views, tags and CRM fields

Strict TDD: RED test first, then GREEN.

## Phase 1: Schema
- [ ] 1.1 Migration `add_lead_views_tags_fields`; `prisma generate`; ERD.
- [ ] 1.2 Flags `crm_lead_table`, `crm_lead_fields`; audit actions.

## Phase 2: Table
- [ ] 2.1 RED/GREEN `lead-table-query.schema.test.ts`.
- [ ] 2.2 RED/GREEN `build-lead-table-where.test.ts` (search, filters, idle, owner scope).
- [ ] 2.3 RED/GREEN `lead-table.service.test.ts` (sort, paging, totals).
- [ ] 2.4 RED/GREEN `build-lead-table-csv.test.ts` and export service.
- [ ] 2.5 RED/GREEN routes `GET /api/crm/leads`, `GET /api/crm/leads/export`.

## Phase 3: Saved views
- [ ] 3.1 RED/GREEN `lead-saved-view.service.test.ts` + routes.

## Phase 4: Tags and CRM fields
- [ ] 4.1 RED/GREEN `lead-tag.service.test.ts` (catalogue, replace set) + routes.
- [ ] 4.2 RED/GREEN `custom-field-values.test.ts` (validation, merge).
- [ ] 4.3 RED/GREEN `lead-crm-fields.service.test.ts`, custom field definitions service + routes.
- [ ] 4.4 Read model: `LeadDetail` / `LeadCard` gain tags and value.

## Phase 5: UI
- [ ] 5.1 `LeadsTable` + `useLeadTable` + URL state + tests; enable tab.
- [ ] 5.2 `SavedViewsMenu` + tests.
- [ ] 5.3 "Datos del CRM" section in the detail sheet + tests.
- [ ] 5.4 "Configurar" dialog (tags, custom fields) + tests.

## Phase 6: Docs and verify
- [ ] 6.1 Changeset, env docs, plan update.
- [ ] 6.2 type-check, lint, test:unit.
