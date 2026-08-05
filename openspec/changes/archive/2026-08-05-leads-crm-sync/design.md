# Design: Leads module — CRM sync + read-only Kanban funnel

## Technical Approach

New feature folder `src/features/leads/` mirroring `src/features/negocios/` (`components/`, `hooks/`, `lib/`, `services/`, `actions/`, `types/`, `mappers/`, `__tests__/`). All Prisma access lives in `services/`; route handlers only do HTTP + Zod + delegation and return `ApiResponse<T>`. Two new Prisma models (`Lead`, `LeadFunnelColumn`). Visibility reuses `getAccessibleUserIds()` / `HIERARCHY_BYPASS_ROLES` from `src/features/auth/lib/hierarchy.ts` (CTE version) — no third hierarchy implementation. The webhook is the codebase's first non-session inbound endpoint.

## Architecture Decisions

| # | Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|---|
| D1 | Webhook auth | `x-api-key` header compared with `crypto.timingSafeEqual` over SHA-256 digests of both values, secret in `LEADS_CRM_SYNC_API_KEY` env | HMAC signature; IP allowlist; NextAuth session | Proposal fixed API key; digest-then-compare avoids length leaks and timing oracles; `===` on secrets is the smell to avoid |
| D2 | Rate limiting | In-process `Map<string, number[]>` sliding window (timestamps pruned per request), 120 req/60s per key hash → `429` + `Retry-After` | Redis (unavailable); Postgres counter table | Single-instance deploy today; upgrade path documented in proposal |
| D3 | Idempotency | Prisma `upsert` on unique `externalCrmId`; no event table | `LeadSyncEvent` dedupe table; `externalUpdatedAt` guard | Last-write-wins accepted in proposal; `AuditLog` gives traceability |
| D4 | Partial merge | Build the `update` object by omitting keys whose incoming value is `undefined`, `null`, or empty-after-trim (pure `buildLeadUpsertData()` in `lib/`) | Zod `.default()`; `??` at write site | Keeps merge rule unit-testable without a DB and identical for every optional field, including `ownerEmail` |
| D5 | Owner resolution | Runs on every payload where `ownerEmail` is present/non-empty: `User.findFirst({ email, active: true })` → `ownerId` or `null` | Sticky owner; reject unmatched email | Proposal is explicit: no sticky owner, never reject; unmatched email → `ownerId: null` + `LEAD_OWNER_UNRESOLVED` audit entry |
| D6 | Unmapped status | Lookup `LeadFunnelColumn.externalStatusKey`; miss falls back to the seeded `__unmapped__` column | Reject payload; auto-create column | Board surfaces "Sin mapear" so admins map it; webhook must return 200 |
| D7 | Conversion entry point | "Convertir a negocio" is a **link** to the existing create-business page with `?leadId=<id>`; the user completes the remaining business fields in the existing form | A new simplified conversion form in `leads/`; a leads-owned Server Action that creates the `Business` itself | Confirmed with the user: do not duplicate or reinvent the business form. `createBusiness()` + `useBusinessForm` already own client upsert, commission lookup, `numAportes` and payment scheduling |
| D9 | Prefill mechanism | Reuse the **existing** `BusinessFormProps.defaultValues` prop already consumed by `useBusinessForm` (`src/features/negocios/hooks/use-business-form.ts:52-68`); the Server Component resolves the lead and passes mapped values down | Query params carrying the lead's contact data; client-side `useSearchParams()` prefill; new form-state API | The prop exists and already covers `name`/`lastNames`/`email`/`phone`/`identityNumber`. Only the numeric `leadId` travels in the URL, so no lead PII is exposed in browser history or referrers |
| D10 | Lead↔Business link | Optional `idLead` on `CreateBusinessInput`; inside the existing `prisma.$transaction` `createBusiness()` calls a leads-owned `linkLeadToBusinessTx(tx, idLead, idBusiness)` | Post-success `linkLeadToBusiness()` action from the wrapper; widening `onSubmit(data, createdBusiness)` | `onSubmit` currently receives only form data, so a post-hoc link is a second round trip that can fail and orphan the business. In-transaction linking is atomic and lets the "already converted" guard roll the business back. Leads logic stays in `src/features/leads/`, `createBusiness()` only forwards one optional id |
| D8 | Board reads | Server Component page + `GET /api/leads` returning columns with their leads (grouped server-side) | Client-side grouping of a flat list; one request per column | One round trip; grouping is domain logic and belongs in the service |

## Data Model

```prisma
model LeadFunnelColumn {
  idLeadFunnelColumn Int      @id @default(autoincrement()) @map("id_lead_funnel_column")
  name               String   @db.VarChar(120)
  externalStatusKey  String   @unique @map("external_status_key") @db.VarChar(150)
  position           Int      @default(0)
  isFallback         Boolean  @default(false) @map("is_fallback")
  active             Boolean  @default(true)
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")
  leads              Lead[]
  @@index([position])
  @@map("lead_funnel_column")
}

model Lead {
  idLead             Int      @id @default(autoincrement()) @map("id_lead")
  externalCrmId      String?  @unique @map("external_crm_id") @db.VarChar(150)
  name               String?  @db.VarChar(200)
  lastName           String?  @map("last_name") @db.VarChar(200)
  email              String?  @db.VarChar(150)
  phone              String?  @db.VarChar(30)
  identityNumber     String?  @map("identity_number") @db.VarChar(20)
  originTag          String?  @map("origin_tag") @db.VarChar(120)
  externalUrl        String?  @map("external_url")
  idUser             Int?     @map("id_user")
  idLeadFunnelColumn Int      @map("id_lead_funnel_column")
  idBusiness         Int?     @unique @map("id_business")
  active             Boolean  @default(true)
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")
  user               User?             @relation(fields: [idUser], references: [idUser])
  funnelColumn       LeadFunnelColumn  @relation(fields: [idLeadFunnelColumn], references: [idLeadFunnelColumn])
  business           Business?         @relation(fields: [idBusiness], references: [idBusiness])
  @@index([idUser])
  @@index([idLeadFunnelColumn])
  @@map("lead")
}
```

Seed (`prisma/seeds/lead-funnel-columns.ts`, idempotent `upsert`): `{ name: 'Sin mapear', externalStatusKey: '__unmapped__', position: 0, isFallback: true }`. `isFallback: true` is the guard for "non-deletable, non-renamable key".

`Lead.idBusiness` (nullable, unique FK → `Business`) is **confirmed and definitive**, not optional scope: it is the traceability requirement that a `Business` be identifiable as originated from a specific `Lead` for reporting. It doubles as the single-conversion guard.

## Conversion Flow (Lead → Client + Business)

```
Lead detail ──"Convertir a negocio"──► /dashboard/negocios/crear?leadId=<id>
   (button hidden/disabled                       │
    when lead.idBusiness != null)                ▼
                              CrearNegocioPage (Server Component)
                                ├─ getLeadForConversion(leadId, viewer)  ← hierarchy-scoped
                                ├─ guard: not found / not visible / already converted → redirect
                                ├─ mapLeadToBusinessDefaults(lead)  (leads/mappers/)
                                └─ <BusinessWrapper defaultValues={...} leadId={id}>
                                             │
                                             ▼   user completes product, currency,
                                                 origin, value, agent, term, periodicity
                                   useBusinessForm → createBusiness({ ..., idLead })
                                             │
                                   prisma.$transaction
                                     ├─ business.create(...)
                                     ├─ payments.createMany(...)
                                     └─ linkLeadToBusinessTx(tx, idLead, idBusiness)
                                          ├─ re-check lead active && idBusiness == null
                                          │    → violation throws → whole tx rolls back
                                          └─ lead.update({ idBusiness })
                                             │
                                             ▼
                                    logAuditEvent(LEAD_CONVERTED_TO_BUSINESS)
```

