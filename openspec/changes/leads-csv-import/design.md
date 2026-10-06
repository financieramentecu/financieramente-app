# Design: Leads CSV Import on /admin/lead-funnel-columns

## Technical Approach

A sibling service `lead-csv-import.service.ts` owns the import loop; `lead-sync.service.ts` is not touched. The service reuses `resolveOwner` and `buildLeadUpsertData` as-is, and reuses `resolveOutcomeStatus` **only** for its WON lock — it is called with an already-validated status, so its lenient `unresolved → OPEN` branch is unreachable by construction. Strictness lives in two NEW pure functions plus a strict Zod row schema, so webhook leniency cannot leak into the import path. CSV bytes are parsed in the browser with the existing `readWorkbookFromFile` (UTF-8 decoding for Spanish accents); the route receives JSON rows and re-validates everything server-side.

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Service placement | New `lead-csv-import.service.ts` | Extend `upsertLeadFromCrm` with a `strict` flag | A flag makes the lenient path one boolean away from the import; separate call sites make the leak impossible. |
| Partial reuse of `resolveOutcomeStatus` | Call it only after `parseLeadOutcomeStatus` has accepted the raw value | Duplicate the WON lock; fork the resolver | The lock is the only shared semantic. Feeding it a validated value makes `unresolved` structurally always `false`; a unit test asserts this invariant instead of relying on prose. |
| Funnel column resolution | Pure `resolveFunnelColumnByName(name, columns)` over a Map preloaded once per import | Reuse `resolveFunnelColumn` (DB + `normalizeFunnelStatusKey` + `Sin mapear` fallback); per-row query | Exact case-sensitive match on `LeadFunnelColumn.name`, no fallback, no `normalizeFunnelStatusKey`, and one query instead of ~300. |
| CSV parsing | Client-side `readWorkbookFromFile` (reused as-is) + NEW `parseLeadCsvFile` header/row extractor; POST `application/json` rows | Server multipart + streaming parse | Matches the `load-file` precedent (UTF-8 decode already solved there); avoids multipart handling in a route. Client parsing is transport only — validity is decided server-side. |
| Template download | `GET` returns a plain-text string with `Content-Disposition` | `xlsx-js-style` workbook like `/api/negocios/export` | Headers only, no formatting; adding a workbook dependency buys nothing. |
| In-file duplicates | `Set<string>` of seen `id_externo_crm`, checked before any DB call | Let the upsert win last-write | Deterministic, reported per row, zero wasted writes. |
| Import shape | Synchronous single request, row-level tolerance | `FileImport` tracking model + batching + polling | ~300 rows; the proposal declared batching out of scope. |

## Data Flow

    LeadCsvImportPanel ──file──→ readWorkbookFromFile ──→ parseLeadCsvFile (rows[])
             │                                                     │
             │                                              POST /api/leads/csv-import
             ▼                                                     ▼
      summary/errors table ←── LeadCsvImportSummary ←── importLeadsFromCsv(rows, actor)
                                                                   │
             preload active LeadFunnelColumn[] ───────────────────┘
                                                                   │
     per row: zodSchema → resolveFunnelColumnByName → parseLeadOutcomeStatus
              → resolveOwner → resolveOutcomeStatus (WON lock) → buildLeadUpsertData
              → prisma.lead.upsert({ where: { externalCrmId } }) → logAuditEvent

## File Changes

