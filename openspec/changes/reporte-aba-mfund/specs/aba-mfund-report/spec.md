## Purpose

Provides a dedicated ABA-MFUND report under Reportes so authorized leaders can analyze SKANDIA MFUND sales using COP KPIs, a Top 6 agent ranking, a detail table, and Excel export of filtered rows.

## ADDED Requirements

### Requirement: Access gated by administrator bypass or ABA_MFUND permission

Only authenticated users with an administrator role bypass **or** an enabled category report permission for code `ABA_MFUND` SHALL access the ABA-MFUND page and its data APIs. HU “Administrador” means the administrator role bypass, not a user category named Administrador. Default seed enablement for category names exactly **Performance Leader** and **Business Leader** is specified in report-permissions; this report MUST honor those permissions at page and API time. Unauthorized requests MUST be denied.

#### Scenario: Administrator bypass can open the report

- **GIVEN** an authenticated user with administrator role bypass
- **WHEN** they open `/dashboard/reportes/aba-mfund` or call an ABA-MFUND report API
- **THEN** the request SHALL proceed past the report-permission check

#### Scenario: Performance Leader with ABA_MFUND can open the report

- **GIVEN** an authenticated user whose category name is **Performance Leader**
- **AND** that category is enabled for report code `ABA_MFUND`
- **AND** the user is not relying on administrator bypass
- **WHEN** they open the ABA-MFUND page or call an ABA-MFUND report API
- **THEN** the request SHALL proceed past the report-permission check

#### Scenario: Business Leader with ABA_MFUND can open the report

- **GIVEN** an authenticated user whose category name is **Business Leader**
- **AND** that category is enabled for report code `ABA_MFUND`
- **AND** the user is not relying on administrator bypass
- **WHEN** they open the ABA-MFUND page or call an ABA-MFUND report API
- **THEN** the request SHALL proceed past the report-permission check

#### Scenario: Category without ABA_MFUND is denied

- **GIVEN** an authenticated user whose category is not enabled for `ABA_MFUND`
- **AND** the user does not have administrator role bypass
- **WHEN** they open the ABA-MFUND page or call an ABA-MFUND report API
- **THEN** the system SHALL deny access

---

### Requirement: Feature flag reportes_aba_mfund with enabled fallback

The ABA-MFUND page, its APIs, and the **Reportes** sub-item **ABA-MFUND** MUST be gated by feature flag `reportes_aba_mfund`. When the remote flag service does not supply a value, the system MUST treat the flag as enabled (`true`). When the flag is disabled, the report MUST NOT be usable even if the user has `ABA_MFUND` permission.

#### Scenario: Flag enabled allows authorized access

- **GIVEN** `reportes_aba_mfund` is enabled
- **AND** the user is authorized for `ABA_MFUND` or has administrator bypass
- **WHEN** they open `/dashboard/reportes/aba-mfund`
- **THEN** the ABA-MFUND report SHALL render

#### Scenario: Missing remote value falls back to enabled

- **GIVEN** the remote flag service does not return `reportes_aba_mfund`
- **AND** the user is authorized for the report
- **WHEN** they open the ABA-MFUND page or call an ABA-MFUND API
- **THEN** the system SHALL treat the flag as enabled
- **AND** authorized access SHALL proceed

#### Scenario: Disabled flag blocks the report

- **GIVEN** `reportes_aba_mfund` is disabled
- **AND** the user would otherwise be authorized for `ABA_MFUND`
- **WHEN** they open the ABA-MFUND page, call an ABA-MFUND API, or inspect **Reportes**
- **THEN** the page and APIs SHALL deny access
- **AND** the **ABA-MFUND** sub-item SHALL NOT appear

---

### Requirement: Fixed SKANDIA MFUND universe

The report universe MUST include only businesses whose company name is SKANDIA **and** whose product name is MFUND. Every other company/product combination MUST be excluded from KPIs, ranking, detail table, and Excel, including when a client tampers with query parameters. The page MUST NOT expose Compañía or Producto pickers that expand this universe.

#### Scenario: Only SKANDIA MFUND rows are included

- **GIVEN** the filtered date range contains SKANDIA MFUND businesses and businesses of other companies or products
- **WHEN** KPIs, ranking, detail table, and Excel are computed
- **THEN** only SKANDIA MFUND businesses SHALL contribute counts, sums, ranking volume, table rows, and export rows
- **AND** all other businesses SHALL be excluded

#### Scenario: Non-MFUND SKANDIA is excluded

- **GIVEN** SKANDIA businesses whose product name is not MFUND exist in range
- **WHEN** the report aggregates and lists rows
- **THEN** those businesses SHALL NOT appear and SHALL NOT affect any KPI or ranking