Rules:
1. **Prefill** uses the existing `defaultValues` prop — `name`, `lastNames`, `email`, `phone`, `identityNumber` (only when already captured on the lead). Everything else stays empty for the user to fill. The URL carries only `leadId`; the lead is read server-side.
2. **`Lead.idBusiness` is set only at the moment the business is created successfully**, inside the same transaction — never when the button is clicked, never when the form opens. An abandoned form leaves the lead untouched and re-convertible.
3. **A lead with `idBusiness != null` cannot start a second conversion.** Enforced at three layers: the detail UI replaces the button with "Ver negocio"; `CrearNegocioPage` redirects when `?leadId` points at a converted lead; `linkLeadToBusinessTx` re-checks inside the transaction so a concurrent double submit rolls back instead of creating a duplicate business. The `@unique` on `idBusiness` is the final DB-level backstop.
4. Client resolution is unchanged existing behaviour: `useBusinessForm` searches by `identityNumber` and reuses the matched `Client`, or creates one via `createClient()` (`[typeIdentity, identityNumber]` unique). Leads add no new client logic.

## Data Flow

```
n8n ──POST /api/leads/crm-sync──► route: apiKeyGuard → rateLimiter → Zod
                                     │
                                     ▼
                          lead-sync.service.upsertLeadFromCrm()
                             ├─ resolveFunnelColumn(statusKey) ─► fallback "Sin mapear"
                             ├─ resolveOwner(ownerEmail)       ─► User.email | null
                             ├─ buildLeadUpsertData()  (partial merge, pure)
                             ├─ prisma.lead.upsert({ where: { externalCrmId } })
                             └─ logAuditEvent(...)            ─► AuditLog

Browser ──GET /api/leads──► route (auth()) ─► getAccessibleUserIds()
                                            ─► buildLeadListWhere() ─► lead-board.service ─► grouped columns
```