| File | Action | Description |
|---|---|---|
| `src/features/leads/lib/lead-csv-template.ts` | Create | `LEAD_CSV_HEADERS` (10, fixed order) + template string; shared by route and client validation |
| `src/features/leads/lib/resolve-funnel-column-by-name.ts` | Create | Pure exact case-sensitive match against `LeadFunnelColumn.name` |
| `src/features/leads/lib/parse-lead-outcome-status.ts` | Create | Pure strict parser: returns `LeadOutcomeStatus` or a rejection reason, never `OPEN` by default |
| `src/features/leads/lib/parse-lead-csv-file.ts` | Create | Header check + row objects from the workbook returned by `readWorkbookFromFile` |
| `src/features/leads/lib/map-csv-row-to-lead-payload.ts` | Create | CSV row → `CrmSyncPayload` shape consumed by `buildLeadUpsertData` |
| `src/features/leads/types/lead-csv-import.schema.ts` | Create | Zod row schema (10 columns) + `LeadCsvRow` type |
| `src/features/leads/types/lead-csv-import.types.ts` | Create | Summary DTOs |
| `src/features/leads/services/lead-csv-import.service.ts` | Create | Row loop, upsert, summary accumulation, audit calls |
| `src/app/api/leads/csv-import/route.ts` | Create | POST; auth pattern of `funnel-columns/route.ts` widened to ADMIN + ASISTENTE_GERENCIA_OPERATIVA |
| `src/app/api/leads/csv-template/route.ts` | Create | GET plain-text template, same authorization set |
| `src/features/leads/hooks/use-lead-csv-import.ts` | Create | `AsyncState<LeadCsvImportSummary>` |
| `src/features/leads/components/lead-csv-import-panel.tsx` | Create | Download button + file input + results/rejections tables |
| `src/app/dashboard/admin/lead-funnel-columns/page.tsx` | Modify | Mounts the panel above the columns table |
| `src/features/auth/lib/audit-logger.ts` | Modify | Add `LEAD_CSV_IMPORT_STARTED`, `LEAD_CSV_IMPORT_COMPLETED`, `LEAD_CSV_ROW_REJECTED` |

## Interfaces / Contracts

```ts
export interface LeadCsvRejectedRow { rowNumber: number; externalCrmId?: string; reason: string }
export interface LeadCsvOwnerlessLead { rowNumber: number; externalCrmId: string; ownerEmail: string }
export interface LeadCsvWonLockedLead { rowNumber: number; externalCrmId: string; attemptedStatus: string }
export interface LeadCsvImportSummary {
  totalRows: number
  imported: number      // created + updated
  created: number
  updated: number
  rejected: LeadCsvRejectedRow[]
  ownerlessLeads: LeadCsvOwnerlessLead[]
  wonLockedLeads: LeadCsvWonLockedLead[]
}
```

`rowNumber` is the 1-based spreadsheet line (header = 1, first data row = 2). Response body is `ApiResponse<LeadCsvImportSummary>`; a file with zero valid rows is still `200` with an all-rejected summary — only auth, malformed body, or headers mismatch return non-2xx. `fecha_creacion` (`YYYY-MM-DD`) converts via `dateOnlyToBogotaNoonUtc()`; the audit actor is `session.user.email` with `userId`, `getClientIp`, `getUserAgent`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `resolveFunnelColumnByName` rejects case/whitespace variants and never falls back; `parseLeadOutcomeStatus` rejects unknown values instead of `OPEN`; `parseLeadCsvFile` header order/UTF-8; row schema | Vitest, pure functions, no mocks |
| Unit | Service: in-file duplicate rejection, ownerless list, WON-lock list, `unresolved` never true, omitted fields preserved | Vitest with mocked `prisma` + `logAuditEvent` |
| Integration | Route auth matrix (ADMIN/ASISTENTE ok, others 403, no session 401), mixed-validity payload summary, template headers + `Content-Disposition` | Route handler tests mirroring `funnel-columns` tests |
| E2E | Optional: download template, upload mixed file, see summary on `/admin/lead-funnel-columns` | Playwright, only if the existing leads suite is extended |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. File input is parsed as text only; no file is persisted or executed.

## Migration / Rollout

No migration required. Purely additive; `prisma/schema.prisma` and `prisma/ERD.md` unchanged. Depends on `LeadFunnelColumn` rows already carrying the exact names operators will type.

## Amendment A — Owner Name Fallback (`propietario_nombre`)

