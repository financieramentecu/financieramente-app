# Flujo de Sincronización y Pre-liquidación

Diagramas de flujo detallados del proceso de carga de archivos, sincronización de comisiones y pre-liquidación.
Este documento preserva el flujo actual de estados (`PROCESANDO`, `LOAD`, `PRELIQUIDADO`, etc.)
y los contadores de `file_import`. La única adaptación es soportar dos tipos de Excel
(`POLIZA` y `VOLUNTARIA`) manteniendo las mismas reglas de **lag / no sincronizado / sincronizado**.

## 1. Flujo General del Sistema (adaptado a 2 tipos de Excel)

```mermaid
flowchart TD
    Start([Usuario sube archivo Excel]) --> SelectType{Selecciona tipo\nPOLIZA / VOLUNTARIA}
    SelectType --> Validate[Validar formato y estructura]
    Validate -->|Inválido| ErrorFile([Mostrar error al usuario])
    Validate -->|Válido| HeaderCheck{Headers válidos\npara el tipo seleccionado?}
    HeaderCheck -->|No| ErrorHeader([Error: headers inválidos])
    HeaderCheck -->|Sí| CreateFI[Crear FileImport\nstatus: PROCESANDO]
    CreateFI --> BatchLoop[Procesar registros en lotes de 50]
    BatchLoop --> Sync{Sincronización\npor registro}
    Sync --> UpdateFI[Actualizar contadores FileImport\nstatus: LOAD]
    UpdateFI --> WaitPreliq([Archivo listo para pre-liquidación])
    WaitPreliq --> TriggerPreliq[Usuario lanza pre-liquidación]
    TriggerPreliq --> CalcDist[Calcular distribuciones\npor categoría]
    CalcDist --> FinalStatus[FileImport status: PRELIQUIDADO\nSettlements status: PRELIQUIDADO]
    FinalStatus --> Notify([Enviar email resumen a agentes])
```

## 2. Validación y Carga del Archivo Excel (por tipo)

```mermaid
flowchart TD
    Upload([Usuario arrastra o selecciona archivo]) --> SelectType{Selecciona tipo}
    SelectType --> FmtCheck{Formato válido?\n.xlsx / .xls}
    FmtCheck -->|No| ErrFmt([Error: formato no soportado])
    FmtCheck -->|Sí| SizeCheck{Tamaño ≤ 50MB?}
    SizeCheck -->|No| ErrSize([Error: archivo muy grande])
    SizeCheck -->|Sí| ParseXLSX[Parsear Excel con XLSX library]
    ParseXLSX --> NormHeaders[Normalizar encabezados\nminúsculas, sin acentos, sin espacios]
    NormHeaders --> ColCheck{Columnas requeridas\nsegún tipo}
    ColCheck -->|POLIZA| CheckPoliza[Headers POLIZA:\nPolizas Periodo, Plan de Compensación,\nValor Comisión, BASE, Polizas Producto,\nContrato Largo, Polizas Id Agente,\nPolizas Nombre Agente, Polizas Id Sociedad,\nNombre Sociedad, Polizas Clasificación]
    ColCheck -->|VOLUNTARIA| CheckVol[Headers VOLUNTARIA:\nNombre Franquicia, Desde, Hasta,\nNombre Fp, Sub Grupo Fp, Compania,\nProducto, Tipo de Comision, Cto, Base, Com]
    CheckPoliza -->|Faltan columnas| ErrCol([Error: estructura inválida])
    CheckVol -->|Faltan columnas| ErrCol
    CheckPoliza -->|OK| SplitRecords[Separar registros válidos\ny registros con error]
    CheckVol -->|OK| SplitRecords
    SplitRecords --> CreateFI[POST /api/carga-archivos/file-import\nCrear FileImport status: PROCESANDO]
    CreateFI --> StartBatch[Iniciar procesamiento por lotes]
```

## 3. Sincronización - Detalle por Registro (mantener estados y contadores)

