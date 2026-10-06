# Proposal: Leads CSV Import on /admin/lead-funnel-columns

## Intent

Leads only enter the system through the CRM webhook (`POST /api/leads/crm-sync`). There is no way for operations staff to load a curated batch of leads. This change adds a first-class CSV import using **our own template** (not the CRM export shape), so unknown funnel columns and states are rejected per row instead of silently falling back to `Sin mapear` / `OPEN` as the webhook does.

## Scope

### In Scope
- Downloadable static CSV template (10 headers, fixed order): `id_externo_crm, nombre, apellido, telefono, correo, columna_funnel, estado, fecha_creacion, origen, propietario_correo`.
- Synchronous import endpoint: upload → validate + upsert in one request → summary response (~300 rows typical).
- Row-level tolerance: valid rows import, invalid rows are rejected with row number + reason. Never all-or-nothing.
- Upsert by `id_externo_crm` reusing `buildLeadUpsertData` (omit = preserve) and the WON-lock from `resolveOutcomeStatus`.
- Strict, separate resolvers: exact case-sensitive match of `columna_funnel` against `LeadFunnelColumn.name`; unrecognized `estado` is a row error, not a normalization.
- Unmatched `propietario_correo` imports the lead ownerless and is listed explicitly in the summary.
- Authorization: `ADMIN` and `ASISTENTE_GERENCIA_OPERATIVA`.
- Audit logging via `logAuditEvent()` with the real importing user's email (never `crm-sync@system`); new `AuditAction` values for import started/completed and row rejections.
- UI entry point on `/admin/lead-funnel-columns`: download template + upload + summary panel.

### Out of Scope
- Dry-run / preview-before-confirm step (explicitly declined).
- `FileImport`-style tracking model, batching, or progress polling (over-engineering at this volume).
- Import history screen or any new Prisma model/migration.
- Changing webhook (`lead-sync.service.ts`) behavior or the CRM template shape.
- Re-upload-only-rejected-rows flow; export of leads.

## Amendment A — Owner Name Fallback (`propietario_nombre`)

Approved after v1 was implemented; it widens the scope above rather than replacing it.

**Problem**: the real CRM export only carries the assignee's NAME (column `asignado` in `docs/leads/leads_reference.csv`), never an email. With an email-only resolver, no lead imported from a real export would ever get an owner automatically.

**Change**:
- The template gains an 11th, optional, last column: `propietario_nombre` (10 → 11 headers).
- Owner resolution becomes email-first, name-second: `propietario_correo` matched against active `User.email` as today; if it is empty or unmatched, `propietario_nombre` is matched EXACTLY against the normalized `User.name + " " + User.lastName` of active users (trim, collapse whitespace, lowercase, strip diacritics).
- Exactly one name match assigns the owner. Zero matches or more than one (ambiguous) import the lead ownerless — never a guessed assignment, never fuzzy/partial matching.
- The summary's ownerless list gains a machine-readable reason (`EMAIL_UNMATCHED`, `NAME_UNMATCHED`, `NAME_AMBIGUOUS` with candidate count, `NO_OWNER_PROVIDED`) so the admin knows what to correct.

**Still out of scope**: any change to `resolveOwner` or the webhook path in `lead-sync.service.ts`; fuzzy/similarity name matching; backward compatibility with the 10-header template (the feature has not shipped).

**Additional risk**: two active users sharing a normalized full name make that name permanently ambiguous for import; mitigated by reporting the candidate count per row instead of silently choosing one.

**Additional success criteria**:
- [ ] Template downloads with 11 headers, `propietario_nombre` last.
- [ ] A row with only `propietario_nombre` matching exactly one active user imports with that owner assigned.
- [ ] A row whose `propietario_nombre` is ambiguous or unmatched imports ownerless with the reason reported.

## Capabilities

### New Capabilities
- `leads-csv-import`: template download, CSV row validation rules, strict resolvers, upsert semantics, per-row rejection reporting, authorization, and audit trail.

