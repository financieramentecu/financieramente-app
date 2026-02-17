# Process Flowchart: Commission Adjustments

This diagram visualizes the integration of the 3 core flows.

```mermaid
graph TD
    subgraph FLOW1 ["Flow 1: Carga de Archivos"]
        A["Start: Select FileType & Upload"] --> B{"Check: Request.fileType?"}
        
        B -- "Item: POLIZAS" --> C["Validate: Polizas Headers"]
        B -- "Item: VOLUNTARIAS" --> D["Validate: Voluntarias Headers"]
        
        C -- "Valid" --> E["Map Fields & Clean Currency"]
        E --> F["Note: Save BASE as Informational"]
        F --> G["Save to DB (Status: LOAD)"]
        
        D -- "Valid" --> H["Map Fields (Cto, Com, Base)"]
        H --> G
        
        C -- "Invalid" --> I["Mark: NOT_SYNCHRONIZED (Reason: Headers)"]
        D -- "Invalid" --> I
    end

    subgraph FLOW2 ["Flow 2: Pre-Liquidacion"]
        G --> J["Start: Process calculations"]
        J --> K{"Concept Type?"}
        
        K -- "Normal" --> L{"FileType?"}
        
        L -- "VOLUNTARIAS" --> M["Resolve Hierarchy & Percentages"]
        M --> N["Calculate Bruta (Coach/Leader/Agency)"]
        
        L -- "POLIZAS" --> O["Lookup base by Origin (Ignore BASE)"]
        O --> P["Apply 12 pct Tax Discount"]
        P --> Q["Apply 10 pct Clawback Retention"]
        
        N --> R["Create Distributions (Save FileType context)"]
        Q --> R
        
        R --> S["Update Record: SYNCHRONIZED"]
        M -- "Error" --> T["Update Record: NOT_SYNCHRONIZED"]
        O -- "Error" --> T
    end

    subgraph FLOW3 ["Flow 3: Balance Adjustment"]
        K -- "Claw" --> U["Generate Negative Distribution"]
        U --> V["Update User Reserve Balance"]
        V --> S
    end

    S --> W["Final: UI Summary (TotalSyncFailed)"]
    T --> W
```

## Description

- **Flow 1 (Carga)**: Mandatory selector in UI. Headers are validated before saving. Polizas currency is cleaned.
- **Flow 2 (Pre-Liquidation)**: Dynamic engine. Voluntarias uses hierarchy; Polizas uses origin + retentions.
- **Flow 3 (Adjustment)**: Negative distribution logic for returns.
