# Design: Editar fecha de fondeo con validación de soportes

## Technical Approach

Mirror the `dateIssued` inline-edit pattern for `dateAnchored`. A new dedicated
`PATCH /api/negocios/[id]/date-anchored` route (HTTP layer only) delegates to a new
feature-service fn `updateBusinessDateAnchored()` that runs one `prisma.$transaction`
updating `Business.dateAnchored` and the first-installment `Payment` (`installmentIndex === 1`,
`updateMany`) together. Both funding routes (`/fondear`, `/fondear-aportes`) gain an early
`supportCount > 0` guard via a shared `assertHasSupports()` helper returning a typed error the
UI maps to a block modal. A standalone Node+Prisma remediation script reverts historically
funded-without-support businesses. Dead `fondear-anualidades` route/schema/tests deleted last.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|----------|--------|----------|-----------|
| Edit transport | New `PATCH /[id]/date-anchored` route | Extend main `PUT /[id]` | SRP: date+payment sync is atomic/domain-specific; keeps the generic PUT thin (matches existing `/aportes/[index]/date-anchored`) |
| Payment sync | `updateMany` where `installmentIndex === 1` inside tx | Loop all installments / recalc periods | Proposal scopes sync to installment 1 only; `updateMany` is a no-op (count 0) for HU3 businesses without payments — no error path |
| Support guard | Shared service helper `assertHasSupports(businessId)` returning `{ ok:false, code:'NO_SUPPORTS' }` | Inline `_count` in each route | DRY across HU3/HU4; keeps Prisma out of route handlers per project rules |
| Support count source | `BusinessSupport` where `status === true` (soft-delete aware) | Raw row count | Deactivated supports must not satisfy the compliance gate |
| Date handling | `dateOnlyToBogotaNoonUtc()` in / `formatDateBogota()` out | `new Date(str)` | Avoids ±1 day Bogota/UTC drift (mandatory convention) |
| Remediation | Standalone script, `--dry-run` default + `--apply` | Migration / API endpoint | One-off data cleanup, needs operator audit trail, not part of runtime |

## Data Flow

    BusinessTableSection (editable dateAnchored cell)
         │ onSaveDateAnchored(id, "YYYY-MM-DD")
         ▼
    negocios-page-client.handleSaveDateAnchored
         │ businessService.updateDateAnchored(id, date)
         ▼
    PATCH /api/negocios/[id]/date-anchored  (auth → canFundPayments → Zod)
         │ dateOnlyToBogotaNoonUtc(date)
         ▼
    updateBusinessDateAnchored(id, actor, date)  ── $transaction ──┐
         ├─ business.update  { dateAnchored }                       │
         └─ payment.updateMany { installmentIndex:1 } { dateAnchored }
         │ logAuditEvent(BUSINESS_DATE_ANCHORED_UPDATED)
         ▼ ApiResponse<BusinessEntity> → refetch()

    Funding (HU3/HU4):  route → assertHasSupports(id) → 409 NO_SUPPORTS → block modal

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/api/negocios/[id]/date-anchored/route.ts` | Create | PATCH: auth, permission, Zod, future-date guard, delegate to service |
| `src/features/negocios/services/business.service.ts` | Modify | `updateBusinessDateAnchored()` (tx) + `assertHasSupports()`; client `updateDateAnchored()` |
| `src/features/negocios/lib/date-anchored.schema.ts` | Create | Zod body schema (shared with route) |
| `src/features/negocios/components/BusinessTableSection.tsx` | Modify | Editable `dateAnchored` cell + `onSaveDateAnchored`; block modal on `supportCount === 0` |
| `src/app/dashboard/negocios/negocios-page-client.tsx` | Modify | `handleSaveDateAnchored` wire-up |
| `src/app/api/negocios/[id]/fondear/route.ts` | Modify | `assertHasSupports` guard before status flip |
| `src/app/api/negocios/[id]/fondear-aportes/route.ts` | Modify | Same guard on first funding batch |
| `src/features/auth/lib/audit-logger.ts` | Modify | Add `BUSINESS_DATE_ANCHORED_UPDATED`, `BUSINESS_REMEDIATION_REVERTED` |
| `scripts/remediate-unsupported-funded-businesses.js` | Create | Revert funded-without-support businesses |
| `fondear-anualidades` route + schema + tests | Delete | Dead code cleanup (final isolated step) |

## Interfaces / Contracts

```ts
// date-anchored.schema.ts
export const dateAnchoredBodySchema = z.object({
  dateAnchored: z.string().regex(/^\d{4}-\d{2}-\d{2}$/,
    { message: 'dateAnchored must be in YYYY-MM-DD format' }),
})

// business.service.ts
type SupportGuard = { ok: true } | { ok: false; code: 'NO_SUPPORTS' }
async function assertHasSupports(businessId: number): Promise<SupportGuard>
// counts BusinessSupport where { businessId, status: true }

async function updateBusinessDateAnchored(
  businessId: number, actor: Actor, dateAnchored: Date
): Promise<{ ok: true; business: BusinessEntity } | { ok: false; code: 'NOT_FOUND' }>
```

PATCH contract: `200 ApiResponse<BusinessEntity>` | `400` invalid/future date | `403` no permission
| `404` not found. Funding block: `409 { data:null, error:'No se puede fondear sin soportes adjuntos' }`.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `updateBusinessDateAnchored` tx: business + installment-1 sync; no-op when no payments | Mock `prisma.$transaction`/`updateMany`; assert calls + audit |
| Unit | `assertHasSupports`: 0 active → NO_SUPPORTS; deactivated ignored | Mock `businessSupport.count` |
| Unit | Zod schema: reject bad format, accept valid | Direct `safeParse` |
| Unit | Table cell: editable only with `canFundPayments`; modal when `supportCount===0` | RTL render + interaction |
| Integration | PATCH route 200/400/403/404; future-date reject | Mock auth + service |
| Integration | `/fondear` & `/fondear-aportes` 409 when no supports; happy path unaffected | Extend existing route tests |
| Script | dry-run reports without mutation; apply reverts + audits | Seed test business, assert status/dateAnchored NULL |

## Migration / Rollout

No schema migration. Remediation script run manually (`--dry-run` then `--apply`) post-deploy.
Single-PR revert restores read-only cell.

## Open Questions

- [ ] Confirm no commission/period recalculation on `dateAnchored` edit (assumption 1).
- [ ] `dateAnchored` editable regardless of funding state, permission-gated only (assumption 3).
