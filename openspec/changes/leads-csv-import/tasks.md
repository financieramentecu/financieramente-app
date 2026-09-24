# Tasks: Leads CSV Import on /admin/lead-funnel-columns

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~950-1100 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 -> PR 2 -> PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Strict pure resolvers + schema + template lib, fully unit-tested | PR 1 (base: feature/leads-csv-import) | `npm run test:unit -- lead-csv` | N/A — pure functions, no route/DB | Delete `src/features/leads/lib/lead-csv-*.ts`, `resolve-funnel-column-by-name.ts`, `parse-lead-outcome-status.ts`, `map-csv-row-to-lead-payload.ts`, `types/lead-csv-import.*` |
| 2 | Service + routes + audit wiring | PR 2 (base: PR 1 branch) | `npm run test:unit -- lead-csv-import.service` && `npm run test:integration -- csv-import` | `curl -X POST localhost:3000/api/leads/csv-import` with a seeded ADMIN session | Delete `lead-csv-import.service.ts` and the two route files; revert `audit-logger.ts` additions |
| 3 | UI panel + page wiring + e2e | PR 3 (base: PR 2 branch) | `npm run test:unit -- lead-csv-import-panel` | `npm run dev` then visit `/admin/lead-funnel-columns` and run the import flow manually | Delete `lead-csv-import-panel.tsx`, `use-lead-csv-import.ts`; revert page.tsx mount |
| 4 | Amendment A: `propietario_nombre` owner fallback (pure fns + template/schema/DTOs + service + UI reasons) | PR 4 (base: PR 3 branch) | `npm run test:unit -- lead-csv` && `npm run test:unit -- resolve-owner-by-name normalize-person-name` | `npm run dev`, import a file whose rows carry only `propietario_nombre` | Delete `normalize-person-name.ts`, `resolve-owner-by-name.ts`; revert the 11th header, the schema field, the `LeadCsvOwnerlessLead` reshape, and the service/panel owner-fallback blocks |

## Phase 1: Foundation — Strict Pure Functions, Schema, Template (PR 1)

- [x] 1.1 RED: `src/features/leads/lib/__tests__/lead-csv-template.test.ts` — asserts `LEAD_CSV_HEADERS` has exactly the 10 headers in fixed order.
- [x] 1.2 GREEN: `src/features/leads/lib/lead-csv-template.ts` — export `LEAD_CSV_HEADERS` + template string builder.
- [x] 1.3 RED: `src/features/leads/lib/__tests__/resolve-funnel-column-by-name.test.ts` — exact match resolves; case mismatch rejects; whitespace variant rejects; unmatched name rejects listing valid names; asserts the module never imports/calls `normalizeFunnelStatusKey` and never returns a "Sin mapear" fallback column (source-inspection or spy-based assertion).
- [x] 1.4 GREEN: `src/features/leads/lib/resolve-funnel-column-by-name.ts` — pure `resolveFunnelColumnByName(name, columns)` over a `Map`, no DB call, no fallback.
- [x] 1.5 RED: `src/features/leads/lib/__tests__/parse-lead-outcome-status.test.ts` — 4 case-insensitive tokens (`open`,`won`,`lost`,`abandoned`) resolve; unrecognized value (e.g. `en_revision`) is rejected with the raw value named in the reason; asserts the function never returns `OPEN` as a default for an unrecognized input.
- [x] 1.6 GREEN: `src/features/leads/lib/parse-lead-outcome-status.ts` — pure strict parser returning `{ value: LeadOutcomeStatus }` or `{ rejected: true, reason }`, never `OPEN` by default.
- [x] 1.7 RED: `src/features/leads/lib/__tests__/parse-lead-outcome-status.test.ts` (invariant case) — asserts `resolveOutcomeStatus(...)` is only ever called downstream with an already-parsed `LeadOutcomeStatus` value, making its `unresolved: true` branch structurally unreachable on the import path. Implement as: call `resolveOutcomeStatus(parsed.value, current)` in a unit test and assert `unresolved === false` for every one of the 4 recognized tokens, documenting that an unrecognized raw never reaches this call in the import service (cross-checked again in 3.6).
- [x] 1.8 RED: `src/features/leads/lib/__tests__/parse-lead-csv-file.test.ts` — header order/count mismatch rejects the whole file (pre-row-loop); UTF-8 accented headers/values parse correctly; row objects map 1:1 to `LEAD_CSV_HEADERS` keys.
- [x] 1.9 GREEN: `src/features/leads/lib/parse-lead-csv-file.ts` — header check + row extraction from the workbook returned by `readWorkbookFromFile`.
- [x] 1.10 RED: `src/features/leads/types/__tests__/lead-csv-import.schema.test.ts` — valid row parses; offset-aware `fecha_creacion` (`2023-01-15T10:00:00-05:00`) accepts; naive `fecha_creacion` (`2023-01-15`) rejects; empty optional fields (`origen`, `propietario_correo`) accept as omit-preserve.
- [x] 1.11 GREEN: `src/features/leads/types/lead-csv-import.schema.ts` — Zod row schema (10 columns) + `LeadCsvRow` type.
- [x] 1.12 RED: `src/features/leads/lib/__tests__/map-csv-row-to-lead-payload.test.ts` — maps a `LeadCsvRow` to the `CrmSyncPayload` shape consumed by `buildLeadUpsertData`, preserving omit-means-preserve for empty optional fields.
- [x] 1.13 GREEN: `src/features/leads/lib/map-csv-row-to-lead-payload.ts`.
- [x] 1.14 GREEN: `src/features/leads/types/lead-csv-import.types.ts` — `LeadCsvRejectedRow`, `LeadCsvOwnerlessLead`, `LeadCsvWonLockedLead`, `LeadCsvImportSummary` DTOs per design.