```mermaid
flowchart TD
    Record([Registro del Excel]) --> ExtractFields{Tipo de archivo?}
    ExtractFields -->|POLIZA| MapPoliza[Mapeo POLIZA:\nContrato Largo→Cto\nValor Comisión→Com\nBASE→Base\nPlan de Compensación→Descripcion]
    ExtractFields -->|VOLUNTARIA| MapVol[Mapeo VOLUNTARIA:\nCto→Cto\nCom→Com\nBase→Base\nTipo de Comision→Descripcion]
    MapPoliza --> ValidateCto{Campo Cto\nvacío?}
    MapVol --> ValidateCto

    ValidateCto -->|Sí| ErrEmpty[SettlementCommission\nstatus: ERROR\nisLag: true\nerror: Cto vacío]
    ErrEmpty --> CountError[errorRecord++]

    ValidateCto -->|No| ValidateNumeric{Valores numéricos\nválidos?}
    ValidateNumeric -->|No| ErrNumeric[SettlementCommission\nstatus: ERROR\nisLag: true\nerror: numérico inválido\n+ audit log]
    ErrNumeric --> CountError

    ValidateNumeric -->|Sí| ShouldValidateDates{Tipo VOLUNTARIA?}
    ShouldValidateDates -->|No: POLIZA| SearchBiz[Buscar Business\npor contract = Cto]
    ShouldValidateDates -->|Sí| ValidateDates{Fechas Desde/Hasta\nválidas?}
    ValidateDates -->|No| ErrDate[SettlementCommission\nstatus: ERROR\nisLag: true\nerror: fechas inválidas]
    ErrDate --> CountError

    ValidateDates -->|Sí| SearchBiz
    SearchBiz --> BizFound{Business\nencontrado?}

    %% CASO 1: No existe negocio
    BizFound -->|No| Case1[CASO 1: No Sincronizado]
    Case1 --> CreateLag1[SettlementCommission\nstatus: LAG\nidBusiness: null\nisLag: true]
    CreateLag1 --> CountNoSync[noSincronizadoRecord++]

    %% CASO 2, 3, 4: Negocio encontrado
    BizFound -->|Sí| CheckPrevLag{Existe registro\nLAG previo para\neste contrato?}

    %% CASO 2: Recuperación de rezagado
    CheckPrevLag -->|Sí| Case2[CASO 2: Recuperación LAG]
    Case2 --> UpdateOldLag[Actualizar LAG previo:\nstatus: SINCRONIZADO\nisLag: false\nidBusiness: asignado]
    UpdateOldLag --> CreateNewSync[Nuevo SettlementCommission\nstatus: SINCRONIZADO\nisLag: false]
    CreateNewSync --> CountRecovered[rezagadoRecord++\nsincronizadoRecord++]

    %% CASO 3 y 4: Sin LAG previo
    CheckPrevLag -->|No| CheckDates{Fechas coinciden?\nbusiness.createdAt\n≥ Desde AND ≤ Hasta}

    %% CASO 3: Sincronizado normal
    CheckDates -->|Sí| Case3[CASO 3: Sincronizado]
    Case3 --> CreateSync[SettlementCommission\nstatus: SINCRONIZADO\nidBusiness: asignado\nisLag: false]
    CreateSync --> CountSync[sincronizadoRecord++]

    %% CASO 4: Rezagado por fechas
    CheckDates -->|No| Case4[CASO 4: Rezagado por fechas]
    Case4 --> CreateLag2[SettlementCommission\nstatus: LAG\nidBusiness: asignado\nisLag: true]
    CreateLag2 --> CountRezagado[rezagadoRecord++]

    CountError --> Next([Siguiente registro])
    CountNoSync --> Next
    CountRecovered --> Next
    CountSync --> Next
    CountRezagado --> Next
```

Notas:
- En POLIZA se guardan snapshots: `commission_type = POLIZA`, `origin_commission = CARTERA` si Plan = FRONT19_OMPEV, y `clawback_percentage` si Plan contiene `CLAW`.
- En VOLUNTARIA se valida rango de fechas; POLIZA no aplica validación de fechas.
- En ambos tipos se guardan `discount_percentage` (snapshot) y `descripcion` según el tipo.

## 4. Transiciones de Estado - FileImport