## API Contracts

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/leads/crm-sync` | `x-api-key` | Upsert lead. `200 {data:{idLead, created}}`, `400` Zod, `401` bad key, `429` rate limit |
| `GET /api/leads` | `auth()` | Board: columns + hierarchy-scoped leads (`buildLeadListWhere`) |
| `GET /api/leads/[id]` | `auth()` | Lead detail; 404 when outside visibility scope |
| `GET/POST /api/leads/funnel-columns` | `auth()` + admin | List / create column |
| `PATCH/DELETE /api/leads/funnel-columns/[id]` | `auth()` + admin | Rename/reposition/remap; soft delete blocked by `isFallback` or `count(active leads) > 0` → `409` |

Webhook payload (Zod, `src/features/leads/types/crm-sync.schema.ts`): required `externalCrmId: string().min(1)`, `statusKey: string().min(1)`; optional `name`, `lastName`, `email` (`.email()` or empty), `phone`, `identityNumber`, `originTag`, `externalUrl` (`.url()` or empty), `ownerEmail`. Unknown keys stripped.

`buildLeadListWhere(currentUser, filters, { visibleUserIds })` mirrors `buildBusinessListWhere()`, plus one Leads-specific rule: for non-bypass roles the `idUser` clause is `{ in: visibleUserIds }` **without** an `OR idUser: null` branch, so owner-less leads are admin-only. Always adds `{ active: true }`.

## Services and Files

| File | Action | Description |
|---|---|---|
| `prisma/schema.prisma` | Modify | `Lead`, `LeadFunnelColumn`, back-relations on `User`/`Business` |
| `prisma/ERD.md` | Modify | Enums, relationship lines, entity fields, index note (mandatory project rule) |
| `prisma/seeds/lead-funnel-columns.ts` | Create | "Sin mapear" fallback seed |
| `src/features/leads/services/lead-sync.service.ts` | Create | Upsert + column/owner resolution (all Prisma for ingest) |
| `src/features/leads/services/lead-board.service.ts` | Create | Board query + grouping, lead detail |
| `src/features/leads/services/lead-funnel-column.service.ts` | Create | Column CRUD + active-lead deletion guard |
| `src/features/leads/lib/build-lead-list-where.ts` | Create | Pure where builder |
| `src/features/leads/lib/build-lead-upsert-data.ts` | Create | Pure partial-merge |
| `src/features/leads/lib/api-key-guard.ts` | Create | `timingSafeEqual` API key check |
| `src/features/leads/lib/rate-limiter.ts` | Create | Sliding-window in-memory limiter |
| `src/features/leads/services/lead-conversion.service.ts` | Create | `getLeadForConversion(leadId, viewer)` (hierarchy-scoped, rejects converted leads) + `linkLeadToBusinessTx(tx, idLead, idBusiness)` with the single-conversion re-check |
| `src/features/leads/mappers/lead-to-business-defaults.ts` | Create | Pure `Lead` → `BusinessFormProps['defaultValues']` mapper (`lastName` → `lastNames`, nulls → `''`) |
| `src/features/negocios/actions/create-business.ts` | Modify | Add optional `idLead` to schema/input; inside the existing `$transaction` call `linkLeadToBusinessTx`. No other behaviour change |
| `src/app/dashboard/negocios/crear/page.tsx` | Modify | Read `searchParams.leadId`; resolve lead, guard, pass `defaultValues` + `leadId` to `BusinessWrapper` |
| `src/features/negocios/components/business-wrapper.tsx` | Modify | Accept and forward `defaultValues` and `leadId` to `BusinessForm` |
| `src/features/leads/components/*` | Create | `LeadsBoard` (container) → `LeadFunnelColumn` (presentational) → `LeadCard`; `LeadDetailSheet` with conditional "Ver en CRM"; `FunnelColumnsAdminTable` |
| `src/features/leads/hooks/use-leads-board.ts` | Create | `AsyncState<T>` per project rule |
| `src/app/api/leads/**` | Create | Route handlers listed above |
| `src/app/(dashboard)/leads/page.tsx` + admin page | Create | Server Component shells |
| `src/features/auth/lib/audit-logger.ts` | Modify | Add the 7 `LEAD_*` actions |
| Navigation config | Modify | `Leads` entry + admin sub-entry |

## Audit Events

`LEAD_CREATED` / `LEAD_STATUS_CHANGED` / `LEAD_OWNER_ASSIGNED` / `LEAD_OWNER_UNRESOLVED` in `lead-sync.service`; `LEAD_FUNNEL_COLUMN_CREATED` / `LEAD_FUNNEL_COLUMN_UPDATED` in the column service; `LEAD_CONVERTED_TO_BUSINESS` in the conversion action. Webhook entries have no session: pass `userId: undefined`, `email: 'crm-sync@system'`, plus `getClientIp()`/`getUserAgent()`.

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit | `buildLeadUpsertData` (empty/absent never overwrite), `buildLeadListWhere` (admin vs scoped vs owner-less exclusion), rate limiter window, API key guard (wrong key, missing header, wrong length) | Vitest, no DB |
| Integration | `POST /api/leads/crm-sync`: create, idempotent re-post, partial merge, unknown `statusKey` → fallback, owner reassign, unmatched owner → null + audit, 401, 429 | Route test with mocked services/prisma, mirroring `src/app/api/origins/__tests__/route.test.ts` |
| Integration | Column delete blocked with active leads (409) and fallback column undeletable | Route + service test |
| Unit | `mapLeadToBusinessDefaults` (null → `''`, `lastName` → `lastNames`, absent `identityNumber`) | Vitest, no DB |
| Integration | `createBusiness({ idLead })` sets `Lead.idBusiness` in-transaction; already-converted lead throws and rolls back so no `Business` row is created; `createBusiness()` without `idLead` behaves exactly as before (regression) | Extend `create-business` action tests |
| Integration | `getLeadForConversion` rejects leads outside the viewer's hierarchy and leads with `idBusiness != null` | Service test |
| E2E | Board renders columns, no drag/drop affordance, detail opens, admin CRUD | Playwright (optional slice) |

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The inbound-webhook boundary is covered by D1/D2 and their integration tests above.

## Migration / Rollout

One additive Prisma migration (`add_leads_module`) plus the fallback-column seed, which must run before the first webhook call. `LEADS_CRM_SYNC_API_KEY` provisioned per environment before deploy. No backfill, no existing-table alteration. Rollback per proposal.

## Open Questions

- [ ] None blocking. Confirm the exact env var name at implementation time if deployment tooling imposes a prefix.

**Resolved**: the earlier gap — "`createBusiness()` needs `idProduct`, `idCurrency`, `idClientOrigin`, `value` and an agent with `idLevel`, none of which a lead carries" — is closed by D7/D9/D10. Conversion reuses the existing business form, the user supplies those fields there, and `Lead.idBusiness` is confirmed as the definitive traceability link. No new conversion form is built.

---

# Extension: Lead outcome status + board filters

Additive extension over the already-implemented module. Nothing in D1–D10 is redesigned.

## Architecture Decisions (extension)

| # | Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|---|
| D11 | Outcome model | Prisma enum `LeadOutcomeStatus { OPEN WON LOST ABANDONED }`; `Lead.outcomeStatus LeadOutcomeStatus @default(OPEN) @map("outcome_status")` (NOT NULL) + `@@index([outcomeStatus, createdAt])` | `String` column + app validation; nullable column; admin-configurable table | Fixed 4-value domain per user decision. DB-level enum makes an invalid write impossible; NOT NULL + default removes every null branch. Composite index matches the exact default query (outcome ∈ set AND createdAt range) |
| D12 | Unknown outcome value | **The webhook never rejects an outcome value.** Zod accepts `outcomeStatus` as a plain optional string (preprocessed `trim().toUpperCase()`); the *service* resolves it via a pure `resolveOutcomeStatus()` — a value outside the enum normalises to `OPEN`, the response stays **200**, and `LEAD_OUTCOME_STATUS_UNRESOLVED` is audit-logged | `z.enum()` returning 400 on an unknown value; silent normalisation with no audit trail | Exactly the philosophy already applied to `statusKey` ("Sin mapear" never rejects) and to `ownerEmail` (unmatched → null + `LEAD_OWNER_UNRESOLVED`). Ingestion must never stop because the CRM emitted vocabulary we do not know yet; the lead is still stored and the discrepancy is surfaced to admins for correction upstream. `outcomeStatus` is therefore **not** a special case in this contract |
| D13 | Partial merge | **Partially superseded by D19** (the last sentence of this rationale no longer holds: `OPEN` never overwrites a stored `WON`). `resolveOutcomeStatus()` returns `undefined` when the field is absent/empty (preserve stored value), otherwise a valid enum member. `buildLeadUpsertData()` takes it as a parameter — exactly like `resolvedOwnerId` — and writes `data.outcomeStatus` only when it is not `undefined`. On create with no field, the key is omitted → Prisma's `@default(OPEN)` applies | adding it to `OPTIONAL_STRING_FIELDS`; resolving inside the builder; `z.default('OPEN')` in Zod | The `OPTIONAL_STRING_FIELDS` loop is `string`-typed, and the builder must stay pure/DB-free. Passing an already-resolved value reuses the established D4/D5 shape one-for-one. A normalised `OPEN` **does** overwrite a stored `WON` — same last-write-wins rule as an unmapped `statusKey` overwriting the column and an unmatched `ownerEmail` clearing the owner |
| D14 | Outcome audit | Two actions. `LEAD_OUTCOME_STATUS_CHANGED`, emitted from `upsertLeadFromCrm()` only when the resolved value differs from `existing.outcomeStatus`. `LEAD_OUTCOME_STATUS_UNRESOLVED`, emitted whenever the payload carried a non-empty value outside the enum, recording the raw rejected string | no audit; audit on every payload; one combined action | `existing` is already fetched at `lead-sync.service.ts:71`, so the diff is free. Outcome is reporting-critical, so WON/LOST transitions must be traceable while re-posts stay silent. The unresolved event is the only trace of a CRM vocabulary drift, so it is kept separate from a legitimate transition — mirroring `LEAD_OWNER_ASSIGNED` vs `LEAD_OWNER_UNRESOLVED` |
| D15 | Filter defaults ownership | One shared pure helper `getDefaultLeadBoardFilters()` in `src/features/leads/lib/lead-board-filters.ts`, consumed by BOTH `GET /api/leads` and the board container | client-only defaults; server-only defaults; duplicated constants | A raw API call must behave like the UI, and the chips must show the defaults they are actually filtering by. One pure function keeps them identical and unit-testable with fake timers |
| D16 | Default-vs-explicit signalling | Param **absent** → apply default. Param **present but empty** (`?outcomeStatus=`, `?createdFrom=&createdTo=`) → no filter on that dimension | `ALL` sentinel value; an `?applied=1` marker | No magic token and no extra flag: absence and explicit-empty are already distinguishable in `URLSearchParams`, so "user cleared the chips" is expressible without inventing vocabulary |
| D17 | Date semantics | Reuse `parseBogotaInclusiveUtcRange()`; promote it (and `BOGOTA_TZ`) to `src/features/shared/lib/bogota-date-range.ts`, leaving `src/features/negocios/lib/bogota-date-range.ts` as a thin re-export | cross-feature import from `negocios`; a second copy in `leads` | Two features now need it, so it is genuinely shared. The re-export keeps every existing `negocios` import and its test green — zero behavioural change |
| D18 | Filter UI | Reuse shared `MultiSelect` (`src/features/shared/ui/multi-select.tsx`) for outcome chips and shared `DateRangePicker` (`src/features/shared/ui/date-range-picker.tsx`) for the range, wrapped in a new presentational `leads-board-filters.tsx` | building a chip group / picker inside `leads` | Both primitives already exist, are tested, and `date-range-picker.tsx` is explicitly documented as "must NOT be duplicated per feature" |

## Data Model (extension)

```prisma
enum LeadOutcomeStatus { OPEN WON LOST ABANDONED }

model Lead {
  // ...existing fields
  outcomeStatus LeadOutcomeStatus @default(OPEN) @map("outcome_status")
  @@index([outcomeStatus, createdAt])
}
```

## Contracts (extension)

```ts
// crm-sync.schema.ts — accepts ANY string; the enum is NOT enforced here
export const LEAD_OUTCOME_STATUS_VALUES = ['OPEN','WON','LOST','ABANDONED'] as const
outcomeStatus: z.string()
  .transform((v) => v.trim().toUpperCase())
  .optional()

// lead-outcome-status.ts — pure resolution, mirrors resolveOwner()'s tri-state
// NOTE: signature extended by D19 (see "Extension: WON is terminal") — it now
// also takes the lead's currently stored outcome and returns `locked`.
export function resolveOutcomeStatus(raw: string | undefined): {
  value: LeadOutcomeStatus | undefined   // undefined → absent/empty, preserve stored
  unresolved: boolean                    // true → raw was non-empty but off-enum
}
// '' | undefined      → { value: undefined,  unresolved: false }
// 'won' | ' WON '     → { value: 'WON',      unresolved: false }
// 'CLOSED' | 'xyz'    → { value: 'OPEN',     unresolved: true  }  → 200 + audit

// build-lead-list-where.ts — LeadListFilterInput gains:
outcomeStatuses?: LeadOutcomeStatus[]   // empty/undefined → no filter
createdAtRange?: { gte: Date; lte: Date }
```

`buildLeadListWhere()` pushes `{ outcomeStatus: { in: outcomeStatuses } }` and `{ createdAt: { gte, lte } }` into the same `whereConditions` array used by the hierarchy clause — combination is **AND** by construction, exactly mirroring `buildBusinessListWhere()`. Hierarchy scoping is untouched.

`GET /api/leads?outcomeStatus=OPEN&outcomeStatus=WON&createdFrom=2026-08-01&createdTo=2026-08-31`.

## Data Flow (extension)

    LeadsBoard (container)
      └─ getDefaultLeadBoardFilters()  →  ['OPEN'] + current Bogotá month
           └─ LeadsBoardFilters (MultiSelect + DateRangePicker)
           └─ useLeadsBoard(filters) ──query string──▶ GET /api/leads
                                                        └─ toLeadListFilterInput()
                                                             └─ buildLeadListWhere()  (AND hierarchy)

## File Changes (extension)

| File | Action | Description |
|---|---|---|
| `prisma/schema.prisma` | Modify | `LeadOutcomeStatus` enum, `Lead.outcomeStatus`, composite index |
| `prisma/migrations/*_add_lead_outcome_status/` | Create | `CREATE TYPE` + `ADD COLUMN ... NOT NULL DEFAULT 'OPEN'` + `CREATE INDEX` |
| `prisma/ERD.md` | Modify | Mandatory: enums block, `Lead` field list, note on the composite index |
| `src/features/shared/lib/bogota-date-range.ts` | Create | Promoted `BOGOTA_TZ`, `parseBogotaInclusiveUtcRange`, new `currentBogotaMonthRange()` |
| `src/features/negocios/lib/bogota-date-range.ts` | Modify | Becomes a re-export of the shared module |
| `src/features/leads/types/crm-sync.schema.ts` | Modify | `LEAD_OUTCOME_STATUS_VALUES` + optional, case-normalised `outcomeStatus` string (no enum gate) |
| `src/features/leads/lib/build-lead-upsert-data.ts` | Modify | Accept `resolvedOutcomeStatus` param; write it only when defined |
| `src/features/leads/lib/build-lead-list-where.ts` | Modify | `outcomeStatuses` + `createdAtRange` conditions |
| `src/features/leads/lib/lead-board-filters.ts` | Create | `getDefaultLeadBoardFilters()`, `toLeadListFilterInput()` |
| `src/features/leads/lib/lead-outcome-status.ts` | Create | Pure: `resolveOutcomeStatus()` + ES labels + badge variant map |
| `src/features/leads/services/lead-sync.service.ts` | Modify | Call `resolveOutcomeStatus()`, pass the value to the builder, emit `LEAD_OUTCOME_STATUS_CHANGED` on diff and `LEAD_OUTCOME_STATUS_UNRESOLVED` when off-enum |
| `src/features/leads/services/lead-board.service.ts` | Modify | `outcomeStatus` in the board `select` and in `LeadDetail` |
| `src/features/leads/types/lead.types.ts` | Modify | `outcomeStatus` on `LeadCard` and `LeadDetail` |
| `src/app/api/leads/route.ts` | Modify | Parse query params, apply defaults, pass filters |
| `src/features/leads/hooks/use-leads-board.ts` | Modify | Accept filters, build query string, refetch on change |
| `src/features/leads/components/leads-board.tsx` | Modify | Owns filter state seeded from the shared default helper |
| `src/features/leads/components/leads-board-filters.tsx` | Create | Presentational `MultiSelect` + `DateRangePicker` row above the board |
| `src/features/leads/components/lead-card.tsx` | Modify | Outcome `<Badge>` |
| `src/features/leads/components/lead-detail-sheet.tsx` | Modify | Outcome row |
| `src/features/auth/lib/audit-logger.ts` | Modify | `LEAD_OUTCOME_STATUS_CHANGED`, `LEAD_OUTCOME_STATUS_UNRESOLVED` |

## Testing Strategy (extension)

| Layer | What | How |
|---|---|---|
| Unit | Zod: `won` → `WON`, `' Lost '` → `LOST`, `''` and absent accepted, `CLOSED` parses without error (no enum gate at this layer) | pure schema parse |
| Unit | `resolveOutcomeStatus()`: absent/empty → `undefined`; valid → enum member; off-enum → `OPEN` + `unresolved: true` | pure |
| Unit | `buildLeadUpsertData`: `undefined` resolved value preserves stored value; defined value overwrites (incl. `OPEN` over `WON`); create omits the key | no DB |
| Unit | `buildLeadListWhere`: outcome `in` clause, `createdAt` range, AND-composition with hierarchy, empty array → no clause | assert the `where` object |
| Unit | `getDefaultLeadBoardFilters()` → `['OPEN']` + first/last day of the Bogotá month | `vi.setSystemTime`, incl. a UTC-vs-Bogotá month-boundary case (1st at 00:30 and last day at 23:30 Bogotá) |
| Unit | `lead-outcome-status` label/variant map covers all 4 values | exhaustive |
| Integration | webhook create defaults to `OPEN`; transition `OPEN→WON` emits exactly one `LEAD_OUTCOME_STATUS_CHANGED`; re-post of the same value emits none; **unknown value → 200, lead persisted with `OPEN`, `LEAD_OUTCOME_STATUS_UNRESOLVED` logged with the raw string** | mocked Prisma, as existing lead tests do |
| Component | `LeadCard` renders the badge; filter row wires `MultiSelect`/`DateRangePicker` changes into the fetch | Testing Library |

## Migration / Rollout (extension)

Single additive migration `add_lead_outcome_status`: `CREATE TYPE "LeadOutcomeStatus"`, `ALTER TABLE "lead" ADD COLUMN "outcome_status" "LeadOutcomeStatus" NOT NULL DEFAULT 'OPEN'`, then the composite index. Postgres backfills every existing row to `OPEN` as part of `ADD COLUMN` — **no separate data-migration step**. No seed change: `prisma/seeds/lead-funnel-columns.ts` creates columns only, never leads.

**Existing-test impact**: all Leads tests mock Prisma, so behaviour is unaffected, but fixtures typed as the full Prisma `Lead` will fail `npm run type-check` until `outcomeStatus: 'OPEN'` is added — `lead-sync.service.test.ts` (`lead.upsert` mock), `lead-conversion.service.test.ts` (`lead.findUnique`/`findFirst` mocks) and `leads-full-flow.integration.test.ts`. `lead-board.service.test.ts` uses `select` projections and only needs the field where the new assertions require it. `AuditAction` is mocked object-literal style in those files, so both `LEAD_OUTCOME_STATUS_CHANGED` and `LEAD_OUTCOME_STATUS_UNRESOLVED` must be added to each mock.

Rollback: revert the branch and run a down migration dropping the column then the type. No other table is touched.

## Audit Events (extension)

`LEAD_OUTCOME_STATUS_CHANGED` (resolved value differs from the stored one) and `LEAD_OUTCOME_STATUS_UNRESOLVED` (payload carried a non-empty value outside the enum; records the raw string). Both are emitted from `lead-sync.service.ts` with the webhook's session-less context: `userId: undefined`, `email: 'crm-sync@system'`, plus `getClientIp()` / `getUserAgent()`.

## Open Questions (extension)

- [ ] None blocking.

**Resolved**: the earlier open risk — "`statusKey` unknown returns 200 with a fallback while `outcomeStatus` unknown returns 400" — is closed by the revised D12/D13/D14. There is **no asymmetry**: an unknown `outcomeStatus` never rejects the webhook. It normalises to `OPEN`, returns 200, and is audit-logged via `LEAD_OUTCOME_STATUS_UNRESOLVED`, following the exact pattern already established by unmapped `statusKey` → "Sin mapear" and unmatched `ownerEmail` → null owner + `LEAD_OWNER_UNRESOLVED`. Ingestion never stops because of CRM vocabulary drift; the discrepancy is surfaced to admins for upstream correction.

---

# Extension: `WON` is terminal (outcome lock)

Incremental amendment over the outcome-status extension. D11, D12, D15–D18 are unchanged; D13 and D14 are amended by D19/D20 only where noted.

**Business rule (user-confirmed)**: once `Lead.outcomeStatus` is `WON` in the database, no later webhook can change it. The value is frozen, **independently of `idBusiness`** (a `WON` lead that was never converted is still locked). Only `WON` is terminal — `OPEN`, `LOST` and `ABANDONED` stay mutable in every direction, including into `WON`. The webhook is still never rejected: it returns **200**, every other field of the payload (funnel column, owner, contact data) merges normally, and only `outcomeStatus` is held at `WON`.

## Architecture Decisions (lock)

| # | Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|---|
| D19 | Where the lock lives | `resolveOutcomeStatus()` stops being a function of the payload alone and takes a **second parameter**: the lead's currently stored outcome. It stays a pure function — of `(raw, current)` instead of `(raw)` — and gains a fourth result field: `resolveOutcomeStatus(raw, current) → { value, unresolved, locked }`. When `current === 'WON'` and the incoming value resolves to something different, it returns `{ value: 'WON', unresolved, locked: true }` | (a) a DB read inside the resolver; (b) a `WHERE outcome_status <> 'WON'` conditional update; (c) enforcing the lock in `buildLeadUpsertData()`; (d) a Postgres trigger / `CHECK` | The resolver must stay DB-free to remain unit-testable without Prisma (same constraint as D4/D13). Passing the current value in keeps purity and makes every lock case a table-driven unit test. A conditional update would silently swallow the attempt with nothing to audit and would need a second query to know whether it fired. The builder must remain a dumb merger (D13). A DB trigger hides business logic from the codebase and cannot emit an `AuditLog` row through `logAuditEvent()` |
| D20 | Returned `value` when locked | Return the **explicit** `'WON'`, not `undefined` | returning `undefined` (omit the key, preserve by absence) | Both write the same row, but `undefined` overloads the existing "field absent from payload" meaning and makes the lock indistinguishable from a no-op in tests and in the builder. Writing `'WON'` is an idempotent no-change write, and D14's diff (`resolved !== existing.outcomeStatus`) is `false` by construction, so **no** `LEAD_OUTCOME_STATUS_CHANGED` is emitted for a locked payload |
| D21 | Lock vs. drift are independent | `unresolved` is computed from the raw string **before** the lock is applied, so `locked: true` and `unresolved: true` can both be returned and **both** audit events are emitted | suppressing the unresolved audit when locked | Two distinct facts: the CRM emitted vocabulary we do not know (an upstream data-quality problem that must stay visible even on a locked lead) **and** it tried to move a terminal lead. Collapsing them would hide drift on every `WON` lead |
| D22 | Where `current` comes from | `upsertLeadFromCrm()` reuses the **`existing` row it already fetches** at `lead-sync.service.ts:71` (`prisma.lead.findUnique({ where: { externalCrmId } })`, full row — no `select` projection, so `outcomeStatus` is already there once D11 lands). The call becomes `resolveOutcomeStatus(payload.outcomeStatus, existing?.outcomeStatus)` | a dedicated `SELECT outcome_status` before the resolver; reading inside the resolver | Zero extra query and zero extra round trip. That read already exists for the create-vs-update flag and for D14's diff. On create `existing` is `null` → `current` is `undefined` → the lock can never fire on a brand-new lead, which is correct by construction |
| D23 | Lock audit | New `AuditAction.LEAD_OUTCOME_STATUS_LOCKED`, emitted from `upsertLeadFromCrm()` **only** when `locked === true` | reusing `LEAD_OUTCOME_STATUS_UNRESOLVED`; no audit; audit every payload touching a `WON` lead | Naming matches the existing `LEAD_OUTCOME_STATUS_CHANGED` / `_UNRESOLVED` pair. A blocked attempt is a business event admins must see (the CRM believes a won lead reopened). Re-posting `WON` on a `WON` lead is not an attempt, so it stays silent — same "no noise on idempotent re-post" rule as D14 |

## Contract (amended)

```ts
// lead-outcome-status.ts — pure over (raw, current); no DB access
export function resolveOutcomeStatus(
  raw: string | undefined,
  current: LeadOutcomeStatus | undefined   // undefined on create
): {
  value: LeadOutcomeStatus | undefined
  unresolved: boolean
  locked: boolean
}
```

| `current` | `raw` | Result | Effect |
|---|---|---|---|
| any | `''` / absent | `{ undefined, false, false }` | key omitted → stored value preserved |
| not `WON` | `'won'` | `{ 'WON', false, false }` | transition into the terminal state |
| not `WON` | `'CLOSED'` | `{ 'OPEN', true, false }` | 200 + `_UNRESOLVED` (D12 unchanged) |
| `'WON'` | `'WON'` / `'won'` | `{ 'WON', false, false }` | idempotent re-post, **no** audit |
| `'WON'` | `'LOST'` / `'OPEN'` / `'ABANDONED'` | `{ 'WON', false, **true** }` | 200, stays `WON`, `_LOCKED` |
| `'WON'` | `'CLOSED'` | `{ 'WON', **true**, **true** }` | 200, stays `WON`, `_UNRESOLVED` **and** `_LOCKED` |

`buildLeadUpsertData()` is **unchanged** by this rule — it still writes `data.outcomeStatus` whenever the passed value is not `undefined`. All lock logic is upstream, in the resolver.

## Data Flow (amended)

    upsertLeadFromCrm(payload)
      ├─ existing = prisma.lead.findUnique({ externalCrmId })   ← ALREADY THERE (:71), reused
      ├─ resolveFunnelColumn(statusKey)          ← unaffected by the lock
      ├─ resolveOwner(ownerEmail)                ← unaffected by the lock
      ├─ { value, unresolved, locked } = resolveOutcomeStatus(
      │        payload.outcomeStatus, existing?.outcomeStatus )
      ├─ buildLeadUpsertData(payload, existing ?? {}, resolvedOwnerId, value)
      ├─ prisma.lead.upsert(...)                 → 200 always
      └─ audits: LEAD_CREATED | LEAD_STATUS_CHANGED
                 + LEAD_OUTCOME_STATUS_CHANGED   when value !== existing.outcomeStatus
                 + LEAD_OUTCOME_STATUS_UNRESOLVED when unresolved
                 + LEAD_OUTCOME_STATUS_LOCKED     when locked

## Audit Event (new)

`LEAD_OUTCOME_STATUS_LOCKED` — fired from `lead-sync.service.ts` when a webhook carries a recognisable-or-not outcome value that differs from a stored `WON`. Session-less context like every other webhook audit (`userId: undefined`, `email: 'crm-sync@system'`, `getClientIp()` / `getUserAgent()`). `details` records the raw incoming string and the `externalCrmId`, e.g. `Intento bloqueado de cambiar outcomeStatus de un lead WON (externalCrmId: X, valor entrante: "LOST"). El lead permanece en WON.` It is **not** fired when the payload omits `outcomeStatus`, nor when it re-posts `WON`.

## File Changes (lock)

| File | Action | Description |
|---|---|---|
| `src/features/leads/lib/lead-outcome-status.ts` | Modify | `resolveOutcomeStatus(raw, current)` + `locked` in the result |
| `src/features/leads/services/lead-sync.service.ts` | Modify | Pass `existing?.outcomeStatus`; emit `LEAD_OUTCOME_STATUS_LOCKED` when `locked` |
| `src/features/auth/lib/audit-logger.ts` | Modify | Add `LEAD_OUTCOME_STATUS_LOCKED` |

No schema, migration, API-contract, query-filter or UI change: the lock is pure ingestion behaviour. `build-lead-upsert-data.ts` and `build-lead-list-where.ts` are untouched by this rule.

## Testing (lock)

| Layer | What | How |
|---|---|---|
| Unit | Every row of the resolution table above, driven as a `it.each` matrix over `(current, raw)`; explicitly `current: undefined` (create) can never yield `locked: true` | pure, no DB |
| Unit | `WON` → `WON` re-post returns `locked: false` (no false-positive audit) | pure |
| Integration | Stored `WON` + payload `outcomeStatus: 'LOST'` → **200**; `lead.upsert` called with `outcomeStatus: 'WON'`; exactly one `LEAD_OUTCOME_STATUS_LOCKED`; **zero** `LEAD_OUTCOME_STATUS_CHANGED` | mocked Prisma |
| Integration | Same locked payload also carries a new `statusKey`, `ownerEmail` and `phone` → column, owner and phone **are** updated while `outcomeStatus` stays `WON` (proves the lock is field-scoped, not request-scoped) | mocked Prisma |
| Integration | Stored `WON` + `outcomeStatus: 'CLOSED'` → 200, both `_UNRESOLVED` and `_LOCKED` emitted | mocked Prisma |
| Integration | Stored `LOST` + payload `WON` → transition applied, `LEAD_OUTCOME_STATUS_CHANGED`, no lock | mocked Prisma |
| Integration | Locked lead with `idBusiness: null` behaves identically to one with `idBusiness` set (lock is independent of conversion) | mocked Prisma |

**Existing-test impact (additional)**: `LEAD_OUTCOME_STATUS_LOCKED` must be added to the object-literal `AuditAction` mocks in `lead-sync.service.test.ts`, `lead-conversion.service.test.ts` and `leads-full-flow.integration.test.ts`, alongside the two actions already required by D14.

## Risks (amended)

| Risk | Status |
|---|---|
| "A normalised `OPEN` overwrites a stored `WON` because of CRM vocabulary drift" (D13) | **Closed for `WON`.** The lock makes it structurally impossible; the attempt is audited instead of silently applied |
| The same drift still overwrites `OPEN` / `LOST` / `ABANDONED` | **Open, accepted.** Only `WON` is terminal, so an unknown value normalising to `OPEN` still overwrites a stored `LOST` or `ABANDONED`, and a legitimate `ABANDONED → OPEN` regression is still possible. Mitigation is unchanged: `LEAD_OUTCOME_STATUS_UNRESOLVED` + `LEAD_OUTCOME_STATUS_CHANGED` make every such move traceable in `AuditLog`, and the correction is upstream in the CRM/n8n |
| A `WON` set by mistake is permanent | **New, accepted for v1.** Leads v1 is read-only from Financieramente, so there is no UI to unlock and the webhook cannot reverse it. Recovery today is a manual DB correction. A future admin-only "reabrir lead" action (audited) is the natural follow-up and is out of scope here |
| `resolveOutcomeStatus()` is no longer a pure function of the payload | **Mitigated, not eliminated.** It is still pure — `(raw, current) → result`, no I/O — so it stays fully unit-testable. The coupling cost is that callers must supply the current value; D22 pins the single supported source (the already-fetched `existing` row) so no second query and no divergent call site can appear |

## Open Questions (lock)

- [ ] None blocking.

---

# Amendment: funnel column admin — drag & drop reorder + row editing

Small, acted-on-immediately amendment over the already-implemented Phase 5 `FunnelColumnsAdminTable` (`src/features/leads/components/funnel-columns-admin-table.tsx`). No product decision from D1–D23 is reopened — this only replaces the reorder interaction and adds inline row editing on the single admin table component. Requested directly by the user after reviewing the first version of the table; not routed through `sdd-explore`/`sdd-propose`/`sdd-spec` because every decision was already made by the user and there is no product ambiguity to resolve.

## Why the ↑/↓ buttons were replaced

The original v1 reorder UI (move-up/move-down buttons swapping with the neighbor row, `PATCH` per swap) worked but the user explicitly asked for drag & drop instead after seeing it. The underlying persistence contract (`PATCH /api/leads/funnel-columns/[id]` with `{ position }`, one call per changed row) is unchanged — only the trigger mechanism moved from two buttons per row to a drag handle per row.

## Library choice: `@dnd-kit`

`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (`^6.3.1` / `^10.0.0` / `^3.2.2`) were added as new dependencies — no DnD library previously existed in the project. Chosen over `react-beautiful-dnd` (unmaintained since 2022, React 18 compat issues, no React 19 support) because `@dnd-kit` is the current de-facto standard, is actively maintained, has first-class React 19 support, and — critically for this project's accessibility bar — ships a built-in `KeyboardSensor` (`sortableKeyboardCoordinates`) so reorder is never mouse-only. `PointerSensor` + `KeyboardSensor` are both registered via `useSensors()`.

## Persistence mechanism

`handleDragEnd(event: DragEndEvent)`:
1. Pure calculation lives in a new colocated lib function, `src/features/leads/lib/reorder-funnel-columns.ts::reorderFunnelColumns(columns, activeId, overId)` — mirrors `arrayMove()` semantics from `@dnd-kit/sortable`, reassigns `position` 0..n-1, and returns only the rows whose `position` actually changed (`changed: LeadFunnelColumn[]`), so the caller PATCHes the minimal set instead of every row. No-op (same array reference, empty `changed`) when `activeId === overId` or either id is not found — unit-tested directly (`lib/__tests__/reorder-funnel-columns.test.ts`), no DnD/DOM dependency.
2. The component applies the reordered array to state **optimistically**, then fires one `PATCH /api/leads/funnel-columns/[id]` per changed row in parallel (`Promise.all`), exactly the same endpoint/payload shape as the old ↑/↓ buttons.
3. If any PATCH returns an error, the component reverts `columns` to the pre-drag snapshot and surfaces the error via the same `toast.error(...)` pattern already used for delete/create failures — no partial-apply state is left visible to the user.

## Row editing (new) — **superseded by D24/D25, see the Phase 14 amendment**

> **Historical note.** This section originally shipped as an *inline-in-row* edit
> that swapped the `name`/`externalStatusKey` cells for inputs and allowed
> editing **both** fields. That is no longer the implementation. `externalStatusKey`
> became immutable after creation (D24) and the editor became a **modal**
> (`Dialog`) that edits `name` only (D25). The description below is kept only to
> explain what the delta in the Phase 14 amendment replaced; do not implement it.

Original v1 of this amendment: each row got an "Editar" button that swapped its
`name`/`externalStatusKey` cells for labeled inputs plus "Guardar"/"Cancelar".
"Guardar" built a minimal patch object (only the fields that actually changed)
and called `PATCH /api/leads/funnel-columns/[id]`; empty name/key was rejected
client-side before the request; a duplicate `externalStatusKey` was caught by
the backend uniqueness check and surfaced via `toast.error`. No backend change
was needed at that point — `updateLeadFunnelColumn()` already accepted
`{ name?, position?, externalStatusKey? }`.

**What still holds from this section**: the minimal-diff `PATCH` body, the
client-side empty-field guard, the `toast.error` surfacing of backend errors,
and "Cancelar discards the buffer and fires no request". **What no longer
holds**: the editor is not inline-in-row, and `externalStatusKey` is not
editable at all.

## Copy change

Both the creation form and the row editor replace the raw `externalStatusKey` placeholder with a real `<label>` ("Clave de estado del CRM") plus a short help paragraph explaining it must match the CRM webhook's `statusKey` for that funnel step, pointing at `docs/LEADS_CRM_SYNC_TESTING_GUIDE.md`. The field's internal name (`externalStatusKey`, in code and in the API contract) is unchanged — this is copy-only. (In the current implementation the editor is a modal and the key is rendered read-only there — see the Phase 14 amendment.)

## Testing note

`reorderFunnelColumns()` is unit-tested in isolation (pure array math, no rendering). The component test (`funnel-columns-admin-table.test.tsx`, fully rewritten — the old buttons-based test suite no longer applies since the buttons were removed) drives the actual `KeyboardSensor` path end-to-end: focus the drag handle, `Space` to pick up, `ArrowDown` to move, `Space` to drop, then asserts the resulting `PATCH` calls and DOM order — plus a rollback case, the row-edit cases (save/empty-guard/backend-error/cancel), and two copy-presence cases (creation form + editor). `HTMLElement.prototype.getBoundingClientRect` is mocked per-row (derived live from DOM sibling order) because jsdom's all-zero rects otherwise make `sortableKeyboardCoordinates` unable to distinguish rows. Phase 14 re-pointed the edit cases at the modal and dropped the `externalStatusKey`-collision case (the field can no longer be edited).

---

# Amendment: UX/bugfix round — navigation, immutable key, delete confirmation, styling, shared DateRangePicker fix

Second acted-on-immediately round over the already-implemented module, applied directly with the user during a fast iteration loop and documented here retroactively. All of it is implemented and covered by green tests. No decision from D1–D23 is reopened; D24–D31 below are new, and D25 explicitly **supersedes** the "inline edit" part of the previous amendment.

## Architecture Decisions

| # | Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|---|
| D24 | `externalStatusKey` is **immutable after creation** | `updateLeadFunnelColumn()` rejects any change: when the input carries `externalStatusKey`, it `findUnique`s the current row and compares the **normalized** requested value against the stored one. Different → `{ data: null, error: 'externalStatusKey no se puede modificar después de creada' }`. Identical → the key is `delete`d from the update payload (harmless no-op) and the rest of the patch proceeds | (a) allow the edit and re-route existing leads; (b) allow the edit and leave leads where they are; (c) block it in the UI only | Changing the key of a live column silently breaks future webhook routing: `resolveFunnelColumn()` would stop matching the old `statusKey` and every subsequent lead would land in "Sin mapear", while leads already assigned to the column would stay put — a split-brain funnel with no error anywhere. The user's product decision is: if another value is needed, **create a new column**. Enforced in the **service**, not just the UI, so the API route and any future caller inherit the guard |
| D25 | Row editor becomes a **modal** | shadcn `Dialog` in `funnel-columns-admin-table.tsx`, opened per row; `name` is the only editable input; `externalStatusKey` is rendered `disabled` with an explanatory note about its immutability | keeping the inline-in-row expansion from the previous amendment | With only one editable field left, the inline expansion added row-height churn and a second visual mode inside a table that also hosts drag & drop. A modal separates the two interactions cleanly, and showing the frozen key read-only (rather than hiding it) is what makes D24 discoverable instead of surprising |
| D26 | `externalStatusKey` / `statusKey` **normalization**, end to end | New pure lib `src/features/leads/lib/normalize-funnel-status-key.ts::normalizeFunnelStatusKey(value)` = `trim().toUpperCase().replace(/\s+/g, '_')`. Applied on **both** sides: at write time in `createLeadFunnelColumn()` / `updateLeadFunnelColumn()`, and at read/match time in `resolveFunnelColumn()` before comparing the incoming webhook `statusKey` | (a) case-insensitive DB collation; (b) `mode: 'insensitive'` on the Prisma query only; (c) normalize on write only | Bug reported by the user: an admin typing `lead nuevo` and a CRM sending `LEAD_NUEVO` never matched, so every lead fell into "Sin mapear". A DB-collation or query-level fix would handle case but not spaces, and would leave the stored value inconsistent. One canonical form, computed by one pure function used on both sides, makes match/no-match a property of the value, not of the query. Pure + DB-free, so it is unit-tested without Prisma (same constraint as D4/D13/D19) |
| D27 | UI live-transforms the key input | The creation form's `externalStatusKey` input uppercases and converts spaces to `_` **as the user types**, deliberately **without** trimming | full `normalizeFunnelStatusKey()` on every keystroke; normalize on blur only; no UI transform at all | The user must see the canonical value they are actually creating. Trimming per keystroke would eat the space the user just typed and make it impossible to author a multi-word key. The final `trim()` is the **service's** job (D26), so the UI transform is a preview, never the authority |
| D28 | Soft-deleted columns **tombstone** their key | `deleteLeadFunnelColumn()` writes `active: false` **and** `externalStatusKey: \`${key}__deleted_${id}\`` in the same update. `createLeadFunnelColumn()`'s duplicate check additionally scopes to `active: true` | (a) drop the `@unique` constraint; (b) partial unique index `WHERE active`; (c) hard delete | Real bug: `LeadFunnelColumn.externalStatusKey` is `@unique` at the DB level, so a soft-deleted row kept occupying its value **forever** — deleting a column permanently blocked re-creating one with the same key. Dropping the constraint loses the routing guarantee that one `statusKey` maps to exactly one column. A partial index would need a migration and is not expressible in Prisma schema today. The tombstone suffix frees the original value while preserving the historical row and its audit trail, with **zero schema change**. Appending the row id keeps the tombstone itself unique even if the same key is created and deleted repeatedly |
| D29 | Delete needs **explicit confirmation** | The "Eliminar" button opens the existing shared `ConfirmActionDialog` (`src/features/shared/ui/confirm-action-dialog.tsx`) explaining that a column with active leads cannot be deleted; the request only fires on confirm | direct delete with an undo toast; `window.confirm` | Deletion is the one destructive action on this screen and it is adjacent to a drag handle, so a mis-drop-turned-misclick is plausible. The shared dialog already exists and is used elsewhere — no new primitive. Undo is not viable because the service tombstones the key (D28) |
| D30 | Admin table layout | Drag handle (`GripVertical`) moves from the trailing "Acciones" cell to a **dedicated leading column** with an `sr-only` header ("Reordenar"). The shared `Table` is used with `containerClassName="h-auto min-h-0 max-h-none overflow-visible"` | patching `src/features/shared/ui/table.tsx`; wrapping the page in a fixed-height flex container | Leading grip is the conventional position and separates "reorder" from "act on the row". The layout bug is real: shared `Table`'s container is `h-full min-h-0 overflow-auto`, designed for fixed-height panels; on this page (no height constraint) it collapsed and clipped rows so not all columns were visible. Overriding via the **existing** `containerClassName` prop fixes this one usage without touching the shared component and therefore without regressing every other table in the app |
| D31 | Kanban column styling | `lead-funnel-column-view.tsx`: header `bg-green-100` / `text-green-900`, container `border-2 border-green-200` + body `bg-green-50/60`, with `dark:` equivalents (`green-900` / `green-950`) | a per-column color palette; theme tokens | User request for clearer column separation. A single green family (strong header, visible 2px border, subtle body) is enough to delimit columns without competing with the outcome badges already on each card. Hardcoded Tailwind greens rather than theme tokens because of the `@config` problem documented in D32 — theme-token classes do not compile in this project |

## Bugfix: shared `DateRangePicker` had no range highlight anywhere in the app

This is a **pre-existing, app-wide** bug found while styling the Leads filter — not introduced by this change.

| # | Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|---|
| D32 | Root cause + fix location | Fix with explicit CSS rules in `src/app/globals.css`, inside the same `@layer base` that already hosts the project's other `!important` patches | (a) add the missing `@config '../../tailwind.config.js'` to `src/app/tailwind.css`; (b) inline the colors as literal Tailwind classes in `calendar.tsx` | **Root cause**: `src/app/tailwind.css` does `@import 'tailwindcss'` (v4) but **never** loads `tailwind.config.js` — the `@config` directive is missing. So no custom color name from that config (`primary`, `accent`, `secondary`, …) ever produces a real utility class. The app only *looks* correct where someone hand-patched it with `!important` in `globals.css` — the pre-existing comment "Forzar estilos de botones para asegurar que se apliquen" is that workaround. `CalendarDayButton`'s conditional classes (`data-[range-start=true]:bg-primary`, `data-[range-middle=true]:bg-accent`, …) had **never** been patched, so the selected range rendered with **no color at all in every date-range picker in the application**. Adding `@config` is the correct root fix but would suddenly activate every custom-color class app-wide — an unbounded visual regression surface that does not belong in this change. Patching the calendar in the same place, the same way, as the existing workarounds is the proportional fix and leaves the root cause documented for a dedicated change |
| D33 | Per-instance calendar theming | New **optional** prop `calendarStyle?: CSSProperties` on `DateRangePicker`, forwarded as `style` to `<Calendar>`, which `react-day-picker` puts on the `data-slot="calendar"` root. Callers pass CSS custom properties (`--primary`, `--accent`, …) | a `variant` prop with named presets; a Leads-specific copy of the picker; Tailwind classes on the caller | CSS custom properties **inherit**, so an inline `style` on the calendar root reaches the D32 rules (which read `hsl(var(--primary))`) without any build-time class generation — precisely the mechanism that is broken here. The prop is optional and unset for every existing caller, so no other picker in the app changes. Duplicating the picker per feature is explicitly forbidden by D18 |

Applied rules (`globals.css`, `@layer base`):

```css
[data-slot='calendar'] [data-selected-single='true'],
[data-slot='calendar'] [data-range-start='true'],
[data-slot='calendar'] [data-range-end='true'] {
  background-color: hsl(var(--primary)) !important;
  color: hsl(var(--primary-foreground)) !important;
}
[data-slot='calendar'] [data-range-middle='true'] {
  background-color: hsl(var(--accent)) !important;
  color: hsl(var(--accent-foreground)) !important;
}
```

Leads-scoped theming (`leads-board-filters.tsx`), passed to the "Fecha de creación" picker only:

```ts
const DATE_RANGE_CALENDAR_STYLE = {
  '--primary': '142 76% 26%',            // range start/end — dark green
  '--primary-foreground': '0 0% 100%',
  '--accent': '142 60% 70%',             // range middle — light green
  '--accent-foreground': '142 80% 15%',
} as React.CSSProperties
```

Net effect: **every** date-range picker in the app now shows its range (default theme colors, thanks to D32); the Leads filter additionally shows it in green (D33).

## Bugfix: the "Leads" menu entry was invisible to every role

Phase 4.9 added `Leads` to `ALL_MENU_ITEMS`, but `buildMenuByRole()` (`src/lib/navigation/menu-builder.ts`) is an **allow-list**: it iterates `ALL_MENU_ITEMS` and only pushes an item when an explicit branch matches its `title`. With no `Leads` branch, the item was silently dropped for every non-`AGENTE` role. `AGENTE` is worse — it returns a completely separate `AGENTE_MENU_ITEMS` array early, which did not contain the item at all.

| File | Fix |
|---|---|
| `src/lib/navigation/menu-builder.ts` | Added `if (item.title === 'Leads') { filteredItems.push(item); continue }` — unconditionally visible, exactly like the existing `Mis distribuciones` branch. **Rationale**: there is no `permissions.leads` flag, and adding one would be a permissions-model change out of scope here. Which leads a user actually sees is already resolved by hierarchy scoping inside the module (`buildLeadListWhere()` + `getAccessibleUserIds()`), so menu visibility is not the access-control boundary |
| `src/lib/navigation/menu-items.tsx` | Added the same `Leads` entry to `AGENTE_MENU_ITEMS` (separate array, bypasses the filter loop entirely) |
| `src/lib/navigation/menu-items.tsx` | Admin sub-entry copy: "Columnas de Leads" → **"Columnas del Funnel de Leads"** (user request; URL `/dashboard/admin/lead-funnel-columns` unchanged) |

## File Changes (this round)

| File | Action | Description |
|---|---|---|
| `src/lib/navigation/menu-builder.ts` | Modify | `Leads` branch in `buildMenuByRole()` |
| `src/lib/navigation/menu-items.tsx` | Modify | `Leads` in `AGENTE_MENU_ITEMS`; admin sub-entry renamed |
| `src/features/leads/lib/normalize-funnel-status-key.ts` | Create | Pure `normalizeFunnelStatusKey()` (D26) |
| `src/features/leads/lib/__tests__/normalize-funnel-status-key.test.ts` | Create | Unit tests for the canonical form |
| `src/features/leads/services/lead-funnel-column.service.ts` | Modify | Normalize on create/update (D26); immutable-key guard (D24); tombstone on soft delete + `active: true` in the duplicate check (D28) |
| `src/features/leads/services/lead-sync.service.ts` | Modify | `resolveFunnelColumn()` normalizes the incoming `statusKey` before matching (D26) |
| `src/features/leads/components/funnel-columns-admin-table.tsx` | Modify | Edit modal, name-only (D25); live key transform on the create input (D27); `ConfirmActionDialog` before delete (D29); leading grip column + `containerClassName` override (D30) |
| `src/features/leads/components/lead-funnel-column-view.tsx` | Modify | Green header/border/body (D31) |
| `src/features/shared/ui/date-range-picker.tsx` | Modify | Optional `calendarStyle` prop forwarded to `<Calendar>` (D33) |
| `src/features/shared/ui/calendar.tsx` | Modify | Forward `style` through to the `data-slot="calendar"` root (D33) |
| `src/app/globals.css` | Modify | `@layer base` rules restoring range highlight app-wide (D32) |
| `src/features/leads/components/leads-board-filters.tsx` | Modify | `calendarStyle={DATE_RANGE_CALENDAR_STYLE}` on the "Fecha de creación" picker (D33) |
| `docs/LEADS_CRM_SYNC_TESTING_GUIDE.md` | Create | Manual testing guide: ready-to-run `curl`s for `POST /api/leads/crm-sync`, full payload contract, and UI verification steps |

No schema change, no migration, no API-contract change. `PATCH /api/leads/funnel-columns/[id]` still accepts `{ name?, position?, externalStatusKey? }` — the key is now rejected-or-no-op at the service level rather than removed from the contract, so no route or client type changes.

## Testing (this round)

| Layer | What | How |
|---|---|---|
| Unit | `normalizeFunnelStatusKey()`: lowercase → uppercase, surrounding whitespace trimmed, single and multiple inner spaces → one `_`, already-canonical value is idempotent | pure, no DB |
| Unit/Service | `updateLeadFunnelColumn()`: a **different** `externalStatusKey` → error, `prisma.update` never called; the **same** (or same-after-normalization) key → update proceeds with the field stripped from the payload; column not found → "Columna no encontrada" | mocked Prisma |
| Unit/Service | `createLeadFunnelColumn()` stores the normalized key; duplicate check scoped to `active: true` so a tombstoned key does not block creation | mocked Prisma |
| Unit/Service | `deleteLeadFunnelColumn()` writes both `active: false` **and** the `__deleted_<id>` tombstone key; still blocked for `isFallback` and for columns with active leads | mocked Prisma |
| Unit/Service | `resolveFunnelColumn()` matches a lowercase/spaced incoming `statusKey` against a canonical stored key | mocked Prisma |
| Component | Admin table: edit modal opens with `name` editable and `externalStatusKey` `disabled`; delete opens `ConfirmActionDialog` and only fires the request on confirm | Testing Library |

## Risks (this round)

| Risk | Status |
|---|---|
| Columns created **before** D26 may hold non-canonical keys (e.g. `lead nuevo`) and will stop matching once the webhook normalizes | **Open, accepted, low.** No data backfill was run. `externalStatusKey` is now immutable (D24), so such a column cannot be repaired by editing — the documented remedy is to delete it (which frees the key via D28) and create it again. Any mismatch is non-destructive: leads land in "Sin mapear" and are visibly surfaced on the board |
| `tailwind.config.js` is still not loaded via `@config` | **Open, out of scope.** Root cause documented in D32; the app continues to depend on hand-written `!important` patches for custom-color classes. Adding `@config` would activate every custom-color utility at once and warrants its own change with a full visual pass |
| Tombstoned keys accumulate in the table | **Accepted.** One inert row per deleted column, with a suffixed key that can never collide (row id) and can never be matched by a webhook. Preserving the row is deliberate — it keeps the audit trail intact |
| `Leads` is visible to every role with no permission flag | **Accepted, by design.** Matches the existing `Mis distribuciones` precedent; the real access boundary is the hierarchy scoping inside the module, not the menu |