---

### Requirement: Default filters on first load

On first load, applied filters MUST default as follows: **Desde** / **Hasta** = the current calendar month in America/Bogotá bounded by **Fecha de creación**; **Jerarquía** = **Toda**; **Estado** = **Todos**. The SKANDIA + MFUND universe remains fixed and is not a user-selectable default.

#### Scenario: Default date range is the current Bogotá month by creation date

- **GIVEN** an authorized user opens ABA-MFUND
- **WHEN** the page loads before any filter change
- **THEN** Desde and Hasta SHALL span the current Bogotá month
- **AND** applying those defaults SHALL include only businesses whose **Fecha de creación** falls in that inclusive range

#### Scenario: Default Jerarquía is Toda

- **GIVEN** the page just loaded
- **WHEN** hierarchy defaults are inspected
- **THEN** Jerarquía SHALL be **Toda**

#### Scenario: Default Estado is Todos

- **GIVEN** the page just loaded
- **WHEN** status defaults are inspected
- **THEN** Estado SHALL be **Todos**

---

### Requirement: Draft versus applied filters

Changing date or status filter controls MUST NOT refresh KPIs, ranking, or the detail table until the user activates **Aplicar**. **Limpiar** MUST restore the default filters defined for this report. **Exportar a Excel** MUST use the currently applied filters and hierarchy selection.

#### Scenario: Aplicar commits draft filters

- **GIVEN** the user changes draft Desde, Hasta, or Estado without applying
- **WHEN** they activate **Aplicar**
- **THEN** KPIs, ranking, and the detail table SHALL refresh using the new filters

#### Scenario: Draft changes do not query until Aplicar

- **GIVEN** applied filters are the defaults
- **WHEN** the user changes draft date or status controls and does not activate **Aplicar**
- **THEN** KPIs, ranking, and the detail table SHALL continue to reflect the previously applied filters

#### Scenario: Limpiar restores defaults

- **GIVEN** non-default draft or applied filters
- **WHEN** the user activates **Limpiar**
- **THEN** filters SHALL return to the current Bogotá month on **Fecha de creación**, Jerarquía **Toda**, and Estado **Todos**
- **AND** the universe SHALL remain SKANDIA + MFUND only

---

### Requirement: Estado Todos includes CANCELADO unless filtered

Estado **Todos** MUST apply no status filter, so businesses in status CANCELADO SHALL be included whenever they otherwise match the universe, dates, and hierarchy. **ABA Total** MUST include every status present after filters. Selecting a specific Estado MUST exclude businesses that do not have that status.

#### Scenario: Todos includes cancelled businesses

- **GIVEN** applied Estado is **Todos**
- **AND** matching SKANDIA MFUND businesses include CANCELADO and other statuses
- **WHEN** KPIs and the detail table are computed
- **THEN** CANCELADO businesses SHALL be included in **ABA Total**, the table, ranking volume, and Excel

#### Scenario: Specific Estado excludes other statuses

- **GIVEN** the user applies Estado Fondeado
- **AND** CANCELADO and Emitido businesses exist in the same date and hierarchy scope
- **WHEN** KPIs and the detail table are computed
- **THEN** only Fondeado businesses SHALL be included
- **AND** CANCELADO and Emitido businesses SHALL be excluded

---

### Requirement: Amounts are COP only with no TRM

All monetary amounts on this report (KPIs, ranking values, detail table, and Excel) MUST be expressed in Colombian pesos (COP). The report MUST NOT offer a currency mode, MUST NOT convert via TRM, and MUST NOT display USD or mixed-currency totals.

#### Scenario: KPIs display COP without conversion

- **GIVEN** filtered businesses have COP values
- **WHEN** KPIs, ranking, table, and Excel are shown
- **THEN** every monetary amount SHALL be in COP
- **AND** no TRM conversion SHALL be applied

#### Scenario: Non-COP businesses are not mixed into totals

- **GIVEN** SKANDIA MFUND businesses in a non-COP currency exist in range
- **WHEN** the report computes amounts
- **THEN** displayed money SHALL remain COP-only
- **AND** the report SHALL NOT convert those rows via TRM or present a currency picker

---

### Requirement: Hierarchy selection and viewer scope

The report SHALL reuse the existing production-dashboard hierarchy checkbox tree (search, cascade, indeterminate). Selecting or deselecting nodes MUST affect KPIs, ranking, and the detail table. For a non-administrator, Jerarquía **Toda** MUST mean the viewer’s visible subtree only. The server MUST intersect requested users with the viewer’s hierarchical scope and MUST NOT leak businesses outside that scope. Empty selection MUST yield zero KPIs, an empty ranking, and an empty table.

