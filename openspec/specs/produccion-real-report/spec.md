# Spec: Producción Real Report

## Purpose

Provides the Producción Real report under Reportes: date/company/contribution/currency filters, hierarchy tree, KPIs, Regular vs Única comparison, detail table, and Excel export aligned to the same rules.

## Requirements

### Requirement: Access gated by report permission

Only users whose category is enabled for report code `PRODUCCION_REAL` (or administrator bypass) SHALL access the Producción Real page and APIs. The sidebar SHALL list **Producción Real** under **Reportes** when that permission holds.

#### Scenario: Performance Leader with permission sees the report

- **GIVEN** the user’s category is enabled for `PRODUCCION_REAL`
- **WHEN** the sidebar renders
- **THEN** the **Reportes** group SHALL be visible
- **AND** it SHALL list **Producción Real** linking to `/dashboard/reportes/produccion-real`

#### Scenario: Category without permission does not see Producción Real

- **GIVEN** the user’s category is not enabled for `PRODUCCION_REAL` and the user has no other authorized reports
- **WHEN** the sidebar renders
- **THEN** **Producción Real** SHALL NOT appear
- **AND** if no report sub-items remain authorized, the **Reportes** group SHALL NOT appear

---

### Requirement: Default filters

On first load, filters MUST default as follows: **Desde** / **Hasta** = current calendar month in America/Bogotá bounded by **Fecha de Creación** (`Business.createdAt`); **Tipo de Aporte** = Todas (Regular + Único); **Compañía** = Todas (catalog includes all companies including SKANDIA); **Moneda** = Todas (TRM automática).

#### Scenario: Default date range is current month by creation date

- **GIVEN** an authorized user opens Producción Real
- **WHEN** the page loads before any filter change
- **THEN** Desde and Hasta SHALL span the current Bogotá month
- **AND** applying those defaults SHALL filter businesses by creation date within that inclusive range

#### Scenario: Default contribution and company are Todas

- **GIVEN** the page just loaded
- **WHEN** filter defaults are inspected
- **THEN** Tipo de Aporte SHALL be Todas
- **AND** Compañía SHALL be Todas
- **AND** the company catalog SHALL include SKANDIA among others

#### Scenario: Default currency is Todas with automatic TRM

- **GIVEN** the page just loaded
- **WHEN** Moneda defaults are inspected
- **THEN** Moneda SHALL be **Todas**
- **AND** the system SHALL use automatic TRM to convert display values to USD per currency-mode rules

---

### Requirement: Draft vs applied filters

Changing filter controls MUST NOT query until the user activates **Aplicar**. **Limpiar** MUST restore defaults. **Descargar Excel** MUST use the currently applied filters and hierarchy selection.

#### Scenario: Aplicar commits filters

- **GIVEN** the user changes draft filters
- **WHEN** they activate **Aplicar**
- **THEN** KPIs, comparison, and table SHALL refresh using the new filters

#### Scenario: Limpiar restores defaults

- **GIVEN** non-default draft or applied filters
- **WHEN** the user activates **Limpiar**
- **THEN** filters SHALL return to the default values defined for this report

---

### Requirement: Tipo de Aporte multi-select

Tipo de Aporte SHALL support multi-select of Regular and/or Único. Selecting only Regular MUST zero the Único KPI (and exclude Único rows from the table). Selecting only Único MUST zero the Regular KPI.

#### Scenario: Filtering only Regular zeros Único

- **GIVEN** applied Tipo de Aporte is Regular only
- **WHEN** KPIs are computed
- **THEN** KPI Único SHALL be zero
- **AND** detail rows SHALL exclude products with contribution type Único

---

### Requirement: Global MFUND exclusion

Businesses whose company name is SKANDIA and product name is MFUND MUST NEVER appear in KPIs, comparison, detail table, or Excel, regardless of company filter (including when SKANDIA is selected or Todas).

#### Scenario: MFUND excluded even when SKANDIA selected

- **GIVEN** applied Compañía includes SKANDIA or is Todas
- **AND** MFUND businesses exist in range
- **WHEN** KPIs and table are computed
- **THEN** those MFUND businesses SHALL contribute neither count nor sum
- **AND** SHALL NOT appear in the detail table or Excel

---

### Requirement: Currency modes

Moneda SHALL support three modes:

1. **Todas (TRM auto):** include COP and foreign-currency businesses; convert all monetary amounts to USD using automatic TRM (COP ÷ TRM; foreign already treated as USD per existing classifier).
2. **Moneda Extranjera:** include only foreign-currency businesses; show native foreign amounts; no TRM conversion; exclude COP.
3. **Peso Colombiano:** include only COP businesses; show COP; no conversion; exclude foreign.

#### Scenario: Todas converts to USD via TRM

- **GIVEN** Moneda is Todas and TRM is available
- **WHEN** KPI values are displayed
- **THEN** amounts SHALL be expressed in USD using automatic TRM for COP portions

#### Scenario: Moneda Extranjera excludes COP

- **GIVEN** Moneda is Moneda Extranjera
- **WHEN** KPIs and table are computed
- **THEN** only foreign-currency businesses SHALL be included
- **AND** amounts SHALL NOT be converted via TRM

