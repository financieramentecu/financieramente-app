# Delta for negocios

## ADDED Requirements

### Requirement: Business Form Section Consolidation

The business creation and edit forms MUST consolidate product and contract information into the business information section. The system SHALL NOT display a separate product information section.

#### Scenario: Section Order and Content
- **GIVEN** the user navigates to the business creation or edit form
- **WHEN** the form renders
- **THEN** exactly two main sections MUST be displayed: "Información del cliente" and "Información del negocio"
- **AND** the "Información del negocio" section MUST contain the following fields in order: contrato, compañia, producto, periodicidad, plazo, moneda, valor, agente.

## MODIFIED Requirements

### Requirement: Enhanced operational Excel export

The system MUST provide professional Excel exports with advanced styling, auto-sizing columns, and specific fields for liquidation analysis.
(Previously: The system exported Mes, Año, and Es anualidad, and didn't include Celular or dynamic date filter columns at the start.)

#### Scenario: Professional Styling and Auto-sizing
- **GIVEN** the Excel export is requested
- **WHEN** the file is generated
- **THEN** header cells MUST have a light blue background (`#ADD8E6`) and bold font.
- **AND** all columns MUST automatically adjust their width to fit the content (header or data).

#### Scenario: Formatting and Calculated Fields
- **GIVEN** the report is generated
- **WHEN** the data rows are populated
- **THEN** the "Valor negocio" column MUST use currency format `$#,##0.00`.

#### Scenario: Specific Column Order and Naming without Date Filters
- **GIVEN** the Excel report is generated without date filters (`dateFrom` and `dateTo` absent)
- **WHEN** the columns are populated
- **THEN** they MUST follow this exact order:
  1. Agente, 2. Nombres y Apellidos del Cliente, 3. Cedula del cliente, 4. Origen del cliente, 5. Email Cliente, 6. Celular, 7. Compañía, 8. Plazo, 9. Periodicidad, 10. Producto, 11. Número de contrato, 12. Moneda, 13. Valor negocio, 14. Líder encargado, 15. Categoría líder, 16. Estado del negocio, 17. Fecha de emisión, 18. Fecha de fondeo, 19. Fecha de creación, 20. Fecha de anualidades (dinámicas).

#### Scenario: Specific Column Order and Naming with Date Filters
- **GIVEN** the Excel report is generated with date filters (`dateFrom` and `dateTo` present)
- **WHEN** the columns are populated
- **THEN** they MUST follow this exact order:
  1. Fecha inicial fondeo, 2. Fecha final fondeo, 3. Agente, 4. Nombres y Apellidos del Cliente, 5. Cedula del cliente, 6. Origen del cliente, 7. Email Cliente, 8. Celular, 9. Compañía, 10. Plazo, 11. Periodicidad, 12. Producto, 13. Número de contrato, 14. Moneda, 15. Valor negocio, 16. Líder encargado, 17. Categoría líder, 18. Estado del negocio, 19. Fecha de emisión, 20. Fecha de fondeo, 21. Fecha de creación, 22. Fecha de anualidades (dinámicas).


### Requirement: FONDEADO transition on funding confirmation

| Path | Rule |
|------|------|
| No annual rows | Direct: `FONDEADO` + `dateAnchored` (atomic). |
| Annual rows | Updates installments; first batch while **`EMITIDO`** sets parent **`FONDEADO`** + `dateAnchored`. |
| Parent already **FONDEADO** | Later batches update rows only; parent status unchanged, but parent `dateAnchored` MUST be updated to latest funding date. |
| **POST** `/fondear` | MUST fail if any `AnnualPayment` exists. |
| Wrong status/method | MUST reject (e.g. **VENTA_EFECTUADA**, direct when ineligible). |

(Previously: Parent `dateAnchored` was unchanged for later batches if parent was already FONDEADO.)

#### Scenario: Direct — sin anualidades
- **GIVEN** `EMITIDO`, zero annual rows
- **WHEN** direct fondear completes successfully
- **THEN** `status` SHALL be **FONDEADO** and `dateAnchored` set

#### Scenario: Anual — primera tanda promueve padre
- **GIVEN** `EMITIDO`, all installments unfunded
- **WHEN** annual confirm funds ≥1 row
- **THEN** parent SHALL be **FONDEADO** with `dateAnchored` set for that funding

#### Scenario: Anual — más cuotas con padre ya FONDEADO actualiza fecha
- **GIVEN** parent **FONDEADO**, some rows still **`SIN_FONDEAR`**
- **WHEN** annual confirm funds more rows
- **THEN** those rows get `dateAnchored`
- **AND** parent remains **FONDEADO** but its `dateAnchored` SHALL be updated to the new funding date

#### Scenario: POST directo bloqueado con anualidades
- **GIVEN** `EMITIDO` and ≥1 `AnnualPayment`
- **WHEN** direct **POST** `/fondear` runs
- **THEN** the request MUST be rejected; no state change

#### Scenario: Rechazo por estado inelegible
- **GIVEN** invalid status or wrong HTTP path for that business
- **WHEN** funding is requested
- **THEN** the system MUST reject
