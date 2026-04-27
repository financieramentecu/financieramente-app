# Delta for negocios

## MODIFIED Requirements

### Requirement: Enhanced operational Excel export

The system MUST provide professional Excel exports with advanced styling, auto-sizing columns, and specific fields for liquidation analysis.

(Previously: Fixed column order placed periodicidad before producto, origen before correo/teléfono; date order emisión/fondeo/creación before líder extra; currency column labeled "Valor negocio"; annual columns summarized as "Fecha de anualidades (dinámicas)".)

#### Scenario: Professional Styling and Auto-sizing

- **GIVEN** the Excel export is requested
- **WHEN** the file is generated
- **THEN** header cells MUST have a light blue background (`#ADD8E6`) and bold font.
- **AND** all columns MUST automatically adjust their width to fit the content (header or data).

#### Scenario: Formatting and Calculated Fields

- **GIVEN** the report is generated
- **WHEN** the data rows are populated
- **THEN** the **Valor de Negocio** column MUST use currency format `$#,##0.00`.

#### Scenario: Specific Column Order and Naming without Date Filters

- **GIVEN** the Excel report is generated without date filters (`dateFrom` and `dateTo` absent)
- **WHEN** the columns are populated left-to-right
- **THEN** the fixed columns MUST appear in this exact order and spelling:
  1. Agente  
  2. Nombres y Apellidos del Cliente  
  3. Número de Cédula  
  4. Correo Electrónico  
  5. Teléfono  
  6. Origen del cliente  
  7. Compañía  
  8. Plazo  
  9. Producto  
  10. Número de Contrato  
  11. Moneda  
  12. Valor de Negocio  
  13. Periodicidad del pago  
  14. Líder Encargado  
  15. Categoría Líder  
  16. Estado de negocio  
  17. Fecha de Creación  
  18. Fecha de Emisión  
  19. Fecha de Fondeo  
- **AND** IF additional leader hierarchy columns are emitted for leaders beyond the first, they MUST appear immediately after **Fecha de Fondeo** as successive pairs **Líder N nombre**, **Líder N categoría** for N = 2, 3, … as needed.
- **AND** IF annual installment date columns are emitted for annual periodicity, they MUST appear after any **Líder N** columns and MUST be labeled **Fecha Fondeo Anualidad 1** … **Fecha Fondeo Anualidad n** where **n** is the maximum count required for the exported set.

#### Scenario: Specific Column Order and Naming with Date Filters

- **GIVEN** the Excel report is generated with date filters (`dateFrom` and `dateTo` present)
- **WHEN** the columns are populated left-to-right
- **THEN** the fixed columns MUST appear in this exact order and spelling before any dynamic **Líder N** or **Fecha Fondeo Anualidad** columns:
  1. Fecha inicial fondeo  
  2. Fecha final fondeo  
  3. Agente  
  4. Nombres y Apellidos del Cliente  
  5. Número de Cédula  
  6. Correo Electrónico  
  7. Teléfono  
  8. Origen del cliente  
  9. Compañía  
  10. Plazo  
  11. Producto  
  12. Número de Contrato  
  13. Moneda  
  14. Valor de Negocio  
  15. Periodicidad del pago  
  16. Líder Encargado  
  17. Categoría Líder  
  18. Estado de negocio  
  19. Fecha de Creación  
  20. Fecha de Emisión  
  21. Fecha de Fondeo  
- **AND** dynamic **Líder N** pairs and **Fecha Fondeo Anualidad 1…n** MUST follow the same placement rules as in **Specific Column Order and Naming without Date Filters**.
