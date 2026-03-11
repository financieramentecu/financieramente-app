# Delta for Pre-liquidación — clawback persistence and balance by flow

This delta adds requirements for persisting clawback and updating per-user clawback balance during pre-liquidación, with behavior that depends on commission type and flow (Voluntarias, Poliza CARTERA, Poliza no-CLAW, Poliza CLAW). It also adds requirements for historial visibility: results and export APIs SHALL use the canonical state `PRE-SETTLED`, and the file list SHALL include both pending and pre-liquidated files with correct live counts. Existing requirements FR-01, FR-02, FR-03 (visibility and filtering) are unchanged.

## ADDED Requirements

### Requirement: Pre-liquidación flow derivation

The system SHALL derive a pre-liquidación flow for each `SettlementCommission` record being processed, based only on `commissionType`, `originCommission`, and `isClawback`. The flow SHALL determine whether clawback is persisted and whether the user's clawback balance is increased, decreased, or unchanged.

- Flow **Voluntarias**: `commissionType === 'VOLUNTARIA'`.
- Flow **Poliza CLAW**: `commissionType === 'POLIZA'` AND `isClawback === true` (evaluated before CARTERA so that CARTERA + CLAW is treated as CLAW).
- Flow **Poliza CARTERA**: `commissionType === 'POLIZA'` AND `originCommission === 'CARTERA'`.
- Flow **Poliza no-CLAW**: `commissionType === 'POLIZA'` AND `isClawback === false` AND not CARTERA (or any other Poliza case not already classified).

#### Scenario: Voluntarias — no clawback persistence

- GIVEN a registro with `commissionType === 'VOLUNTARIA'`
- WHEN pre-liquidación processes that registro
- THEN the system SHALL create `ComissionDistribution` rows with discount applied as today
- AND SHALL NOT create any `Clawback` row for that registro
- AND SHALL NOT create or update `ClawbackBalance` for any user for that registro

#### Scenario: Poliza CARTERA — clawback added to balance

- GIVEN a registro with `commissionType === 'POLIZA'`, `originCommission === 'CARTERA'`, `isClawback === false`, and `clawbackPercentage` such that `valorClawback > 0` for at least one category
- WHEN pre-liquidación processes that registro
- THEN the system SHALL create `ComissionDistribution` rows using `porcentaje_portfolio` and apply discount and clawback
- AND SHALL create one `Clawback` row per `ComissionDistribution` that has `valorClawback > 0`, linked to that distribution and to the user who owns the business (`business.user.idUser`)
- AND SHALL create or update `ClawbackBalance` for that user by **adding** the registro's total clawback amount (sum of `valorClawback` over all categories)

#### Scenario: Poliza no-CLAW — clawback added to balance

- GIVEN a registro with `commissionType === 'POLIZA'`, `isClawback === false`, and `clawbackPercentage` such that `valorClawback > 0` for at least one category
- WHEN pre-liquidación processes that registro
- THEN the system SHALL create `ComissionDistribution` rows and apply discount and clawback
- AND SHALL create one `Clawback` row per `ComissionDistribution` with `valorClawback > 0`, linked to that distribution and to `business.user.idUser`
- AND SHALL create or update `ClawbackBalance` for that user by **adding** the registro's total clawback amount

#### Scenario: Poliza CLAW — clawback subtracted from balance

