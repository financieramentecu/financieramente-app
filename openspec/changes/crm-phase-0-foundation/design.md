# Design: CRM Phase 0 — Foundation

## D1. Navigation
- `menu-items.tsx`: `Negocios` gets `subItems: [Ver Negocios, CRM]`; `Leads` removed from `ALL_MENU_ITEMS` and `AGENTE_MENU_ITEMS`; `CRM` added to AGENTE `Mis Negocios`.
- `menu-builder.ts`: the `Negocios` branch filters sub-items (`CRM` ⇔ `permissions.leads`). If only `Ver Negocios` survives, `subItems` is dropped so the item renders flat (same pattern as `Liquidaciones`). The `Leads` branch is deleted.
- `nav-main.tsx` matches active sub-items by exact `pathname`; tabs use client state (not sub-routes), so `/dashboard/negocios/crm` stays the active URL.

## D2. CRM page
- `src/app/dashboard/negocios/crm/page.tsx` (server): `auth()` + `isFeatureEnabledServer('leads_module')`, renders `DashboardLayout` + `CrmTabs`.
- `src/features/leads/components/crm-tabs.tsx` (client): shadcn `Tabs`, `Pipeline` → `<LeadsBoard />`, the rest `disabled` with a "Próximamente" label. The tab list is a const array in `src/features/leads/lib/crm-tabs.ts` so future phases only add entries.
- `src/app/dashboard/leads/page.tsx` → `redirect('/dashboard/negocios/crm')`.

## D3. Stage history
- Schema: `enum LeadStageChangeSource { CRM_SYNC CSV_IMPORT MANUAL }` and `model LeadStageHistory` (`lead_stage_history`) with FKs to `lead` (`ON DELETE CASCADE` is irrelevant: leads are soft-deleted) and two FKs to `lead_funnel_column` (named relations `StageHistoryFrom` / `StageHistoryTo`), FK to `user` nullable. Index `(id_lead, changed_at)`.
- Pure fn `shouldRecordStageChange(previousColumnId: number | null | undefined, nextColumnId: number): boolean` in `lib/should-record-stage-change.ts` (true when no previous column or different).
- Service `lead-stage-history.service.ts` → `recordLeadStageChange(input)`: runs the predicate, inserts the row, catches errors and reports them to Sentry (never throws).
- Callers: `upsertLeadFromCrm` (source `CRM_SYNC`, `changedAt = payload.updatedAt ?? receivedAt`) and `importLeadsFromCsv` (source `CSV_IMPORT`, `idUser = actor.userId`, `changedAt = receivedAt`).
- Not transactional with the upsert, consistent with the current non-transactional sync; the "never throws" rule keeps the webhook's idempotent contract intact.
- Audit: the lead mutation is already audited (`LEAD_CREATED` / `LEAD_STATUS_CHANGED`); the history row is part of that same event, so no extra `AuditAction`.

## D4. GHL badge
- `lead-detail-sheet.tsx`: `Badge variant="outline"` "Gestionado en GHL" next to the outcome badge when `lead.externalCrmId?.trim()`.

## D5. Docs
- `prisma/ERD.md`: enum, relations, entity, convention note.
- Changeset (`minor`).
- Plan doc updated with the Phase 0 adjustments (flag reuse, permissions deferral).
