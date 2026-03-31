# Delta Spec: pre-liquidacion
# Change: preliquidar-sync-por-tipo

## MODIFIED Requirements

### Requirement: Detail Page Lists PRE-SETTLED Commissions

(Previously: `/dashboard/pre-liquidacion/[fileId]` queried `SettlementCommission` where `status = 'SYNCHRONIZED'`.)

The detail page MUST now query `SettlementCommission` where `status = 'PRE-SETTLED'` for the given `fileId`.

Column headers and empty-state copy MUST clearly indicate that the shown records are in PRE-SETTLED status.

#### Scenario: Detail page shows PRE-SETTLED records

- GIVEN a user navigates to `/dashboard/pre-liquidacion/[fileId]`
- WHEN the page loads
- THEN only commissions with `status = 'PRE-SETTLED'` are displayed in the table

#### Scenario: No PRE-SETTLED records exist for the file

- GIVEN a `fileId` that has zero PRE-SETTLED commissions
- WHEN the detail page loads
- THEN an empty state is shown with copy indicating no pre-settled commissions are available

---

## ADDED Requirements

### Requirement: New Service Function for PRE-SETTLED Query

The `pre-liquidacion.service.ts` MUST expose `obtenerComisionesPreliquidadas(fileImportId: number)` that returns all `SettlementCommission` records where `status = 'PRE-SETTLED'` and `fileImportId` matches.

#### Scenario: Returns correct records

- GIVEN `fileImportId = 7` with three PRE-SETTLED commissions
- WHEN `obtenerComisionesPreliquidadas(7)` is called
- THEN exactly those three records are returned

#### Scenario: Returns empty array when none exist

- GIVEN `fileImportId = 99` with no PRE-SETTLED commissions
- WHEN `obtenerComisionesPreliquidadas(99)` is called
- THEN an empty array is returned (no error thrown)
