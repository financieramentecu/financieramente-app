# Process Flowchart: Commission Adjustments

This diagram visualizes the integration of the 3 core flows: **Carga**, **Pre-Liquidación**, and **Ajuste de Saldo (Claw)**, supporting both **Voluntarias** and **Polizas** formats.

```mermaid
graph TD
    subgraph Flow_1 ["Flow 1: Carga de Archivos (Saving)"]
        A["Start: User Uploads Excel"] --> B{"Detect Headers"}
        B -- "Has 'Polizas Periodo'?" --> C["FileType: POLIZAS"]
        B -- "Has 'Cto' / 'Com'?" --> D["FileType: VOLUNTARIAS"]
        
        C --> E["Map: 'Contrato Largo', 'Valor Comisión'"]
        E --> F["Clean Currency Format: '$ (x.xxx)' -> Numeric"]
        F --> G["Skip 'BASE' Column"]
        
        D --> H["Map: 'Cto', 'Com', 'Base'"]
        
        G --> I["Save to SettlementCommission Status: LOAD"]
        H --> I
    end

    subgraph Flow_2 ["Flow 2: Pre-Liquidación (Engine)"]
        I --> J["Start: Process Pre-Liquidation"]
        J --> K{"Concept Type?"}
        
        K -- "Normal Commission" --> L{"FileType?"}
        
        L -- "VOLUNTARIAS" --> M["Resolve Hierarchy: Coach > Leader > Agency"]
        M --> N["Lookup Dynamic Percentaje"]
        N --> O["Calculate Bruta: Coach > Leader Split > Agency Total"]
        
        L -- "POLIZAS" --> P["Lookup Coach Base by Origin"]
        P --> Q["Apply 12% Tax Discount ALL Roles"]
        Q --> R["Apply 10% Clawback Retention POZ ROLES"]
        
        O --> S["ComissionDistribution Created"]
        R --> S
    end

    subgraph Flow_3 ["Flow 3: Balance Adjustment (Claw)"]
        K -- "'claw' Record" --> T["Generate Negative Distribution"]
        T --> U["Update User Reserve: Sum RETENIDO entries"]
        U --> V["Final Settlement Balance Adjusted"]
    end

    S --> W["End: UI Display Summary"]
    V --> W
```

## Description of Stages

### 1. Carga (Saving)
The system normalizes the data regardless of the source. For **Polizas**, it performs a rigorous cleaning of the currency strings (which include symbols, parentheses for negatives, and commas) and ignores the `BASE` column as per the latest requirement.

### 2. Pre-Liquidación (Engine)
The core logic switches between:
- **Voluntarias**: A hierarchical approach where the Leader's commission is a percentage of the Coach's earnings.
- **Polizas**: A product-origin approach with fixed retentions applied to the net value.

### 3. Ajuste de Saldo (Claw)
Specifically handles the return of commissions. Instead of a simple deduction, it generates a traceable record in the distribution table that impacts the user's virtual reserve.