### Modified Capabilities
- `lead-funnel-columns`: page gains the template download and import entry point, and its route authorization widens beyond `ADMIN` for the new endpoints.

## Approach

Add a sibling `lead-csv-import.service.ts` in `src/features/leads/services/` rather than extending `lead-sync.service.ts`, so the webhook's lenient behavior can never leak into the import path. Reuse from the CRM sync path **as-is**: `resolveOwner`, `buildLeadUpsertData`, and `resolveOutcomeStatus` (only for the WON lock). Write **new** strict pure functions in `src/features/leads/lib/`: an exact-name funnel column resolver (no `normalizeFunnelStatusKey`, no fallback column) and a strict `estado` parser that fails closed. A Zod schema validates each row; the service loops rows, accumulating `imported` / `rejected[]` / `ownerless[]`. The template endpoint returns plain text with `Content-Disposition: attachment` — no `xlsx` dependency. CSV parsing follows the `load-file` precedent for explicit UTF-8 decoding (Spanish headers).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/leads/services/lead-csv-import.service.ts` | New | Row loop, upsert, summary accumulation, audit calls |
| `src/features/leads/lib/` | New | Strict funnel-column resolver + strict outcome-status parser |
| `src/features/leads/types/` | New | Zod row schema + import summary DTOs |
| `src/app/api/leads/csv-import/route.ts` | New | POST import (ADMIN + ASISTENTE_GERENCIA_OPERATIVA) |
| `src/app/api/leads/csv-template/route.ts` | New | GET static CSV template download |
| `src/features/leads/components/` | New | Import panel + summary/rejections table |
| `src/app/dashboard/admin/lead-funnel-columns/page.tsx` | Modified | Mounts the import panel |
| `src/features/auth/lib/audit-logger.ts` | Modified | New `AuditAction` values for the import flow |
| `prisma/schema.prisma` | Unchanged | No migration; `Lead` already covers every template field |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Webhook leniency leaks into import (fallback column / silent OPEN) | Med | Separate service + separate strict resolvers; unit tests asserting rejection, never fallback |
| Case-sensitive `columna_funnel` causes mass rejections from trivial typos | Med | Template ships headers only; summary names the exact expected column values per rejected row |
| ~300-row synchronous request nears request timeout | Low | Single request, no per-row transaction nesting; document the practical row ceiling in the spec |
| WON lock silently ignores an intended downgrade | Med | Report locked rows explicitly in the summary rather than as a silent no-op |
| Duplicate `id_externo_crm` within one file | Med | Detect in-file duplicates and reject the later occurrence with a clear reason |

## Rollback Plan

Pure additive change with no migration. Revert the feature commit(s): the new routes, service, lib functions, components, and the `AuditAction` additions disappear; `lead-funnel-columns` page returns to its previous state. Existing leads created via import remain valid rows (indistinguishable from webhook-created leads) and need no data cleanup.

## Dependencies

- Seeded `LeadFunnelColumn` rows must exist with the exact names operators will type in `columna_funnel`.
- `ASISTENTE_GERENCIA_OPERATIVA` role present in `src/features/auth/lib/roles.ts` (confirmed).

## Success Criteria

- [ ] Template downloads with the 10 headers in the specified order.
- [ ] A mixed-validity file imports the valid rows and returns per-row reasons for rejected ones.
- [ ] Re-importing the same `id_externo_crm` updates rather than duplicating, and omitted fields are preserved.
- [ ] A row whose `estado` is unrecognized is rejected — never normalized to `OPEN`.
- [ ] A row whose `columna_funnel` does not exactly match a `LeadFunnelColumn.name` is rejected — never routed to `Sin mapear`.
- [ ] Leads with unmatched `propietario_correo` import ownerless and are listed in the summary.
- [ ] `ADMIN` and `ASISTENTE_GERENCIA_OPERATIVA` can import; other roles receive 403.
- [ ] `AuditLog` entries carry the importing user's real email.
- [ ] At archive: `CHANGELOG.md` entry added and `package.json` bumped MINOR (1.34.1 → 1.35.0).
