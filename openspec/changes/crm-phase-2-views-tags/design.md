# Design: CRM Phase 2

## D1. Schema (migration `add_lead_views_tags_fields`, additive only)

```prisma
model Lead {
  estimatedValue    Decimal? @map("estimated_value") @db.Decimal(15, 2)
  probability       Int?     // 0..100
  customFieldValues Json     @default("{}") @map("custom_field_values")
  tagAssignments    LeadTagAssignment[]
}

model LeadTag {            // catalogue, managed by CRM managers
  idLeadTag Int @id; name VarChar(60) unique (case-insensitive by service); color VarChar(7); active Boolean; createdBy Int; timestamps
}

model LeadTagAssignment {  // join row; removal = active=false (soft delete)
  idLeadTagAssignment Int @id; idLead; idLeadTag; active; assignedBy; timestamps
  @@unique([idLead, idLeadTag])  // re-assign reactivates the row
}

enum LeadCustomFieldType { TEXT NUMBER DATE SELECT }

model LeadCustomField {
  idLeadCustomField Int @id; key VarChar(40) unique (snake_case); label VarChar(80); type; options Json (SELECT only); position Int; active; createdBy; timestamps
}

model LeadSavedView {
  idLeadSavedView Int @id; idUser; name VarChar(60); query Json; active; timestamps
  @@index([idUser, active])
}
```

Custom field values live in `Lead.customFieldValues` (JSON keyed by `key`), validated against the active definitions on write (Twenty-style, no EAV table). Deactivating a definition hides its value but keeps it.

## D2. Table query (`crm/lead-table-query.schema.ts`)

Parsed from `URLSearchParams` with zod; the same shape is stored in a saved view.

| param | rule |
|---|---|
| `q` | trimmed, ≤ 100; matches name, lastName, email, phone, identityNumber (`contains`, insensitive) |
| `status` (repeat) | `LeadOutcomeStatus`; absent = all |
| `stage` (repeat) | funnel column ids |
| `owner` (repeat) | user ids; out-of-scope ids are dropped by the service (never widens scope) |
| `tag` (repeat) | tag ids; lead must have any of them |
| `from` / `to` | `YYYY-MM-DD`, Bogotá inclusive range on `createdAt` |
| `idle` | `1` = open leads idle ≥ `CRM_INACTIVITY_DAYS` |
| `sort` | `createdAt` (default) · `lastActivityAt` · `name` · `estimatedValue` · `probability` |
| `dir` | `desc` (default) · `asc`; nulls last |
| `page` / `pageSize` | 1-based; pageSize 10..100, default 25 |

`buildLeadListWhere` is reused for the scope clause and extended with the new filters in `build-lead-table-where.ts` (pure).

## D3. Totals

`getLeadTable` returns `{ items, total, page, pageSize, totals: { estimatedValue, weightedValue } }` over the whole filtered set, not just the page. The service reads `estimatedValue, probability` of the filtered leads that have a value (capped at 5 000 rows) and sums with `Prisma.Decimal`: estimated = Σ value, weighted = Σ value × probability / 100 (a lead without probability counts as 0). Above the cap both totals are `null`. Amounts travel as strings to avoid float drift.

## D4. Export

`GET /api/crm/leads/export` — same query, no pagination, hard cap 5 000 rows (`413` above). Pure `build-lead-table-csv.ts`: Comma separator, RFC 4180 quoting, UTF-8 BOM for Excel, and formula-injection guard (cells starting with `= + - @` get a leading `'`). Audited as `LEAD_TABLE_EXPORTED` with the row count and the query.

## D5. Saved views

Per user; any CRM role, CONSULTOR included (a view is a personal preference, not CRM data). `GET/POST /api/crm/views`, `PATCH/DELETE /api/crm/views/[id]` (only the owner; others get 404). Max 20 active views per user. DELETE = `active=false`. Audit `LEAD_VIEW_CREATED/UPDATED/DEACTIVATED`.

## D6. Tags

- Catalogue: `GET /api/crm/tags` (any CRM user), `POST` and `DELETE /api/crm/tags/[id]` (manage). Name unique case-insensitively among active tags; creating an inactive name reactivates it.
- Assignment: `PUT /api/leads/[id]/tags { tagIds }` (manage, lead in scope) replaces the active set: missing → `active=false`, new or inactive → upsert active. Tag changes are audited (`LEAD_TAGS_UPDATED`) but not added to the timeline, which stays about contact work. Catalogue changes: `LEAD_TAG_CREATED/DEACTIVATED`.

## D7. CRM fields

`PATCH /api/leads/[id]/crm-fields { estimatedValue?: string|null, probability?: int 0..100|null, customFields?: Record<key, value|null> }` (manage, lead in scope). Custom values are validated per type (TEXT ≤ 500, NUMBER finite, DATE `YYYY-MM-DD`, SELECT ∈ options); unknown or inactive keys → 400. Merged into the stored JSON (null removes the key). Audit `LEAD_CRM_FIELDS_UPDATED` with the changed keys.

Custom field definitions: `GET /api/crm/custom-fields` (any), `POST`, `PATCH /api/crm/custom-fields/[id]` (label, options, position), `DELETE` (deactivate) — manage only. `type` and `key` are immutable. Audit `LEAD_CUSTOM_FIELD_CREATED/UPDATED/DEACTIVATED`.

## D8. Read model

`LeadDetail` gains `tags`, `estimatedValue` and `probability`; custom values are read from `GET /api/leads/[id]/crm-fields`. `LeadCard` gains `tags` and `estimatedValue`. Stage options for the filters come from `GET /api/crm/stages` (the funnel-columns API is admin-only).

## D9. UI

- `Leads` tab enabled behind `crm_lead_table`: `LeadsTable` (search box, multi-select filters, sortable headers, pager, totals line, "Exportar CSV"), `SavedViewsBar` (apply, save current, delete; rename is API-only for now). The owner filter is API-only in this phase. Row click opens the shared detail sheet. Table state ↔ URL (`?tab=leads&q=…`).
- Detail sheet section "Datos del CRM" behind `crm_lead_fields`: value, probability, tags picker, custom fields; read-only for CONSULTOR.
- Managers: "Configurar" dialog in the Leads tab with two lists (tags, custom fields).
- Hooks use `AsyncState<T>`; components never call `fetch`.
