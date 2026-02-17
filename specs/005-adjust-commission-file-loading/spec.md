# Feature Specification: Adjust File Loading and Commission Calculations

**Feature Branch**: `005-adjust-commission-file-loading`  
**Created**: 2026-02-16  
**Status**: Draft  
**Input**: User description: "Adjust file loading and commission calculations for Voluntarias, Polizas, and Clawbacks based on screenshots and Excel examples. Include dynamic hierarchy and discount-based calculations."

## Clarifications

### Session 2026-02-16
- Q: Which rounding policy should be applied to intermediate and final commission calculations? → A: Standard Rounding to 3 decimals (Half-Up).
- Q: How should we identify the "Cartera" business origin in the Polizas file? → A: Use a new optional field `originCommission` in `SettlementCommission`. If the Excel column "Plan de Compensación" equals `PROMOTOR_FRONT19_OMPEV`, save as `CARTERA`, otherwise `null`.
- Q: Where should the 12% tax and 10% clawback percentages be stored? → A: In a new configurable table `CommissionConfiguration` (formerly `Discount`). Values are snapshotted into records, so NO hard relation is required.
- Q: How should we track clawbacks? → A: Using a `ClawbackBalance` table for the current total and a `Clawback` table for movements with states `ACUMULADO` (retention) and `DESCONTADO` (adjustment).
- Q: How do we handle changes in percentages for historical records? → A: Snapshot the percentages (`appliedDiscountPercentage`, `appliedClawbackPercentage`) at the time of import/calculation into the settlement and distribution records.
- Q: How should the system handle and report row-level validation errors during batch import? → A: Skip and Collect Errors (Import valid rows, report failures in a summary).
- Q: If a Coach has no assigned Leader, how should the Leader commission be handled? → A: Skip missing Level (No distribution is generated for that specific role).
- Q: ¿Cómo debe manejar el sistema los registros de periodos de liquidación ya CERRADOS? → A: Bloquear Importación (Rechazar el archivo o los registros si el periodo está cerrado).
- Q: What happens if a manual adjustment exceeds the current ClawbackBalance? → A: Allow negative balance (The balance becomes negative, representing a debt).
- Q: Do clawbacks (retentions or adjustments) apply to Voluntarias? → A: No, clawbacks are strictly for Polizas.
- Q: How should the admin see progress for large batch imports? → A: Combined approach: A real-time progress bar (0-100%) and a detailed summary at the end (Success count + failed row details).
- Q: How should the system handle missing or invalid mandatory data (e.g., empty Commission Value)? → A: Skip with error (The row is skipped, recorded as a failure, and detailed in the summary).
- Q: How should the system handle multi-currency files? → A: Assume all are COP (Files are strictly in COP, no conversion logic needed).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import Voluntarias File (Priority: P1)

As an administrator, I want to upload a "Voluntarias" Excel file and have the system calculate commissions using hierarchical formulas where "parents" (Leader, Agency) are calculated relative to the Coach's commission or total, and all net values are derived after a common tax discount.

**Why this priority**: Core requirement for handling the most frequent file type.
**Acceptance Scenarios**:
1. **Given** a "Voluntarias" record with $1,000,000 commission, **When** processed, **Then**:
    - **Coach Bruta** = $641,900 (64.19%)
    - **Coach Neta** = $564,872 (Bruta - 12% discount)
    - **Leader Bruta** = $35,317.34 (5.502% of Coach Bruta)
    - **Leader Neta** = $31,079.26 (Bruta - 12% discount)
    - **Agency Bruta** = $45,000 (4.5% of total commission)
    - **Agency Neta** = $39,600 (Bruta - 12% discount)

---

### User Story 2 - Import Polizas File with Origin Logic (Priority: P1)

As an administrator, I want to upload a "Polizas" file where the Coach's percentage varies by business origin and a 10% clawback is subtracted from the Neta commission for all roles.

**Why this priority**: Essential for complex policy-based distributions.
**Acceptance Scenarios**:
1. **Given** a "Propio" origin record, **When** processed, **Then** Coach uses 77.9449% base.
2. **Given** a "Vortex/Asesoria" origin record, **When** processed, **Then** Coach uses 64.19% base.
3. **Given** any policy record, **When** calculating Neta, **Then** subtract 10% Clawback from the amount after the 12% tax discount.