The real CRM export only carries the assignee's NAME (`asignado`, e.g. `Yohan España`), never an email, so with an email-only resolver no lead imported from a real export would ever get an owner. A name fallback is added as the SECOND option, kept strictly exact so the "never assign wrong silently" guarantee holds.

### Amendment decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Where the fallback lives | New pure `resolveOwnerByName(name, activeUsers)` in `src/features/leads/lib/resolve-owner-by-name.ts`, orchestrated by `importLeadsFromCsv` | Extend `resolveOwner` in `lead-sync.service.ts`; add a `byName` flag to it | `resolveOwner` is shared with the webhook; the webhook must not gain name-based assignment. A separate pure function keeps the fallback import-only and unit-testable without Prisma. |
| Name matching strength | Exact match over normalized values only | `contains`, prefix, Levenshtein/similarity, first-name-only | Any fuzzy rule can silently assign a lead to the wrong asesor. Non-match and ambiguity both fall through to ownerless, which is recoverable; a wrong owner is not. |
| Normalization | `normalizePersonName` in `src/features/leads/lib/normalize-person-name.ts`, mirroring the `normalize-funnel-status-key.ts` precedent | Reuse `normalizeFunnelStatusKey` (uppercase + `_`); plain `toLowerCase()` | Accents are the documented real-world failure here (`España` vs `Espana`); the funnel-key normalizer is diacritic-blind and shape-wrong for names. |
| Active-user lookup | Preload `prisma.user.findMany({ where: { active: true }, select: { idUser, name, lastName } })` once per import, exactly like `activeColumns` | Per-row query; raw SQL `CONCAT` + `ILIKE` | Prisma cannot match a computed `name + ' ' + lastName` natively. One query instead of ~300, and it keeps ambiguity detection (count of candidates) trivially available in memory. |
| Ambiguity handling | Report `NAME_AMBIGUOUS` with `candidateCount`, import ownerless | Pick the first/lowest `idUser`; reject the row | Rejecting loses a valid lead; picking one breaks the guarantee. Reporting tells the admin exactly what to fix. |
| Template compatibility | Single canonical 11-header set; 10-header files are rejected whole-file | Accept 10 or 11 headers | The feature has not shipped (no 10-column files in the wild), and one canonical header set keeps `lead-csv-template.ts` the single source of truth for the route, `parseLeadCsvFile`, and the Zod schema. |
| Ownerless summary shape | Extend `LeadCsvOwnerlessLead` with a `reason` discriminator (+ optional `ownerName`, `candidateCount`) and make `ownerEmail` optional | A second parallel list (`ambiguousOwnerLeads[]`) | One list, one place for the UI to look; the reason code tells the admin *what* to correct instead of lumping four different failures together. |

### Owner resolution order in `importLeadsFromCsv`

```
existing = prisma.lead.findUnique(...)              // already fetched today
emailResolved = await resolveOwner(row.propietario_correo)   // unchanged
   //  number  -> assigned      undefined -> preserve      null -> clear

if emailResolved is a number        -> use it, no ownerless entry
else if propietario_nombre is blank -> ownerlessReason =
        emailResolved === null ? 'EMAIL_UNMATCHED'
      : !existing?.idUser          ? 'NO_OWNER_PROVIDED' : none
else switch resolveOwnerByName(propietario_nombre, activeUsers):
      matched   -> ownerId = idUser (overrides the failed email result)
      unmatched -> keep emailResolved, reason 'NAME_UNMATCHED'
      ambiguous -> keep emailResolved, reason 'NAME_AMBIGUOUS' (+ candidateCount)
```

Keeping `emailResolved` on the failure branches preserves today's semantics exactly: an empty email stays `undefined` (existing owner preserved — a name typo never clears an owner), a present-but-unmatched email stays `null` (owner cleared, unchanged behavior).

### Interfaces