#### Scenario: Peso Colombiano excludes foreign

- **GIVEN** Moneda is Peso Colombiano
- **WHEN** KPIs and table are computed
- **THEN** only COP businesses SHALL be included
- **AND** amounts SHALL remain in COP without TRM conversion

---

### Requirement: Hierarchy tree filters aggregates and table

The report SHALL reuse the production-dashboard hierarchy checkbox tree pattern (search, cascade, indeterminate). Selecting/deselecting nodes MUST affect KPIs, Regular vs Única comparison, and detail table. Empty selection MUST yield zero KPIs and an empty table without leaking out-of-scope data. Server MUST intersect requested user IDs with the viewer’s hierarchical scope.

#### Scenario: Node selection narrows KPIs and table

- **GIVEN** the hierarchy tree has multiple selected agents
- **WHEN** the user deselects a subtree
- **THEN** KPIs, comparison, and table SHALL exclude businesses of deselected users

#### Scenario: Empty hierarchy yields zeros

- **GIVEN** no hierarchy users are selected
- **WHEN** aggregates are requested
- **THEN** KPIs SHALL be zero
- **AND** the detail table SHALL be empty
- **AND** the server SHALL NOT return businesses outside the empty selection

---

### Requirement: KPI Producción Real

KPI **Producción Real** MUST equal the sum of in-scope business values (after filters, hierarchy, currency mode, MFUND exclusion) and a matching business count.

#### Scenario: Sum and count match filtered set

- **GIVEN** an applied filter set yielding N non-MFUND businesses with total value V (in the active currency mode)
- **WHEN** Producción Real KPI is shown
- **THEN** the sum SHALL equal V
- **AND** the count SHALL equal N

---

### Requirement: KPI Regular

KPI **Regular** MUST sum in-scope businesses whose product contribution type is Regular, respecting MFUND exclusion and all other applied filters.

#### Scenario: Regular sum uses Regular contribution type only

- **GIVEN** mixed Regular and Único businesses in scope
- **WHEN** KPI Regular is computed
- **THEN** only Regular contribution-type businesses SHALL be included
- **AND** MFUND businesses SHALL be excluded

---

### Requirement: KPI Único

KPI **Único** MUST sum in-scope businesses whose product contribution type is Único, respecting MFUND exclusion and excluding 2ª+ Anualidad (payments with `installmentIndex >= 2` MUST NOT contribute to this KPI).

#### Scenario: Único excludes MFUND and 2ª+ Anualidad

- **GIVEN** Único businesses and cases that represent 2ª+ Anualidad production events
- **WHEN** KPI Único is computed
- **THEN** only first-contribution Único (non-MFUND) production SHALL be included
- **AND** 2ª+ Anualidad amounts SHALL be excluded

---

### Requirement: KPI Fondeado and conversion percent

KPI **Fondeado** MUST sum in-scope businesses with status Fondeado (same exclusions/filters/currency mode). It MUST also show conversion % = (Fondeado sum / Producción Real sum) × 100, or 0% when Producción Real is zero.

#### Scenario: Conversion percent from Fondeado over Producción Real

- **GIVEN** Producción Real sum is 1000 and Fondeado sum is 250 in the same unit
- **WHEN** KPI Fondeado is shown
- **THEN** conversion percent SHALL be 25%

---

### Requirement: Visual Regular vs Única comparison

The page SHALL show a proportional horizontal bar comparison of Regular vs Única totals consistent with the Regular and Único KPIs.

#### Scenario: Bars proportional to KPI totals

- **GIVEN** Regular total R and Único total U from KPIs
- **WHEN** the comparison renders
- **THEN** bar lengths SHALL be proportional to R and U (or both empty/zero when totals are zero)

---

### Requirement: Detail table columns and consistency

The detail table MUST show continuous scroll (or equivalent non-paginated long list UX) with columns: F. Creación, Cliente (Nombre + Apellido), Agente, Compañía, Producto, Tipo (Regular/Único), Estado, Valor, F. Emisión, F. Fondeo. Rows MUST respect the same filters, hierarchy, MFUND exclusion, and currency mode as KPIs. Business dates MUST display via Bogotá-safe formatting.

#### Scenario: Table columns present and aligned with KPIs

- **GIVEN** applied filters yielding a known set of businesses used for Producción Real
- **WHEN** the detail table is rendered
- **THEN** it SHALL include exactly those businesses (same count as Producción Real count)
- **AND** each required column SHALL be present

---

### Requirement: Excel export with three sheets

**Descargar Excel** MUST produce a workbook with sheets **Resumen KPI**, **Regular vs Única**, and **Detalle**, using the same applied filters and hierarchy selection as the screen. Export MUST be audited. Unauthorized users MUST NOT export.

#### Scenario: Excel matches screen filters

- **GIVEN** applied filters and hierarchy selection on screen
- **WHEN** the user activates **Descargar Excel**
- **THEN** the file SHALL contain sheets Resumen KPI, Regular vs Única, and Detalle
- **AND** figures and rows SHALL match the on-screen aggregates and table for those filters

#### Scenario: Export denied without permission

- **GIVEN** a user without `PRODUCCION_REAL` permission
- **WHEN** they call the export API
- **THEN** the system SHALL deny the request