```mermaid
stateDiagram-v2
    [*] --> PROCESANDO: POST /file-import\nArchivo creado

    PROCESANDO --> LOAD: Lotes procesados\nsin errores críticos
    PROCESANDO --> ERROR: Error crítico\nen procesamiento
    PROCESANDO --> CANCELADO: Usuario cancela\nla carga

    LOAD --> PRELIQUIDADO: Pre-liquidación\nejecutada exitosamente
    LOAD --> CANCELADO: Usuario cancela

    PRELIQUIDADO --> [*]: Proceso completado

    ERROR --> [*]: Fin con error
    CANCELADO --> [*]: Fin cancelado

    note right of PROCESANDO
        Contadores se actualizan
        en cada lote procesado:
        totalRecord
        successRecord
        errorRecord
        sincronizadoRecord
        rezagadoRecord
        noSincronizadoRecord
    end note

    note right of PRELIQUIDADO
        preLiquidacionDate = now()
        Se envían emails de resumen
    end note
```

## 5. Transiciones de Estado - SettlementCommission

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE: Estado inicial\n(reservado)

    [*] --> SINCRONIZADO: Negocio encontrado\ny fechas coinciden
    [*] --> LAG: Negocio no encontrado\no fechas no coinciden
    [*] --> ERROR_SC: Validación fallida\n(Cto vacío, fechas inválidas)

    LAG --> SINCRONIZADO: Recuperación\nnegocio creado después\n(Caso 2)

    SINCRONIZADO --> PRELIQUIDADO: Pre-liquidación\ncalcula distribuciones

    state ERROR_SC <<choice>>

    note right of LAG
        isLag = true
        Puede tener idBusiness
        (rezagado por fechas)
        o no (no sincronizado)
    end note

    note right of SINCRONIZADO
        isLag = false
        idBusiness asignado
        Listo para pre-liquidar
    end note

    note left of PRELIQUIDADO
        ComissionDistribution[]
        creadas con status LIQUIDADO
    end note
```

## 6. Transiciones de Estado - ComissionDistribution

```mermaid
stateDiagram-v2
    [*] --> LIQUIDADO: Pre-liquidación\ncrea distribución

    LIQUIDADO --> NOTIFICADO: Agente notificado\npor email
    NOTIFICADO --> PAGADA: Comisión pagada
    LIQUIDADO --> ANULADA: Distribución anulada
    NOTIFICADO --> ANULADA: Distribución anulada

    PAGADA --> [*]: Fin exitoso
    ANULADA --> [*]: Fin anulado

    note right of LIQUIDADO
        valueComission = bruta
        totalDiscount = descuento + clawback
        valueComissionFinal = neta
    end note
```

## 7. Pre-liquidación - Cálculo de Distribuciones (sin romper estados)

```mermaid
flowchart TD
    Start([Usuario selecciona archivo\nen estado LOAD]) --> SelectRange[Seleccionar rango de fechas\no mes: YYYY-MM]
    SelectRange --> FetchSC[Obtener SettlementCommissions\nstatus = SINCRONIZADO\nen rango de fechas]
    FetchSC --> HasRecords{Hay registros\nsincronizados?}
    HasRecords -->|No| NoRecords([No hay registros\npara pre-liquidar])
    HasRecords -->|Sí| LoopSC[Para cada SettlementCommission]

    LoopSC --> GetBiz[Obtener Business\ny ProductPercentageCommission]
    GetBiz --> GetCategories[Obtener categorías activas\nProductPercentageCommissionCategory\nGENERAL, AGENCIA, LIDER, COACH]
    GetCategories --> GetSnapshots["Obtener discount_percentage y clawback_percentage\n(guardados en settlement_commission)"]
    GetSnapshots --> LoopCat[Para cada categoría]

    LoopCat --> CalcGross["comisiónBruta =\nbase_commission × porcentaje\n(porcentaje_portfolio si origin_commission=CARTERA\nsino porcentaje_distribucion)"]
    CalcGross --> CalcDiscount["totalDiscount =\ncomisiónBruta × (discount% + clawback%)"]
    CalcDiscount --> CalcNet["comisiónFinal =\ncomisiónBruta - totalDiscount"]
    CalcNet --> CreateCD[Crear CommissionDistribution\nvalueComission: bruta\ntotalDiscount: descuento + clawback\nvalueComissionFinal: neta\nstatus: LIQUIDADO]
    CreateCD --> MoreCats{Más categorías?}
    MoreCats -->|Sí| LoopCat
    MoreCats -->|No| UpdateSC[Actualizar SettlementCommission\nstatus: PRELIQUIDADO]
    UpdateSC --> MoreSC{Más registros?}
    MoreSC -->|Sí| LoopSC
    MoreSC -->|No| UpdateFI[Actualizar FileImport\nstatus: PRELIQUIDADO\npreLiquidacionDate: now]
    UpdateFI --> GroupByUser[Agrupar resultados por usuario]
    GroupByUser --> SendEmail([Enviar email resumen\na cada agente\nfire-and-forget])