## Phase 2: Core Implementation — Service, Routes, Audit (PR 2)

- [x] 2.1 RED: `src/features/auth/lib/__tests__/audit-logger.test.ts` (extend) — `AuditAction` enum includes `LEAD_CSV_IMPORT_STARTED`, `LEAD_CSV_IMPORT_COMPLETED`, `LEAD_CSV_ROW_REJECTED`.
- [x] 2.2 GREEN: `src/features/auth/lib/audit-logger.ts` — add the 3 new `AuditAction` values.
- [x] 2.3 RED: `src/features/leads/services/__tests__/lead-csv-import.service.test.ts` (scenario: mixed-validity file) — 5 rows, 2 invalid; asserts 3 imported, 2 rejected with row number + reason, no all-or-nothing rollback (row 2 persists despite row 5 rejection). (Spec: Row-Level Tolerance, No All-or-Nothing Transaction)
- [x] 2.4 RED: same file (scenario: in-file duplicate) — row 3 and row 7 share `id_externo_crm`; row 3 upserted, row 7 rejected naming duplicate-in-file. (Spec: In-File Duplicate Detection)
- [x] 2.5 RED: same file (scenario: unrecognized estado never falls back) — row with `estado="en_revision"` is rejected naming the value; asserts no lead is created/updated from that row with `outcomeStatus="OPEN"`. (Spec: Strict estado Resolution)
- [x] 2.6 RED: same file (scenario: unmatched columna_funnel never falls back) — row with `columna_funnel="Etapa Inexistente"` is rejected listing valid active column names; asserts no lead is assigned to a "Sin mapear"/default column. (Spec: Strict columna_funnel Resolution)
- [x] 2.7 RED: same file (scenario: WON lock reported, not silent) — existing lead `outcomeStatus="WON"`, row carries `estado="lost"`; row succeeds (not rejected), `outcomeStatus` stays `WON`, summary lists it in `wonLockedLeads`. (Spec: WON Outcome Status Lock)
- [x] 2.8 RED: same file (scenario: unmatched owner imports ownerless) — `propietario_correo` matches no active `User`; row succeeds, `ownerId` is null, summary lists it in `ownerlessLeads`. (Spec: Unmatched propietario_correo)
- [x] 2.9 RED: same file (scenario: upsert with preserve) — re-import of existing `id_externo_crm` updates `telefono`; a separate re-import row with empty `origen` preserves the previously stored `origen`. (Spec: Upsert With Partial Merge)
- [x] 2.10 RED: same file (scenario: audit uses real user, not crm-sync@system) — asserts every `logAuditEvent` call in the import path carries the importing user's real email and never `'crm-sync@system'`, and that start/completed/row-rejection entries are all recorded. (Spec: Audit Logging)
- [x] 2.11 RED: same file (invariant: unresolved is structurally unreachable) — spies/asserts `resolveOutcomeStatus` is invoked only with values already accepted by `parseLeadOutcomeStatus`, so its `unresolved` result is always `false` for every row processed by the service (covers the design's D-decision as an executable invariant, not prose).
- [x] 2.12 GREEN: `src/features/leads/services/lead-csv-import.service.ts` — `importLeadsFromCsv(rows, actor)`: preload active `LeadFunnelColumn[]`; per-row `zodSchema -> resolveFunnelColumnByName -> parseLeadOutcomeStatus -> resolveOwner -> resolveOutcomeStatus (WON lock only) -> buildLeadUpsertData -> prisma.lead.upsert -> logAuditEvent`; accumulate `imported/created/updated/rejected/ownerlessLeads/wonLockedLeads`; in-file duplicate `Set<string>` check before any DB call.
- [x] 2.13 RED: `src/app/api/leads/__tests__/csv-template.route.test.ts` — GET returns exactly the 10 headers, one line, `Content-Disposition: attachment`; ADMIN/ASISTENTE_GERENCIA_OPERATIVA succeed; other authenticated roles get 403; no session gets 401. (Spec: Template Download, Authorization)
- [x] 2.14 GREEN: `src/app/api/leads/csv-template/route.ts` — GET, plain-text response, auth pattern from `funnel-columns/route.ts` widened to ADMIN + ASISTENTE_GERENCIA_OPERATIVA.
- [x] 2.15 RED: `src/app/api/leads/__tests__/csv-import.route.test.ts` — POST with mixed-validity JSON rows returns `ApiResponse<LeadCsvImportSummary>` with `200` even when all rows are rejected; ADMIN/ASISTENTE_GERENCIA_OPERATIVA succeed; other roles 403; no session 401; malformed body 400. (Spec: Authorization, Row-Level Tolerance)
- [x] 2.16 GREEN: `src/app/api/leads/csv-import/route.ts` — POST, session + role check, delegates to `importLeadsFromCsv` with `{ userId, email: session.user.email, ipAddress: getClientIp(...), userAgent: getUserAgent(...) }`.

## Phase 3: UI Integration (PR 3)

- [x] 3.1 RED: `src/features/leads/hooks/__tests__/use-lead-csv-import.test.ts` — `AsyncState<LeadCsvImportSummary>` transitions idle -> loading -> success/error around the download+upload calls.
- [x] 3.2 GREEN: `src/features/leads/hooks/use-lead-csv-import.ts`.
- [x] 3.3 RED: `src/features/leads/components/__tests__/lead-csv-import-panel.test.tsx` — renders download + upload controls; after a mocked upload response, renders rejected rows (row number + reason), ownerless leads, and WON-locked leads distinctly from successfully imported rows. (Spec: `lead-funnel-columns` — Import Summary Panel scenario)
- [x] 3.4 GREEN: `src/features/leads/components/lead-csv-import-panel.tsx`.
- [x] 3.5 GREEN: `src/app/dashboard/admin/lead-funnel-columns/page.tsx` — mount `LeadCsvImportPanel` above the columns table, visible to ADMIN and ASISTENTE_GERENCIA_OPERATIVA per the widened route authorization (column CRUD stays ADMIN-only, unaffected).
- [x] 3.6 Verify: run the full `lead-csv-import` unit + integration suite and confirm every one of the 10 spec scenarios (duplicate-in-file, invalid estado, unmatched columna_funnel, WON lock reported, unmatched owner, upsert-with-preserve, invalid fecha_creacion, 403 by role, template exact headers, row-by-row tolerance) has a passing dedicated test, and that no test anywhere in `src/features/leads/` imports `normalizeFunnelStatusKey` from the CSV-import path.
- [ ] 3.7 Optional E2E: extend the leads Playwright suite — download template, upload a mixed file on `/admin/lead-funnel-columns`, assert the summary panel content. (Skipped — explicitly optional; full unit/integration coverage already validates all spec scenarios per 3.6.)

## Phase 5: Amendment A — Owner Name Fallback (`propietario_nombre`) (PR 4)

Amendment approved after Phases 1-3 shipped to the branch. Strict TDD, same RED/GREEN pattern. Estimated changed lines ~280-340 — under the 400-line budget as its own PR (base: PR 3 branch).

### 5a. Pure functions

- [x] 5.1 RED: `src/features/leads/lib/__tests__/normalize-person-name.test.ts` — `"España"` and `"Espana"` normalize equal; `"YOHAN espana"` equals `"yohan espana"`; `"  Juan   Pérez  "` collapses to `"juan perez"`; already-normalized input is idempotent.
- [x] 5.2 GREEN: `src/features/leads/lib/normalize-person-name.ts` — `normalizePersonName(value)`: NFD → strip combining marks (U+0300–U+036F) → lowercase → collapse whitespace → trim. Mirrors the `normalize-funnel-status-key.ts` precedent; does NOT reuse it.
- [x] 5.3 RED: `src/features/leads/lib/__tests__/resolve-owner-by-name.test.ts` (match cases) — exact full-name match returns `{ status: 'matched', idUser }`; accent-insensitive match (`"Yohan Espana"` vs stored `"Yohan"/"España"`) matches; case-insensitive and extra-whitespace variants match; a user with `lastName = null` matches on the first name alone.
- [x] 5.4 RED: same file (fail-closed cases) — zero matches returns `{ status: 'unmatched' }`; two or more matches return `{ status: 'ambiguous', candidateCount: N }` and NEVER a matched user; a partial name (`"Yohan"` against `"Yohan España"`) returns `unmatched`, asserting no `contains`/prefix/similarity behavior; an empty/whitespace-only name returns `unmatched`.
- [x] 5.5 GREEN: `src/features/leads/lib/resolve-owner-by-name.ts` — pure `resolveOwnerByName(name, activeUsers: ActiveUserForNameMatch[])` comparing `normalizePersonName(name)` against `normalizePersonName(\`${u.name} ${u.lastName ?? ''}\`)`; no Prisma import; exports `ActiveUserForNameMatch` and `ResolveOwnerByNameResult`. (Spec: Owner Resolution Order)

### 5b. Template, schema, DTOs

- [x] 5.6 RED: `src/features/leads/lib/__tests__/lead-csv-template.test.ts` (extend) — `LEAD_CSV_HEADERS` has exactly 11 entries in fixed order with `propietario_nombre` last; `buildLeadCsvTemplate()` emits those 11 headers on one line. (Spec: CSV Template Download)
- [x] 5.7 RED: `src/features/leads/lib/__tests__/parse-lead-csv-file.test.ts` (extend) — a file carrying only the previous 10 headers is rejected whole-file with a reason naming the 11 expected headers; an 11-header file maps `propietario_nombre` into each row object. (Spec: CSV Template Download — missing-header scenario)
- [x] 5.8 GREEN: `src/features/leads/lib/lead-csv-template.ts` — append `'propietario_nombre'` to `LEAD_CSV_HEADERS`. No change needed in `parse-lead-csv-file.ts` (it derives from the constant) — confirm via 5.7.
- [x] 5.9 RED: `src/features/leads/types/__tests__/lead-csv-import.schema.test.ts` (extend) — a row with a non-empty `propietario_nombre` parses; an empty/absent `propietario_nombre` parses as omit-preserve; `propietario_nombre` is never required.
- [x] 5.10 GREEN: `src/features/leads/types/lead-csv-import.schema.ts` — add `propietario_nombre: z.string().optional()`.
- [x] 5.11 GREEN: `src/features/leads/types/lead-csv-import.types.ts` — add `LeadCsvOwnerlessReason` (`EMAIL_UNMATCHED` | `NAME_UNMATCHED` | `NAME_AMBIGUOUS` | `NO_OWNER_PROVIDED`); reshape `LeadCsvOwnerlessLead` to `{ rowNumber, externalCrmId, reason, ownerEmail?, ownerName?, candidateCount? }` per design Amendment A.
- [x] 5.12 GREEN: `src/features/leads/lib/map-csv-row-to-lead-payload.ts` — verify unchanged: `propietario_nombre` MUST NOT leak into `CrmSyncPayload`/`buildLeadUpsertData`. Add an assertion to its existing test that the mapped payload has no name-owner field.

### 5c. Service integration

- [x] 5.13 RED: `src/features/leads/services/__tests__/lead-csv-import.service.test.ts` (extend — email wins) — row with a matching `propietario_correo` AND a `propietario_nombre` naming a DIFFERENT active user; asserts the email-matched user is assigned and `resolveOwnerByName` is not consulted for assignment. (Spec: Owner Resolution Order, scenario 1)
- [x] 5.14 RED: same file (empty email + single name match) — `propietario_correo` empty, `propietario_nombre = "  yohan   espana "`, one active user `Yohan España`; asserts the upsert writes that `idUser` and the lead is NOT in `ownerlessLeads`. (Spec: Owner Resolution Order, scenario 2)
- [x] 5.15 RED: same file (unmatched email + name match) — `propietario_correo` matches no user, `propietario_nombre` matches exactly one; asserts the name-matched `idUser` is assigned, overriding the `null` email result. (Spec: Owner Resolution Order, scenario 3)
- [x] 5.16 RED: same file (ambiguous name) — two active users normalizing to `"juan perez"`; row imports successfully, no `idUser` is written from the name, and `ownerlessLeads` carries `{ reason: 'NAME_AMBIGUOUS', ownerName, candidateCount: 2 }`. (Spec: Ambiguous name never assigns an owner)
- [x] 5.17 RED: same file (unmatched name) — `propietario_nombre` matches nobody; row imports ownerless with `reason: 'NAME_UNMATCHED'` echoing the supplied name.
- [x] 5.18 RED: same file (unmatched email, no name) — `propietario_correo` present-unmatched with `propietario_nombre` empty; owner is cleared (`idUser: null`, unchanged pre-amendment behavior) and reported with `reason: 'EMAIL_UNMATCHED'` echoing the email.
- [x] 5.19 RED: same file (both empty, new lead) — no existing lead, both owner columns empty; lead is created without an owner and reported with `reason: 'NO_OWNER_PROVIDED'`.
- [x] 5.20 RED: same file (both empty, existing owned lead) — existing lead already has `idUser`; both owner columns empty; asserts `idUser` is NOT written to the upsert (preserve semantics intact) and the lead does NOT appear in `ownerlessLeads`. (Spec: Ownerless Leads Report the Reason, preserve scenario)
- [x] 5.21 RED: same file (no-clear-on-name-failure invariant) — `propietario_correo` empty, `propietario_nombre` unmatched, existing lead owned; asserts the stored owner is preserved (`idUser` absent from the upsert data), i.e. a name typo NEVER clears an owner.
- [x] 5.22 RED: same file (single preload query) — asserts `prisma.user.findMany` is called exactly once for a multi-row file (active users preloaded like `activeColumns`), not once per row.
- [x] 5.23 GREEN: `src/features/leads/services/lead-csv-import.service.ts` — preload `prisma.user.findMany({ where: { active: true }, select: { idUser: true, name: true, lastName: true } })` alongside `activeColumns`; implement the email-then-name resolution order and the reasoned `ownerlessLeads` entries exactly per design Amendment A. Do NOT touch `resolveOwner` or `lead-sync.service.ts`.
- [x] 5.24 RED: `src/features/leads/services/__tests__/lead-sync.service.test.ts` (extend — isolation guard) — asserts the webhook path never imports or invokes `resolveOwnerByName`, so name-based assignment stays exclusive to the CSV import. (Spec: resolution order is exclusive to the CSV import path)

### 5d. Route + UI

- [x] 5.25 RED: `src/app/api/leads/__tests__/csv-template.route.test.ts` (extend) — GET body carries the 11 headers ending in `propietario_nombre`. (Spec: CSV Template Download)
- [x] 5.26 RED: `src/app/api/leads/__tests__/csv-import.route.test.ts` (extend) — a POSTed row including `propietario_nombre` round-trips into the summary, and an ownerless entry serializes its `reason` (and `candidateCount` when ambiguous) in `ApiResponse<LeadCsvImportSummary>`.
- [x] 5.27 RED: `src/features/leads/components/__tests__/lead-csv-import-panel.test.tsx` (extend) — the ownerless list renders a DISTINCT Spanish label per reason: unmatched email (echoing the email), unmatched name (echoing the name), ambiguous name (echoing name + candidate count), and no owner supplied; asserts the four reasons are not collapsed into one generic message.
- [x] 5.28 GREEN: `src/features/leads/components/lead-csv-import-panel.tsx` — render the per-reason copy from `LeadCsvOwnerlessReason`; keep ownerless, rejected, and WON-locked sections visually distinct as today.
- [x] 5.29 Verify: run `npm run test:unit -- lead-csv` and `npm run test:unit -- resolve-owner-by-name normalize-person-name` plus `npm run test:integration -- csv-import`; confirm each Amendment A spec scenario has a dedicated passing test, that `lead-sync.service.ts` is untouched in the diff, and that no test asserts fuzzy/partial name matching anywhere.

## Phase 4: Archive-Time Only (do NOT run during apply)

- [ ] 4.1 [ARCHIVE-TIME] Update `CHANGELOG.md` with a new `## [1.35.0] - <archive-date>` entry (Agregado/Técnico sections, Spanish user copy) describing the CSV import feature, including the `propietario_nombre` owner fallback and the reasoned ownerless report from Amendment A.
- [ ] 4.2 [ARCHIVE-TIME] Bump `package.json` version `1.34.1` -> `1.35.0` (MINOR — new backward-compatible feature).