#### Scenario: Non-admin Toda is the visible subtree

- **GIVEN** a non-administrator whose visible hierarchy is a subtree of the company
- **AND** Jerarquía is **Toda**
- **WHEN** KPIs, ranking, and the table are computed
- **THEN** only businesses whose owner is inside that visible subtree SHALL be included
- **AND** businesses owned by users outside the subtree SHALL NOT appear

#### Scenario: Administrator Toda can include the full tree

- **GIVEN** an administrator viewing the report with Jerarquía **Toda**
- **AND** SKANDIA MFUND businesses exist both inside and outside a typical leader subtree
- **WHEN** aggregates are computed
- **THEN** the selection SHALL cover the full hierarchy available to administrators
- **AND** results SHALL still respect the SKANDIA MFUND universe and other applied filters

#### Scenario: Deselecting a subtree narrows results

- **GIVEN** the hierarchy tree has multiple selected agents
- **WHEN** the user deselects a subtree
- **THEN** KPIs, ranking, and the table SHALL exclude businesses of deselected users

#### Scenario: Empty hierarchy yields zeros without leakage

- **GIVEN** no hierarchy users are selected
- **WHEN** aggregates are requested
- **THEN** KPI amounts SHALL be zero
- **AND** ranking and the detail table SHALL be empty
- **AND** the server SHALL NOT return businesses outside the empty selection

---

### Requirement: KPI ABA Total

KPI **ABA Total** MUST equal the sum of business values of all rows in the filtered set (SKANDIA + MFUND, applied dates, hierarchy, and Estado), including every status present after filters. Amounts MUST be COP.

#### Scenario: ABA Total matches the filtered sum

- **GIVEN** an applied filter set yielding N SKANDIA MFUND businesses whose COP values sum to V
- **WHEN** **ABA Total** is shown
- **THEN** the amount SHALL equal V
- **AND** those N businesses SHALL be the same set used for the detail table

---

### Requirement: KPI Fondeado

KPI **Fondeado** MUST equal the sum of business values in the filtered set whose status is Fondeado (`FONDEADO`). Amounts MUST be COP.

#### Scenario: Fondeado sums only FONDEADO rows

- **GIVEN** mixed Fondeado, Emitido, and other statuses in the filtered SKANDIA MFUND set
- **WHEN** KPI **Fondeado** is computed
- **THEN** only businesses with status Fondeado SHALL be summed
- **AND** other statuses SHALL NOT contribute to **Fondeado**

---

### Requirement: KPI Emitido

KPI **Emitido** MUST equal the sum of business values in the filtered set whose status is Emitido (`EMITIDO`). Amounts MUST be COP.

#### Scenario: Emitido sums only EMITIDO rows

- **GIVEN** mixed Emitido and non-Emitido businesses in the filtered SKANDIA MFUND set
- **WHEN** KPI **Emitido** is computed
- **THEN** only businesses with status Emitido SHALL be summed
- **AND** other statuses SHALL NOT contribute to **Emitido**

---

### Requirement: KPI Ticket promedio ABA

KPI **Ticket promedio ABA** MUST equal **ABA Total** divided by the count of businesses in the filtered set. When that count is 0, **Ticket promedio ABA** MUST be 0. Amounts MUST be COP.

#### Scenario: Ticket promedio is ABA Total divided by count

- **GIVEN** **ABA Total** is 1_000_000 COP and the filtered set contains 4 businesses
- **WHEN** **Ticket promedio ABA** is shown
- **THEN** the amount SHALL equal 250_000 COP

#### Scenario: Ticket promedio is zero when there are no businesses

- **GIVEN** the filtered set contains 0 businesses
- **WHEN** **Ticket promedio ABA** is shown
- **THEN** the amount SHALL be 0

---

### Requirement: Ranking heatmap ABA por Agente Top 6

The page SHALL show a ranking titled **ABA por Agente (Top 6)** as a heatmap of the Top 6 agents by sales volume descending. Agente MUST be the business owner, not a commission beneficiary. When two agents have the same volume, the system MUST break ties by agent display name ascending, then by owner user identifier ascending. Ranking volume MUST use the same filtered SKANDIA MFUND set as **ABA Total**.

#### Scenario: Top 6 agents by volume

- **GIVEN** more than six owners have filtered SKANDIA MFUND volume
- **WHEN** **ABA por Agente (Top 6)** renders
- **THEN** exactly the six highest-volume owners SHALL appear
- **AND** they SHALL be ordered by volume descending

#### Scenario: Agent is the business owner

- **GIVEN** a business whose owner differs from a commission beneficiary
- **WHEN** ranking volume is attributed
- **THEN** the volume SHALL count toward the owner
- **AND** SHALL NOT be attributed to the commission beneficiary unless that person is also the owner

