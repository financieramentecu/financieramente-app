# Feature Specification: Commission Sync & Pre-liquidation

**Feature Branch**: `001-commission-sync`  
**Created**: 2026-02-17  
**Status**: Draft  
**Input**: User description: "Crear especificación para actualización del flujo de sincronización y pre-liquidación basada en docs/commission-sync-analysis.md y docs/sync-preliquidacion-flow.md"

## Clarifications

### Session 2026-02-17

- Q: ¿Cómo aplicar la validación de “lag” en POLIZA si no existen columnas Desde/Hasta? → A: Solo aplicar validación de fechas a VOLUNTARIA. En POLIZA: si existe negocio → SINCRONIZADO; si no existe → LAG/no sincronizado.
- Q: ¿Qué campo del Excel debe poblar `descripcion` en `settlement_commission`? → A: POLIZA usa `Plan de Compensación`; VOLUNTARIA usa `Tipo de Comision`.
- Q: ¿Qué hacer si no existe ninguna configuración ACTIVE en `CommissionConfiguration` al momento de cargar? → A: Permitir carga con valores por defecto: descuento 12% y clawback 10%.
- Q: ¿Cómo tratar valores numéricos con formato moneda en POLIZA? → A: Normalizar y limpiar valores (ej. "-$ 1.713.600", "(1.713.600,00)"); si el valor no es válido, registrar error y auditarlo.
- Q: ¿Dónde y cómo registrar los errores de parsing/validación? → A: Guardar cada error en la tabla de auditoría con el detalle del fallo.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Cargar archivo por tipo (Priority: P1)

Como usuario de operaciones, quiero seleccionar el tipo de archivo (POLIZA o VOLUNTARIA) y cargar el Excel, para que el sistema valide la estructura correcta antes de procesar.

**Why this priority**: Es la puerta de entrada del flujo. Sin una validación por tipo, se generan sincronizaciones incorrectas y estados inconsistentes.

**Independent Test**: Se prueba subiendo un archivo POLIZA con headers correctos y uno con headers incorrectos, verificando aceptación/rechazo.

**Acceptance Scenarios**:

1. **Given** un archivo POLIZA con headers válidos y tipo seleccionado = POLIZA, **When** se carga el archivo, **Then** el sistema crea el registro de importación en estado PROCESANDO y continúa el procesamiento.
2. **Given** un archivo VOLUNTARIA pero el usuario selecciona tipo POLIZA, **When** se carga el archivo, **Then** el sistema rechaza la carga por headers inválidos y no inicia sincronización.

---

### User Story 2 - Sincronizar registros y estados (Priority: P2)

Como usuario de operaciones, quiero que cada registro del Excel se sincronice con las reglas actuales de lag/no sincronizado/sincronizado y conteo, para mantener integridad histórica y trazabilidad.

**Why this priority**: El negocio depende de los estados de sincronización y sus contadores para medir calidad y completitud de la carga.

**Independent Test**: Se procesa un set de registros con casos de negocio encontrado/no encontrado y fechas dentro/fuera del rango, verificando estados y contadores.

**Acceptance Scenarios**:

1. **Given** un registro con contrato que no existe en negocios, **When** se procesa, **Then** se registra como LAG sin negocio y se incrementa `noSincronizadoRecord`.
2. **Given** un registro con negocio existente y fechas válidas, **When** se procesa, **Then** se registra como SINCRONIZADO y se incrementa `sincronizadoRecord`.
3. **Given** un registro con negocio existente pero fechas fuera de rango, **When** se procesa, **Then** se registra como LAG con negocio y se incrementa `rezagadoRecord`.
4. **Given** un registro POLIZA cuyo Plan de Compensación es FRONT19_OMPEV, **When** se procesa, **Then** se guarda `origin_commission = CARTERA`.
5. **Given** un registro POLIZA cuyo Plan de Compensación contiene CLAW, **When** se procesa, **Then** se guarda `clawback_percentage` (snapshot) desde configuración.
6. **Given** un registro POLIZA sin columnas de fechas, **When** se procesa, **Then** el estado depende solo de si existe el negocio (SINCRONIZADO si existe, LAG/no sincronizado si no existe).
7. **Given** un valor numérico con formato inválido en un registro, **When** se procesa, **Then** el registro se marca como ERROR y se crea una entrada en auditoría.

---

### User Story 3 - Pre-liquidar con nuevas reglas (Priority: P3)

Como analista de liquidaciones, quiero generar la pre-liquidación usando base_commission y porcentajes configurados, incluyendo descuento y clawback cuando aplique, para obtener distribuciones correctas por rol.

**Why this priority**: Asegura que los cálculos financieros se alineen con los nuevos tipos de comisión y reglas de cartera.