- GIVEN a registro with `commissionType === 'POLIZA'` AND `isClawback === true` (clawback percentage on the record is zero; amount is taken from the user's general clawback balance)
- WHEN pre-liquidación processes that registro
- THEN the system SHALL create `ComissionDistribution` rows (distribute by category; discount applied; clawback percentage 0 on record)
- AND SHALL compute the amount to debit from the user's clawback balance as follows: for each category, `valorComisionBruta * activeClawbackPercentage` (where `activeClawbackPercentage` is the active CommissionDiscount for type CLAWBACK, or a defined fallback if none); the total debit SHALL be the sum over all categories
- AND SHALL create one `Clawback` row per `ComissionDistribution` with `valueClawback` equal to that category's share of the total debit, linked to that distribution and to `business.user.idUser`
- AND SHALL create or update `ClawbackBalance` for that user by **subtracting** the total debit amount
- AND the system MAY allow `ClawbackBalance.totalAmount` to become negative (no cap at zero in this change)

#### Scenario: Poliza CARTERA + CLAW — treated as Poliza CLAW

- GIVEN a registro with `commissionType === 'POLIZA'`, `originCommission === 'CARTERA'`, and `isClawback === true`
- WHEN the system derives the flow for that registro
- THEN the flow SHALL be Poliza CLAW (subtract from balance), not Poliza CARTERA (add to balance)

### Requirement: Clawback row and balance user

The system SHALL associate each `Clawback` row and each `ClawbackBalance` update with the user who owns the business of the commission record. The user SHALL be the agent: `business.user.idUser` (the business owner). The system MUST NOT use the file uploader or any other user for Clawback or ClawbackBalance.

#### Scenario: Clawback linked to business owner

- GIVEN a registro with `business.user.idUser === 42`
- WHEN the system creates a `Clawback` row or updates `ClawbackBalance` for that registro
- THEN `Clawback.idUser` SHALL be 42
- AND the `ClawbackBalance` row SHALL be the one for `idUser === 42`

### Requirement: Clawback initial state and balance atomicity

When creating a `Clawback` row, the system SHALL set `state` to `'RETENIDO'`. The system SHALL perform all persistence for a single `SettlementCommission` (all `ComissionDistribution` creates, all `Clawback` creates, all `ClawbackBalance` create/update, and the `SettlementCommission` status update to `PRE-SETTLED`) within a single transactional boundary so that either all of these writes succeed or none do.

#### Scenario: Transaction rollback on failure

- GIVEN a registro being processed and the transaction has created at least one `ComissionDistribution` and is about to create a `Clawback`
- WHEN the creation of a `Clawback` row fails (e.g. constraint or DB error)
- THEN the entire transaction for that registro SHALL be rolled back
- AND no `ComissionDistribution` for that registro SHALL remain
- AND the `SettlementCommission` SHALL NOT be updated to `PRE-SETTLED`

#### Scenario: Idempotency — only SYNCHRONIZED processed

- GIVEN a `SettlementCommission` with status `PRE-SETTLED` or any status other than `SYNCHRONIZED`
- WHEN pre-liquidación runs for the same file and date range
- THEN the system SHALL NOT process that record again (it SHALL only select records with status `SYNCHRONIZED`)
- AND SHALL NOT create duplicate `Clawback` rows for the same `ComissionDistribution` (enforced by unique constraint on `idComissionDistribution`)

### Requirement: No clawback persistence when valorClawback is zero (Poliza non-CLAW)

For flows Poliza CARTERA and Poliza no-CLAW, when the computed `valorClawback` is zero for every category (e.g. `clawbackPercentage` is 0), the system SHALL NOT create any `Clawback` row and SHALL NOT update `ClawbackBalance` for that registro.

#### Scenario: Poliza with zero clawback percentage

- GIVEN a registro with `commissionType === 'POLIZA'`, `isClawback === false`, and `clawbackPercentage === 0`
- WHEN pre-liquidación processes that registro
- THEN the system SHALL create `ComissionDistribution` rows only
- AND SHALL NOT create `Clawback` rows
- AND SHALL NOT update `ClawbackBalance`

### Requirement: Pre-liquidación data access for flow and user

The system SHALL load, when fetching `SettlementCommission` records for pre-liquidación, the fields `commissionType`, `originCommission`, and `isClawback`, and SHALL include the related `business` with its `user` (so that `business.user.idUser` is available). This data SHALL be sufficient to derive the flow and to associate Clawback and ClawbackBalance with the correct user without further queries inside the transaction.

#### Scenario: Query includes business and user

- GIVEN the pre-liquidación process fetches registros for a file and date range
- WHEN the query is executed
- THEN each returned record SHALL include `commissionType`, `originCommission`, `isClawback`, and `business` with `user` (at least `idUser`)
- AND the service SHALL NOT need to query `User` or `Business` again inside the per-registro transaction to create Clawback or update ClawbackBalance

### Requirement: Pre-liquidación results and export use PRE-SETTLED state

The system SHALL use the canonical state value `PRE-SETTLED` when querying pre-liquidated commission records for historial (results) and export. Any API that returns or filters by pre-liquidated commissions SHALL filter `SettlementCommission` by `status === 'PRE-SETTLED'` and SHALL NOT use any other string (e.g. `PRELIQUIDADO`) for that filter.

#### Scenario: Historial results return data after pre-liquidating

- GIVEN a file has been pre-liquidated and at least one `SettlementCommission` has status `PRE-SETTLED`
- WHEN the client requests results for that file (e.g. GET pre-liquidación resultados for that fileId)
- THEN the system SHALL return those commission records with status `PRE-SETTLED`
- AND the response SHALL include the expected distributions and metadata so the historial tab shows data

#### Scenario: Export returns data after pre-liquidating

- GIVEN a file has been pre-liquidated and at least one `SettlementCommission` has status `PRE-SETTLED`
- WHEN the client requests export for that file (e.g. POST pre-liquidación exportar for that fileId)
- THEN the system SHALL include those commission records with status `PRE-SETTLED` in the export
- AND the export SHALL NOT be empty due to a status filter mismatch

### Requirement: File list for pre-liquidación includes pending and pre-liquidated files

The system SHALL list file imports available for pre-liquidación (e.g. for the pre-liquidación screen) such that: (1) a file SHALL appear if it has at least one `SettlementCommission` with status `SYNCHRONIZED` OR at least one with status `PRE-SETTLED`; (2) for each file, the system SHALL expose a live count of commissions with status `SYNCHRONIZED` (sincronizados) and a live count with status `PRE-SETTLED` (registrosPreliquidados). The UI "Pendientes" tab SHALL use sincronizados > 0 to show files that can still be pre-liquidated; the "Histórico" tab SHALL use registrosPreliquidados > 0 to show files that have pre-liquidated records.

#### Scenario: Pre-liquidated file remains in list

- GIVEN a file whose commissions have all been pre-liquidated (all `SettlementCommission` records for that file have status `PRE-SETTLED`)
- WHEN the client requests the list of files for pre-liquidación
- THEN the system SHALL include that file in the list
- AND the file SHALL have registrosPreliquidados equal to the number of PRE-SETTLED commissions for that file
- AND the file SHALL appear in the "Histórico" tab when the UI filters by registrosPreliquidados > 0

#### Scenario: Pending file shows correct counts

- GIVEN a file that has at least one `SettlementCommission` with status `SYNCHRONIZED` and none with status `PRE-SETTLED`
- WHEN the client requests the list of files for pre-liquidación
- THEN the system SHALL include that file in the list
- AND sincronizados SHALL equal the count of SYNCHRONIZED commissions for that file
- AND registrosPreliquidados SHALL be 0
- AND the file SHALL appear in the "Pendientes" tab when the UI filters by sincronizados > 0

#### Scenario: File with both pending and pre-liquidated records

- GIVEN a file that has at least one `SettlementCommission` with status `SYNCHRONIZED` and at least one with status `PRE-SETTLED`
- WHEN the client requests the list of files for pre-liquidación
- THEN the system SHALL include that file in the list
- AND sincronizados SHALL equal the count of SYNCHRONIZED commissions
- AND registrosPreliquidados SHALL equal the count of PRE-SETTLED commissions
- AND the file MAY appear in both Pendientes and Histórico depending on UI logic (e.g. show in both or in the tab that matches the user's intent)

## MODIFIED Requirements

None. Existing requirements FR-01, FR-02, FR-03 (visibility and filtering) remain unchanged.

## REMOVED Requirements

None.