#### Scenario: Tie-break by name then owner identifier

- **GIVEN** two owners with the same filtered volume
- **AND** owner A’s display name sorts before owner B’s, or the names are equal and A’s owner identifier is lower
- **WHEN** ranking order is computed
- **THEN** owner A SHALL appear before owner B

---

### Requirement: Ranking expand row shows related businesses

Clicking an agent in **ABA por Agente** MUST expand a row of that agent’s related businesses from the same filtered set. Each expanded business MUST show **Producto**, **Contrato**, **Valor**, **Estado**, and **Ir a negocio**. Multiple agents MAY be expanded at the same time.

#### Scenario: Clicking an agent expands related businesses

- **GIVEN** an agent row is collapsed
- **WHEN** the user clicks that agent
- **THEN** an expanded row SHALL list that owner’s filtered SKANDIA MFUND businesses
- **AND** each row SHALL show Producto, Contrato, Valor, Estado, and **Ir a negocio**

#### Scenario: Ir a negocio opens the business

- **GIVEN** an expanded business row
- **WHEN** the user activates **Ir a negocio**
- **THEN** the system SHALL navigate to that business’s detail

---

### Requirement: Detail table columns

The detail table MUST list every business in the filtered set and MUST show exactly these columns: **Fecha de creación**, **Cliente** (Nombre Apellido), **Periodicidad**, **Estado**, **Valor del Negocio** (COP), **Fecha de emisión**, **Fecha de Fondeo**. Rows MUST use the same universe, dates, hierarchy, and Estado as the KPIs. Business dates MUST display with Bogotá-safe formatting.

#### Scenario: Table columns match the HU and the filtered set

- **GIVEN** applied filters yielding a known set of SKANDIA MFUND businesses used for **ABA Total**
- **WHEN** the detail table is rendered
- **THEN** it SHALL include exactly those businesses
- **AND** the columns SHALL be Fecha de creación, Cliente (Nombre Apellido), Periodicidad, Estado, Valor del Negocio (COP), Fecha de emisión, and Fecha de Fondeo
- **AND** no extra business columns beyond that set SHALL be required

#### Scenario: Cliente is Nombre Apellido without a hyphen

- **GIVEN** a client whose first name is Ana and last name is Gómez
- **WHEN** that row renders
- **THEN** Cliente SHALL display **Ana Gómez**
- **AND** Cliente SHALL NOT display **Ana - Gómez**

---

### Requirement: Fecha de Fondeo shows the anchored funding date

The column labeled **Fecha de Fondeo** MUST show the business’s anchored funding date (the persisted funding-anchor date), not a substitute such as creation date or issuance date.

#### Scenario: Fecha de Fondeo matches the anchored funding date

- **GIVEN** a filtered business whose anchored funding date is 2026-08-15 and whose creation and issuance dates differ
- **WHEN** the detail table (and Excel) render **Fecha de Fondeo**
- **THEN** the value SHALL be that anchored funding date in Bogotá-safe display form
- **AND** SHALL NOT be replaced by creation date or issuance date

---

### Requirement: Excel export of filtered rows

The control **Exportar a Excel** MUST export all detail rows in the currently applied filtered set, up to a maximum of 5000 rows, using the same columns and amounts as the detail table. Export MUST be audited as `REPORT_EXPORTED`. Users without ABA-MFUND access MUST NOT export.

#### Scenario: Export contains all filtered rows up to 5000

- **GIVEN** applied filters yield R matching SKANDIA MFUND businesses where R is at most 5000
- **WHEN** the user activates **Exportar a Excel**
- **THEN** the workbook SHALL include those R rows
- **AND** figures SHALL match the on-screen detail table for those filters

#### Scenario: Export caps at 5000 rows

- **GIVEN** applied filters yield more than 5000 matching businesses
- **WHEN** the user activates **Exportar a Excel**
- **THEN** the workbook SHALL include at most 5000 rows
- **AND** SHALL NOT omit the cap

#### Scenario: Export is audited as REPORT_EXPORTED

- **GIVEN** an authorized user completes an Excel export
- **WHEN** the operation succeeds
- **THEN** an audit log entry SHALL be recorded with action `REPORT_EXPORTED`
- **AND** it SHALL include actor identity, IP, user agent, and a human-readable details string

#### Scenario: Export denied without permission

- **GIVEN** a user without `ABA_MFUND` permission and without administrator bypass
- **WHEN** they request the ABA-MFUND export
- **THEN** the system SHALL deny the request
- **AND** SHALL NOT write a successful export audit as if the file was produced
