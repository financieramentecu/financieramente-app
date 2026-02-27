# Design: Load File Process Refactor V2

## Flow Architecture

### Diagrama Lógico y de Estados

El siguiente diagrama detalla la máquina de estados por la que pasa cada registro durante el procesamiento por lotes. Garantiza exclusividad mutua (sin sobrescritura de estados) y persistencia del ID de contrato y porcentajes.

```mermaid
flowchart TD
    %% Estilos de los nodos
    classDef start_end fill:#e1bee7,stroke:#4a148c,stroke-width:2px,color:#000
    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#000
    classDef state_sync fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px,color:#000
    classDef state_lag fill:#fff9c4,stroke:#fbc02d,stroke-width:2px,color:#000
    classDef state_error fill:#ffcdd2,stroke:#c62828,stroke-width:2px,color:#000
    classDef process fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#000
    classDef db fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000

    %% INICIO Y TIPO
    START([Inicio: Subir Archivo Skandia]):::start_end --> TYPE{¿Tipo de Archivo?}:::decision

    %% RAMA VOLUNTARIA
    TYPE -- VOLUNTARIA --> V_INIT[Validar Formato Voluntaria]:::process
    V_INIT --> LOOP_V[[FOR EACH: Registro N+1]]:::process

    LOOP_V --> V_BUSCAR{¿Existe Negocio<br/>por Contrato?}:::decision

    %% Negocio NO existe
    V_BUSCAR -- NO --> V_LAG_1[ESTADO: LAG<br/>is_lag = true<br/>Guarda 'contract'<br/>+ noSincronizado]:::state_lag

    %% Negocio SÍ existe
    V_BUSCAR -- SÍ --> V_COMIS{¿Comisiones<br/>previas > 0?}:::decision

    %% 0 Comisiones
    V_COMIS -- NO (Cero) --> V_FECHA{¿Dentro del mes<br/>de procesamiento?}:::decision
    V_FECHA -- SÍ --> V_SYNC_1[ESTADO: SYNCHRONIZED<br/>is_lag = false]:::state_sync
    V_FECHA -- NO --> V_LAG_2[ESTADO: LAG<br/>is_lag = true<br/>+ noSincronizado]:::state_lag

    %% > 0 Comisiones
    V_COMIS -- SÍ (> 0) --> V_MES{¿Ya existe en<br/>EL MISMO MES?}:::decision
    V_MES -- SÍ --> V_ERR[🛑 Duplicado <br/>Guardar FileImportError <br/>+ errorRecord]:::state_error

    V_MES -- NO --> V_HAY_LAG{¿Hay comisiones<br/>previas en LAG?}:::decision
    V_HAY_LAG -- SÍ --> V_REC_LAG[Actualizar LAG a SYNC<br/>set lagDate<br/>& Crear Nuevo como SYNC<br/>+ recoveredLags + sync]:::state_sync
    V_HAY_LAG -- NO --> V_SYNC_3[ESTADO: SYNCHRONIZED<br/>is_lag = false]:::state_sync

    %% Confluencia Voluntaria
    V_LAG_1 & V_SYNC_1 & V_LAG_2 & V_REC_LAG & V_SYNC_3 --> GET_CONF_V[Consultar config_comision<br/>% Comisión y % Descuento]:::process
    GET_CONF_V --> SAVE_V[(Guardar BD:<br/>Estado, Contrato,<br/>% Desc, commissionType=VOLUNTARIA, isClawback=false)]:::db

    %% Flujo de retorno Voluntaria
    SAVE_V --> NEXT_V{¿Hay más<br/>registros?}:::decision
    V_ERR --> NEXT_V
    NEXT_V -- SÍ --> LOOP_V
    NEXT_V -- NO --> END_PROC([FIN: Resumen]):::start_end

    %% ========================================
    %% RAMA PÓLIZA
    %% ========================================
    TYPE -- PÓLIZA --> P_INIT[Validar Formato Póliza]:::process
    P_INIT --> LOOP_P[[FOR EACH: Registro N+1]]:::process

    LOOP_P --> P_BUSCAR{¿Existe Negocio<br/>por Contrato?}:::decision

    %% Negocio NO existe (Póliza)
    P_BUSCAR -- NO --> P_LAG_1[ESTADO: LAG<br/>is_lag = true<br/>Guarda 'contract'<br/>+ noSincronizado]:::state_lag

    %% Negocio SÍ existe (Póliza)
    P_BUSCAR -- SÍ --> P_HAY_LAG{¿Hay comisiones<br/>previas en LAG?}:::decision
    P_HAY_LAG -- SÍ --> P_REC_LAG[Actualizar LAG a SYNC<br/>set lagDate<br/>& Crear Nuevo como SYNC<br/>+ recoveredLags + sync]:::state_sync
    P_HAY_LAG -- NO --> P_SYNC_1[ESTADO: SYNCHRONIZED<br/>is_lag = false]:::state_sync

    P_REC_LAG & P_SYNC_1 --> P_PLAN{Plan de<br/>Compensación}:::decision

    P_PLAN -- "== FRONT19" --> P_CART[originCommission = CARTERA, isClawback=false]:::process
    P_PLAN -- "includes CLAW" --> P_CLAW[clawbackPercentage=0, isClawback=true, discountPercentage=0]:::process
    P_PLAN -- "Otro" --> P_NULL[isClawback=false]:::process

    %% Confluencia Póliza
    P_CART & P_NULL & P_LAG_1 --> GET_CONF_P[Consultar config_comision<br/>% Descuento, % clawback]:::process

    GET_CONF_P --> STATE_POLIZA
    P_CLAW --> STATE_POLIZA[ESTADO Determinado]:::state_sync
    STATE_POLIZA --> SAVE_P[(Guardar BD:<br/>Contrato, % Desc,<br/>% Clawback, commissionType=POLIZA, monto)]:::db

    %% Flujo de retorno Póliza
    SAVE_P --> NEXT_P{¿Hay más<br/>registros?}:::decision
    NEXT_P -- SÍ --> LOOP_P
    NEXT_P -- NO --> END_PROC
```