**Independent Test**: Se pre-liquida un archivo con registros POLIZA y VOLUNTARIA y se verifica la fórmula y el estado final.

**Acceptance Scenarios**:

1. **Given** un registro con `origin_commission = CARTERA`, **When** se pre-liquida, **Then** se usa `porcentaje_portfolio` para calcular la distribución.
2. **Given** un registro con origen distinto a CARTERA, **When** se pre-liquida, **Then** se usa `porcentaje_distribucion`.
3. **Given** un registro con `clawback_percentage` vacío, **When** se pre-liquida, **Then** el clawback no se aplica y la comisión final no incluye descuento por clawback.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- Archivos con headers correctos pero columnas en orden diferente.
- Valores de comisión negativos en POLIZA.
- Fechas en formato serial de Excel (Desde/Hasta) inválidas o vacías.
- Registros con contrato vacío o nulo.
- No existe configuración activa de porcentajes al momento de cargar (se aplican valores por defecto).
- POLIZA no tiene fechas Desde/Hasta y no aplica validación de rango.
- Valores numéricos con símbolos, separadores de miles o paréntesis (ej. `-$ 1.713.600`, `(1.713.600,00)`).

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST require the user to select the file type (POLIZA or VOLUNTARIA) before upload.
- **FR-002**: System MUST validate Excel headers against the expected set for the selected type and reject mismatches.
- **FR-003**: System MUST keep the current synchronization states and counters (sincronizado, rezagado, no sincronizado, error) without changing their semantics.
- **FR-004**: System MUST map Excel columns by type to the corresponding commission fields and store `commission_type`.
- **FR-005**: System MUST store `origin_commission = CARTERA` when Plan de Compensación equals FRONT19_OMPEV in POLIZA.
- **FR-006**: System MUST store `clawback_percentage` only when the POLIZA plan contains CLAW; otherwise it remains empty.
- **FR-007**: System MUST snapshot `discount_percentage` from the active configuration into each settlement commission record.
- **FR-008**: System MUST calculate distributions using `base_commission` and the correct percentage source: `porcentaje_portfolio` for CARTERA, `porcentaje_distribucion` otherwise.
- **FR-009**: System MUST apply discount and clawback percentages as defined by the settlement commission snapshots.
- **FR-010**: System MUST update settlement commissions to PRELIQUIDADO and the file import to PRELIQUIDADO after successful pre-liquidation.
- **FR-011**: System MUST treat CommissionConfiguration as a standalone configuration entity without relational dependency on other tables.
- **FR-012**: System MUST normalize naming to "commission" in data fields and identifiers to avoid inconsistent terminology.
- **FR-013**: System MUST apply date-range (lag) validation only to VOLUNTARIA records; POLIZA records use business existence only to determine SINCRONIZADO vs LAG/no sincronizado.
- **FR-014**: System MUST populate `descripcion` from `Plan de Compensación` for POLIZA and from `Tipo de Comision` for VOLUNTARIA.
- **FR-015**: If no ACTIVE configuration exists, system MUST allow processing using default values: discount 12% and clawback 10%.
- **FR-016**: System MUST normalize and parse monetary values from Excel (remove currency symbols, thousand separators, parentheses for negatives) before validating them.
- **FR-017**: If a numeric value cannot be parsed, system MUST mark the record as ERROR and register the error in the audit log.
- **FR-018**: Audit log entries MUST include detailed error information for each failed record (e.g., field, raw value, reason, file import reference).

### Assumptions

- If multiple configurations exist, the most recent ACTIVE configuration is used.
- If no ACTIVE configuration exists, use defaults: discount 12% and clawback 10%.
- Monetary values may include currency symbols, thousands separators, and negative formats that must be cleaned before parsing.
- `commission_percentage` can remain empty until a source column is explicitly defined.
- Headers are normalized (case, accents, spaces) before comparison.

### Key Entities *(include if feature involves data)*

- **File Import**: Registro de carga con estado y contadores de sincronización.
- **Settlement Commission**: Comisión individual importada, con snapshots de porcentajes y estado de sincronización.
- **Commission Distribution**: Distribución de una comisión por rol/categoría con valores brutos y netos.
- **Commission Configuration**: Configuración activa de descuento y clawback, independiente de otras entidades.
- **Business**: Negocio asociado por contrato para sincronización.
- **Product Percentage Commission Category**: Tabla de porcentajes por categoría, incluye porcentaje de portfolio.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 100% of uploads with incorrect headers are rejected with a clear error before any processing starts.
- **SC-002**: For a mixed test file, the sum of sincronizado + rezagado + no sincronizado + error equals total records.
- **SC-003**: Pre-liquidation completes with correct distribution values for at least one POLIZA and one VOLUNTARIA case in a validation dataset.
- **SC-004**: The system can process a standard monthly file without manual data correction for header/type mismatches.
