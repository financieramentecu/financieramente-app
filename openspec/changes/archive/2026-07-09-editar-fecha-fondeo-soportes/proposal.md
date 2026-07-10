# Proposal: Editar fecha de fondeo con validación de soportes y sincronización del primer pago

## Intent

Operations users can inline-edit `Business.dateIssued` in the negocios table but NOT `dateAnchored` (funding date) — it renders read-only. When a funding date is wrong they must re-fund or touch the DB. This change makes `dateAnchored` inline-editable, keeps `Payment` (installment 1) in sync automatically, and blocks funding a business that has no payment supports attached — closing a compliance gap where deals get funded without proof.

## Scope

### In Scope
- Inline edit of `Business.dateAnchored` in the negocios table (replicating the `dateIssued` pattern, BusinessTableSection.tsx L357–482).
- Transactional sync: on `dateAnchored` change, update `Payment.dateAnchored` where `installmentIndex === 1`.
- Support validation (`supportCount > 0`) on BOTH funding endpoints: `/fondear` (HU3) and `/fondear-aportes` (HU4). Block with modal "No se puede fondear sin soportes adjuntos".
- Reuse `canFundPayments()` permission gate (ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE).
- Audit log every date edit and blocked-funding attempt.
- Remove dead code: `/fondear-anualidades/route.ts` + `fondear-anualidades.schema.ts` + their tests.
- **Remediation script**: SQL + Node.js script to revert any businesses that were improperly funded WITHOUT supports before this validation was added:
  - Find all `Business` with status = FONDEADO and `supportCount === 0`.
  - Revert their status to EMITIDO.
  - Reset all associated `Payment` rows to status = SIN_FONDEAR.
  - Clear `Business.dateAnchored` and all `Payment.dateAnchored` to NULL.
  - Log remediation action with audit trail (operator, timestamp, affected business IDs).

### Out of Scope
- Editing per-aporte funding dates (already exists at `/aportes/[index]/date-anchored`).
- Bulk/mass date edits; changing funding business logic itself.
- Retroactive recalculation of commissions/periods from the new date.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `negocios`: `dateAnchored` becomes user-editable inline; funding requires `supportCount > 0` on both HU3 and HU4 flows; editing `dateAnchored` cascades to the first-installment payment.

## Approach

Mirror the existing `dateIssued` inline-edit cell + `onSaveDateIssued` handler for `dateAnchored`, backed by a new PATCH endpoint that runs a `prisma.$transaction` updating `Business.dateAnchored` and `Payment(installmentIndex=1).dateAnchored` together. Add a `supportCount > 0` guard early in both funding route handlers (delegated to the feature service), returning a typed error the UI maps to the block modal. Delete the orphan route/schema/tests as an isolated final step.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `BusinessTableSection.tsx` | Modified | Editable `dateAnchored` cell + `onSaveDateAnchored`; consume `supportCount` for block modal |
| `src/app/api/negocios/[id]/date-anchored/route.ts` (or similar) | New | PATCH: transactional Business + Payment sync |
| `negocios/services` | Modified | Sync service fn; `supportCount` guard helper |
| `src/app/api/negocios/[id]/fondear/route.ts` | Modified | Reject when `supportCount === 0` |
| `src/app/api/negocios/[id]/fondear-aportes/route.ts` | Modified | Reject when `supportCount === 0` |
| `audit-logger.ts` | Modified | New `BUSINESS_DATE_ANCHORED_UPDATED` action; also new `BUSINESS_REMEDIATION_REVERTED` |
| `fondear-anualidades` route + schema + tests | Removed | Dead code cleanup |
| `scripts/remediate-unsupported-funded-businesses.js` | New | Remediation script: revert funded businesses without supports |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Bogota/UTC date drift on `dateAnchored` | Med | Use `dateOnlyToBogotaNoonUtc()` / `formatDateBogota()` |
| Payment sync misses non-standard first installment | Med | Filter strictly by `installmentIndex === 1`; cover with test |
| Removing route breaks a hidden caller | Low | Grep confirmed only self-tests reference it |
| Support guard blocks legitimate already-funded flows | Low | Guard only new funding actions, not edits |

## Remediation & Data Cleanup

**Objective**: Revert any businesses that were incorrectly funded **before** this validation was in place (i.e., those with `status = FONDEADO` AND `supportCount === 0`).

**Script Tasks**:
1. Query: `SELECT idBusiness FROM business WHERE status = 'FONDEADO' AND id NOT IN (SELECT DISTINCT business_id FROM business_support WHERE status = true)`
2. For each affected business:
   - Set `business.status = 'EMITIDO'`
   - Set `business.dateAnchored = NULL`
   - Update all `payments` rows: `status = 'SIN_FONDEAR'`, `dateAnchored = NULL`
   - Log to `audit_log`: action = `BUSINESS_REMEDIATION_REVERTED`, include businessId, oldStatus, operator, timestamp
3. Report: count of reverted businesses, affected payment rows, confirmation query.
4. Optional: run as dry-run first (report without commit), then with `--apply` flag for real execution.

**Output**: New file `scripts/remediate-unsupported-funded-businesses.js` (Node.js + Prisma) with CLI args for dry-run / apply / filter.

## Rollback Plan

Single-PR revert. Removing the endpoint + UI cell restores prior read-only behavior; no schema migration involved, so no data rollback needed. Remediation script output can be stored as audit trail for reversal if needed.

## Dependencies

- Existing `supportCount` already flows to BusinessTableSection (currently discarded).
- Existing `canFundPayments()` in `src/features/auth/lib/roles.ts`.

## Success Criteria

- [ ] User with funding permission edits `dateAnchored` inline and it persists.
- [ ] First-installment `Payment.dateAnchored` updates in the same transaction.
- [ ] Funding a business with `supportCount === 0` is blocked with the modal on both `/fondear` and `/fondear-aportes`.
- [ ] Every edit and blocked attempt is written to `AuditLog`.
- [ ] `fondear-anualidades` route/schema/tests are gone and the build/tests stay green.
- [ ] Remediation script successfully identifies and reverts (dry-run + apply modes) all previously-funded-without-supports businesses.
- [ ] Remediation audit log entries created for each reverted business.

## Proposal question round (assumptions to confirm)

User pre-confirmed all core decisions. Residual assumptions to validate before spec:
1. Editing `dateAnchored` does NOT trigger commission/period recalculation (treated as pure correction).
2. Only installment index 1 syncs; other installments keep their own dates.
3. `dateAnchored` is editable regardless of current funding state (no state-machine restriction beyond permission).
