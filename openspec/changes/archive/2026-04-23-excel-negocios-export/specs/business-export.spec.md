# Spec: Business Excel Export

## Requirements

### Requirement: Professional Excel Format for Liquidation
The system MUST provide a professional Excel report with specific column ordering, styling, and calculated fields to facilitate manual commission liquidation.

#### Scenario: Professional Header Styling
- **GIVEN** the Excel export is requested
- **WHEN** the file is generated
- **THEN** header cells MUST have a light blue background (`#ADD8E6`) and bold font.
- **AND** they SHALL include a thin bottom border.

#### Scenario: Calculated Time Fields (Month and Year)
- **GIVEN** a business with an emission date (`dateIssued`)
- **WHEN** the export row is mapped
- **THEN** a "Mes" column MUST contain the full name of the month in Spanish (e.g., "Enero", "Febrero")
- **AND** an "Año" column MUST contain the 4-digit year (YYYY) of the emission date
- **AND** if the emission date is missing, these fields SHALL be empty

#### Scenario: Auto-sizing Columns
- **GIVEN** the Excel file is being generated
- **WHEN** the worksheet is finalized
- **THEN** each column width MUST be automatically adjusted to fit the maximum length of its content (header or data)
- **AND** a reasonable padding SHALL be added for readability

#### Scenario: Specific Column Order and Naming
- **GIVEN** the export is requested
- **WHEN** the spreadsheet is generated
- **THEN** the columns MUST follow this exact order and naming (sentence case):
  1.  **Agente** (Full name of business user)
  2.  **Nombres y Apellidos del Cliente** (Full name of client)
  3.  **Cedula del cliente** (Client identity number)
  4.  **Origen del cliente** (Client origin name)
  5.  **Email Cliente** (Client email)
  6.  **Compañía** (Company name)
  7.  **Plazo** (Business term)
  8.  **Periodicidad** (Buy periodicity name)
  9.  **Es anualidad** (Indication of annual installments: "Sí" if 1+, "No" otherwise)
  10. **Producto** (Product name)
  11. **Número de contrato** (Business contract)
  12. **Moneda** (Currency name)
  13. **Valor negocio** (Business value)
  14. **Líder encargado** (Immediate leader's full name)
  15. **Categoría líder** (Immediate leader's category)
  16. **Estado del negocio** (Business status)
  17. **Fecha de emisión** (Formatted emission date)
  18. **Fecha de fondeo** (Formatted business funding date)
  19. **Fecha de creación** (Formatted creation date)
  20. **Fecha de anualidades** (One column for each installment: "Fecha fondeo anualidad n")
  21. **Mes** (Name of month)
  22. **Año** (Calculated year)
