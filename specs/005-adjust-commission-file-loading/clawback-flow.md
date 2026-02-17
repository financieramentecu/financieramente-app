# Clawback Workflow: Final Specification

This document summarizes the end-to-end logic for handling retentions and adjustments in the commission settlement engine.

## 1. Flow Overview (Mermaid)

```mermaid
graph TD
    A[Excel Upload] --> B{FileType?}
    B -- "POLIZA" --> C[Automated Retention]
    B -- "VOLUNTARIA (claw)" --> D[Manual Adjustment]

    subgraph "Automated Retention Logic"
    C --> C1[Fetch discountPercentage & clawbackPercentage]
    C1 --> C2[Calc Bruta]
    C2 --> C3[Calc Neta: Bruta - discountPercentage]
    C3 --> C4[Subtract clawbackPercentage from Neta]
    C4 --> C5[Create Clawback Movement record: status=ACUMULADO]
    C5 --> C6[Update ClawbackBalance: add retention]
    C6 --> C7[Snapshot Percentages in Settlement record]
    end

    subgraph "Manual Adjustment Logic (Claws)"
    D --> D1[Identify negative record via keyword 'claw']
    D1 --> D2[Generate negative CommissionDistribution]
    D2 --> D3[Create Clawback Movement record: status=DESCONTADO]
    D3 --> D4[Update ClawbackBalance: subtract adjustment]
    end

    Note: The entire Clawback logic (Automatic & Manual) applies STRICTLY to records from the **Polizas** flow.

    C5 --> E[Pre-Liquidation Summary]
    D3 --> E
    E --> F{Period CLOSED?}
    F -- YES --> G[BLOCK IMPORT]
    F -- NO --> H[FINALIZE SETTLEMENT]
```

## 2. Technical Rules

### A. Dynamic Configuration
- **Source**: `CommissionConfiguration` table.
- **Fields**: `discountPercentage` (Default 12%), `clawbackPercentage` (Default 10%).
- **Benefit**: Percentages can be changed via UI/DB without redeploying code.

### B. Rounding Policy
- **Precision**: 3 Decimals.
- **Method**: Half-Up (Standard rounding).
- **Application**: Applied at every stage (Bruta, After-Tax, After-Clawback).

### C. Logic per File Type
- **Polizas**:
    1. `Neta_Pre_Clawback = Bruta * (1 - discountPercentage)`
    2. `Clawback_Amount = Neta_Pre_Clawback * clawbackPercentage`
    3. `Final_Neta = Neta_Pre_Clawback - Clawback_Amount`
- **Voluntarias (Claw adjustments)**:
    - If `description` contains "claw":
    - `DistributionValue = ExcelValue` (usually negative).
    - This value directly impacts the User's `Clawback` balance.

### D. Governance
- **Immutability**: Percentages are snapshotted (`appliedDiscountPercentage`, `appliedClawbackPercentage`) during pre-liquidation. Future changes in `CommissionConfiguration` will NOT affect existing records.
- **Period Closure**: No clawbacks or adjustments can be recorded if the related `SettlementPeriod` status is `CLOSED`.