## Technical Strategy

- **Separate Handlers**: Fully decouple `process-batch.service.ts` into a `VoluntariaHandler` and a `PolizaHandler` (or separate methods) triggered immediately after validation.
- **Dedicated Error Table Handling**: Records failing basic validation, missing contracts natively, or firing the **Voluntaria Anti-Duplicate Rule** will _not_ be inserted into `SettlementCommission`. Rejections are exclusively stored as explicit rows in a new **`FileImportError`** table linked to the `idFileImport`.
  - **Resilient Processing (Non-Blocking)**: If a row throws a validation error or exception during its isolated processing, the error is caught, logged in `FileImportError` (with reason 'Error processing row'), the `errorRecord` metric is incremented, and **the batch loop strictly continues to the next row**. The file load must never crash completely due to individual row failures.
  - **Error Retrieval**: This ensures fast, indexed queries. The batch process response yields error counts, while the UI retrieves specific error details by querying an endpoint that does a simple `SELECT * FROM FileImportError WHERE id_file_import = ?`.
- **Metrics Counting Rules (`FileImport`)**: To prevent ambiguity, the batch statistics follow a strict additive rule: `totalRecord` = `sincronizadoRecord` + `rezagadoRecord` + `noSincronizadoRecord` + `errorRecord`.
  - `sincronizadoRecord`: Successfully created commissions (`status: SYNCHRONIZED`). **Important Multiplier**: When a Voluntaria or Poliza retrieves and fixes prior LAGs, this increments `sincronizados` for the new record, **AND** tracks recovered old LAGs in `recoveredLagsRecord`.
  - `rezagadoRecord`: Successfully saved rows held as pending/LAG due to valid reasons. Wait, according to the proposal, `noSincronizadoRecord` increments when business is not found or out of bounds. `rezagadoRecord` seems loosely defined, but the proposal focuses on incrementing `noSincronizadoRecord`, `errorRecord` (or errorCount), `recoveredLagsRecord`, and `synchronizedRecord`.
  - `noSincronizadoRecord`: Rejections due to valid business rules (e.g., Creation Date out of range for Voluntaria, or **Business not found / Contract does not exist**). These records are saved as `LAG` in DB.
  - `errorRecord`: Rejections logged exclusively to `FileImportError` due to exact matching duplicates, unparseable data / formatting errors, or processing exceptions.