```

## 8. Modelo de Datos - Entidades del Flujo (con 2 tipos de Excel)

```mermaid
erDiagram
    FileImport ||--o{ SettlementCommission : "contiene"
    Business ||--o{ SettlementCommission : "referenciado por"
    SettlementCommission ||--o{ CommissionDistribution : "genera"
    ProductPercentageCommissionCategory ||--o{ CommissionDistribution : "define %"
    %% CommissionConfiguration es tabla desconectada (sin FK)
    CommissionDistribution ||--o| Clawback : "retención opcional"
    User ||--o{ FileImport : "carga"
    User ||--o{ Business : "propietario"
    User ||--o{ Clawback : "dueño clawback"
    User ||--|| ClawbackBalance : "saldo neto"

    FileImport {
        int id PK
        string name_file
        string status "PROCESANDO | LOAD | ERROR | CANCELADO | PRELIQUIDADO"
        int total_record
        int success_record
        int error_record
        int sincronizado_record
        int rezagado_record
        int no_sincronizado_record
        datetime pre_liquidacion_date
    }

    SettlementCommission {
        int id PK
        int id_file_import FK
        int id_business FK "nullable"
        string descripcion
        decimal commission_value
        decimal commission_percentage "nullable"
        decimal base_commission
        decimal discount_percentage "snapshot"
        decimal clawback_percentage "snapshot"
        string origin_commission "CARTERA | NULL"
        string commission_type "POLIZA | VOLUNTARIA"
        string status "PENDIENTE | SINCRONIZADO | LAG | ERROR | PRELIQUIDADO"
        boolean is_lag
        string error "nullable"
    }

    CommissionDistribution {
        int id PK
        int id_settlement_commission FK
        int id_ppc_category FK
        decimal commission_value "bruta"
        decimal commission_value_final "neta"
        decimal total_discount
        decimal applied_discount_percentage "snapshot"
        string status "LIQUIDADO | NOTIFICADO | PAGADA | ANULADA"
    }

    CommissionConfiguration {
        int id PK
        decimal discount_percentage
        decimal clawback_percentage
        string status "ACTIVE | INACTIVE"
    }

    Clawback {
        int id PK
        int id_user FK
        int id_commission_distribution FK
        decimal value_clawback
        decimal porcentaje_applied
        string state "RETENIDO | LIBERADO | APLICADO | CANCELADO"
    }

    ClawbackBalance {
        int id_user PK/FK
        decimal total_amount
        datetime updated_at
    }
```

## 9. Resumen de Endpoints API

```mermaid
flowchart LR
    subgraph Carga["Carga de Archivos"]
        A1[POST /api/carga-archivos/file-import\nCrear FileImport]
        A2[GET /api/carga-archivos/file-import\nListar importaciones]
        A3[GET /api/carga-archivos/file-import/:id\nDetalle importación]
        A4[DELETE /api/carga-archivos/file-import/:id\nEliminar importación]
        A5[POST /api/carga-archivos/process-batch\nProcesar lote de registros]
    end

    subgraph Preliq["Pre-liquidación"]
        B1[GET /api/pre-liquidacion/archivos\nArchivos disponibles LOAD/PRELIQUIDADO]
        B2[POST /api/pre-liquidacion/procesar\nEjecutar pre-liquidación]
        B3[GET /api/pre-liquidacion/detalle/:fileId\nDetalle con cálculos]
        B4[GET /api/pre-liquidacion/resultados/:fileId\nResultados paginados]
    end
```

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| `([...])` | Inicio / fin / evento externo |
| `[...]` | Proceso / acción |
| `{...}` | Decisión / condición |
| `-->` | Flujo secuencial |
| `-->❘Sí❘` | Rama condicional verdadera |
| `-->❘No❘` | Rama condicional falsa |

## Cómo ver los diagramas

Pegar el bloque de código mermaid en [mermaid.live](https://mermaid.live) o en cualquier visor que soporte Mermaid (GitHub, GitLab, VS Code con extensión Markdown Mermaid).
