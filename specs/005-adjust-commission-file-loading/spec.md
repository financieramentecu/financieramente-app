# Feature Specification: Adjust File Loading and Commission Calculations

**Feature Branch**: `005-adjust-commission-file-loading`  
**Created**: 2026-02-16  
**Status**: Draft  
**Input**: User description: "Adjust file loading and commission calculations for Voluntarias, Polizas, and Clawbacks based on screenshots and Excel examples. Include dynamic hierarchy and discount-based calculations."

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
1. **Given** a record with `Tipo Comisión` = 'claw', **When** processed, **Then** create negative distributions linked to the user's `Clawback` reserve.

---

## Requirements *(mandatory)*

### Functional Requirements

#### File Import & Detection
- **FR-001**: System MUST identify the file type ("Voluntarias" vs "Polizas") automatically or via user input.
- **FR-002**: System MUST capture the `Tipo Comisión` to identify "claw" adjustments.

#### Calculation Engine (Dynamic formulas)
- **FR-003**: System MUST calculate **Bruta** commissions by fetching percentages from configuration tables:
    - **Coach**: Base percentage fetched based on `Product` and `ClientOrigin` (e.g., Propio 77.9449%, Vortex 64.19%).
    - **Leader**: Split percentage fetched from hierarchy configuration (e.g., 5.502% of Coach Bruta).
    - **Agency**: Fixed or category-based percentage (e.g., 4.5% of Total).
- **FR-004**: System MUST calculate **Neta** commission by applying a dynamic discount (fetched from `Discount` table or global config) to the **Bruta** amount of EACH role.
- **FR-005**: FOR POLIZAS: System MUST subtract a configurable **Clawback** percentage (e.g., 10%) from the **Neta** commission of each role.
- **FR-006**: System MUST resolve the hierarchy (Coach -> Leader -> Coach) dynamically using the existing `User.leader` and `Category` mappings.

#### Clawback Management
- **FR-007**: System MUST track Clawback reserves in the `Clawback` table, allowing for subtractions from "claw" type records.

### Key Entities
- **FileImport**: Tracks the source file and processing status.
- **SettlementCommission**: Individual records imported from Excel.
- **ComissionDistribution**: Calculated Bruta/Neta amounts for each agent/role in the chain.
- **Clawback**: Tracks retentions and reserve balances.

## Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: 100% of "Voluntarias" samples match the provided Excel decimal precision (2-4 decimal places). [NEEDS CLARIFICATION: exact rounding policy for decimals].
- **SC-002**: 100% of "Polizas" records correctly apply the 10% clawback subtraction after the 12% tax discount.
- **SC-003**: System correctly handles "Cartera" origin (66.1%) even if not currently in the UI dropdown. [NEEDS CLARIFICATION: confirm Cartera origin ID or mapping].