## Clean Code Technical Strategy

To eliminate complexity and facilitate maintenance, the backend service implementation will be refactored using Clean Code principles, moving away from single massive functions toward specific modules that reflect their precise intent:

- **1. Batch Coordinator (`process-batch.service.ts`)**: Acts solely as the high-level orchestrator. It manages the transaction iteration, delegates row validations, dynamically dispatches processors using a factory, captures isolated row-errors without crashing the flow, and accurately writes DB metrics at the end.
- **2. Strategy & Factory Pattern (`processor.factory.ts`)**: Introduces an `ICommissionProcessor` interface. The Factory determines whether to instantiate a `VoluntariaProcessor` or a `PolizaProcessor` based on `fileType`.
- **3. Specialized Modules (`processors/voluntaria.processor.ts` & `processors/poliza.processor.ts`)**: Fully encapsulates the isolated business rules, date checks, LAG recoveries, and anti-duplicate validations in cohesive classes.
- **4. Validator Service (`row.validator.service.ts`)**: Reusable centralized class dedicated strictly to parsing inputs (dates, cleaning numbers, verifying required cells) to remove data-purification clutter from the main processor logic.
- **5. Error Handling**: Individual row errors (format validation exceptions, duplicates, or processing logic rejections) are saved immediately to a dedicated `FileImportError` table natively linked to the `idFileImport`. The file parsing loop gracefully absorbs the error, increments the `errorRecord` metric, and proceeds to the next item seamlessly without persisting invalid rows in `SettlementCommission`.
- **Metrics Counting Rules (`FileImport`)**: Consistent strict additive rules:
  - `synchronizedRecord`: Successfully `SYNCHRONIZED`. **Multiplier Note**: Recovering prior LAGs increments `synchronizedRecord` + `recoveredLagsRecord`.
  - `noSincronizadoRecord`: Rejections due to valid business rules (e.g. Creation Date out of range, Business fully non-existent). Logged as `LAG` with is_lag = true in DB.
  - `errorRecord` / `errorCount`: Rejections due to duplicate commission existence or instant rejections due to unparseable data / formatting errors. Logged exclusively to `FileImportError` in DB.
- **Voluntaria Anti-Duplicate Rule & LAG Logic**: When querying `SettlementCommission` to check if a commission already exists, **the search MUST match the `contract`, `start_date`, and `end_date`**.
- **Voluntaria Date Validation**: If the `idBusiness.createdAt` falls OUTSIDE the `start_date` and `end_date` parsed from Excel, the row is discarded, the `noSincronizados` counter increments, and it is saved as LAG.
- **Voluntaria Branching**: Comisiones > 0 (by `contract`)? No -> Inside Proc Month => SYNC, otherwise LAG+noSincronizado. Comisiones > 0? Yes -> Same Dates? Yes => Save in FileImportError & increment errorRecord, No => Recover Old LAGs to SYNC, Create New SYNC.
- **Poliza Exact Parsing**: When processing strings that `includes("CLAW")`, it must explicitly override the fetched `CommissionConfiguration` percentages, forcibly setting `clawbackPercentage = 0`, `discountPercentage = 0`, and marking the row `isClawback = true` and `status = 'SYNCHRONIZED'`.
- use Prisma transactions strictly for the Multi-Row creation scenarios (like old LAG recovery + new SYNC creation).