---

### User Story 3 - Dynamic Hierarchy & Claw Variations (Priority: P2)

As an administrator, I want "claw" type records to reduce the user's reserve and the system to dynamically resolve the hierarchy (e.g., if a Coach has no Leader, the calculation stops or follows the next level).

**Why this priority**: Ensures robustness across different organizational structures and return scenarios.
**Acceptance Scenarios**:
1. **Given** a record within the "Polizas" file with `descripcion` containing 'claw', **When** processed, **Then** create negative distributions linked to the user's `Clawback` reserve.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Flow Intervention Points
- **Flow 1: File Import (Carga)**: 
    - Identify `commissionType` (VOLUNTARIA/POLIZA).
    - Save raw records (`SettlementCommission`).
- **Flow 2: Pre-Liquidation (Engine)**:
    - Apply custom formulas based on `commissionType`.
    - Handle hierarchical distribution.
    - Calculate 10% clawback retention for Polizas.
- **Flow 3: Balance Adjustment (Claw)**:
    - Handle 'claw' records as negative distributions.
    - Subtract from user's `Clawback` reserve balance.

#### File Import & Detection
- **FR-001**: System MUST identify the file type ("Voluntarias" vs "Polizas") automatically or via user input and store it in `commissionType`.
- **FR-001b**: System MUST populate `originCommission` as `CARTERA` if the "Plan de Compensación" column equals `PROMOTOR_FRONT19_OMPEV`, otherwise `null`.
- **FR-002**: System MUST capture the `descripcion` to identify "claw" adjustments.
- **FR-002b**: During batch import, the system MUST provide a **real-time progress bar** and, upon completion, skip rows with validation errors while providing a **detailed summary** of failed rows to the user.

#### Calculation Engine (Dynamic formulas)
- **FR-003**: System MUST calculate **Bruta** commissions during the **Pre-Liquidation** stage by fetching percentages from configuration tables:
    - **Coach**: Base percentage fetched based on `Product` and `ClientOrigin` (e.g., Propio 77.9449%, Vortex 64.19%).
    - **Leader**: Split percentage fetched from hierarchy configuration (e.g., 5.502% of Coach Bruta).
    - **Agency**: Fixed or category-based percentage (e.g., 4.5% of Total).
- **FR-004**: System MUST calculate **Neta** commission during the **Pre-Liquidation** stage by applying a dynamic discount (**discountPercentage**) fetched from the `CommissionConfiguration` table. The system MUST store the used percentage in `appliedDiscountPercentage` on the record.
- **FR-005**: FOR POLIZAS: System MUST subtract a configurable **Clawback** percentage (clawbackPercentage) fetched from the `CommissionConfiguration` table. The system MUST store the used percentage in `appliedClawbackPercentage` on the record.
- **FR-006**: System MUST resolve the hierarchy (Coach -> Leader -> Agency) dynamically using the existing `User.leader` and `Category` mappings. If a parent role (Leader) is missing in the database for a specific Coach, the system MUST skip that distribution level (no distribution created).

#### Clawback Management
- **FR-007**: System MUST track **Clawback Movements** in the `Clawback` table with states:
    - `ACUMULADO`: When a retention is made (increases balance).
    - `DESCONTADO`: When an adjustment or recovery is made (decreases balance).
- **FR-007b**: System MUST maintain a **Total Clawback Balance** per user in a `ClawbackBalance` table. The balance MUST allow negative values (debts) if adjustments exceed the current reserve.
- **FR-008**: System MUST block the import of any records belonging to a settlement period marked as `CLOSED`.
- **See Detailed Flow**: [clawback-flow.md](./clawback-flow.md)

### Key Entities
- **FileImport**: Tracks the source file and processing status.
- **SettlementCommission**: Individual records imported from Excel.
- **CommissionDistribution**: Calculated Bruta/Neta amounts for each agent/role in the chain.
- **Clawback**: Tracks retentions and reserve balances.

## Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: 100% of "Voluntarias" samples match the provided Excel decimal precision using **Standard Rounding to 3 decimals (Half-Up)**.
- **SC-002**: 100% of "Polizas" records correctly apply the 10% clawback subtraction after the 12% tax discount.
- **SC-003**: System correctly identifies and stores "CARTERA" origin in the `originCommission` field based on the plan formula.