```ts
// src/features/leads/lib/normalize-person-name.ts
export function normalizePersonName(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '') // COMBINING_MARKS: global regex over the
                                  // combining-diacritical-marks block
                                  // (U+0300 through U+036F) -> "España" becomes "Espana"
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// src/features/leads/lib/resolve-owner-by-name.ts
export interface ActiveUserForNameMatch { idUser: number; name: string; lastName: string | null }
export type ResolveOwnerByNameResult =
  | { status: 'matched'; idUser: number }
  | { status: 'unmatched' }
  | { status: 'ambiguous'; candidateCount: number }
// candidate full name = normalizePersonName(`${name} ${lastName ?? ''}`)

// src/features/leads/types/lead-csv-import.types.ts (MODIFIED)
export type LeadCsvOwnerlessReason =
  | 'EMAIL_UNMATCHED'    // correo presente sin match, sin nombre suministrado
  | 'NAME_UNMATCHED'     // nombre suministrado, cero coincidencias
  | 'NAME_AMBIGUOUS'     // nombre suministrado, N > 1 coincidencias
  | 'NO_OWNER_PROVIDED'  // ambas columnas vacías y el lead queda sin dueño
export interface LeadCsvOwnerlessLead {
  rowNumber: number
  externalCrmId: string
  reason: LeadCsvOwnerlessReason
  ownerEmail?: string
  ownerName?: string
  candidateCount?: number
}
```

### Amendment file changes

| File | Action | Description |
|---|---|---|
| `src/features/leads/lib/normalize-person-name.ts` | Create | NFD + diacritic strip + lowercase + collapse whitespace |
| `src/features/leads/lib/resolve-owner-by-name.ts` | Create | Pure exact normalized full-name match; matched / unmatched / ambiguous |
| `src/features/leads/lib/lead-csv-template.ts` | Modify | Append `propietario_nombre` as the 11th header |
| `src/features/leads/types/lead-csv-import.schema.ts` | Modify | Add `propietario_nombre: z.string().optional()` |
| `src/features/leads/types/lead-csv-import.types.ts` | Modify | `LeadCsvOwnerlessReason` + reshaped `LeadCsvOwnerlessLead` |
| `src/features/leads/services/lead-csv-import.service.ts` | Modify | Preload active users; email-then-name fallback; reasoned ownerless entries |
| `src/features/leads/components/lead-csv-import-panel.tsx` | Modify | Render the ownerless reason (Spanish copy) per entry |
| `src/features/leads/lib/map-csv-row-to-lead-payload.ts` | Unchanged | `propietario_nombre` never reaches `CrmSyncPayload`/`buildLeadUpsertData` |
| `src/features/leads/services/lead-sync.service.ts` | Unchanged | Webhook owner resolution explicitly out of scope |

### Amendment testing strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `normalizePersonName`: accents, case, double/leading/trailing spaces | Vitest, pure |
| Unit | `resolveOwnerByName`: exact match, accent/case-insensitive match, null `lastName`, zero matches, 2+ matches → `ambiguous` with count, partial name never matches | Vitest, pure, in-memory user fixtures |
| Unit | Service: email match wins over name; email fails + name matches → assigned; name ambiguous → ownerless with reason + count; both empty on create → `NO_OWNER_PROVIDED`; both empty on an owned existing lead → preserved and not listed | Vitest with mocked `prisma` + `logAuditEvent` |
| Unit | Template: 11 headers, `propietario_nombre` last; 10-header file rejected whole-file | Vitest, pure |
| Unit | Panel renders a distinct label per ownerless reason | Testing Library with a mocked summary |

## Open Questions

- [ ] Client-side row-count/size cap before upload (proposal documents a practical ceiling; the exact number is a tasks-phase choice).
- [ ] Whether `LEAD_CSV_ROW_REJECTED` logs one entry per rejected row or one aggregate entry per import (~300 rows could flood `AuditLog`).
- [ ] Whether duplicate normalized full names among active users should surface as a standing data-quality warning outside the import (out of scope here; the import only reports it per row).
