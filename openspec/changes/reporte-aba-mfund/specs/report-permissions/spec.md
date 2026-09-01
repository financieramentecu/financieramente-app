## ADDED Requirements

### Requirement: Catalog includes ABA-MFUND

The report catalog MUST include a report whose display name is **ABA-MFUND** and whose stable machine code is `ABA_MFUND`. Existing catalog entries, including **Producción Real** with code `PRODUCCION_REAL`, MUST remain valid.

#### Scenario: Catalog lists ABA-MFUND

- **GIVEN** the system is seeded for this change
- **WHEN** the administrator opens Permisos de Reportes
- **THEN** a report whose display name is **ABA-MFUND** and code is `ABA_MFUND` SHALL appear in the list

#### Scenario: Producción Real remains in the catalog

- **GIVEN** the system is seeded for this change
- **WHEN** the administrator opens Permisos de Reportes
- **THEN** a report whose display name is **Producción Real** and code is `PRODUCCION_REAL` SHALL still appear in the list

---

### Requirement: Default seed for ABA-MFUND on Performance Leader and Business Leader

After seed for this change, the categories named exactly **Performance Leader** and **Business Leader** MUST be enabled for report code `ABA_MFUND`. Other categories MAY remain disabled for `ABA_MFUND` until an administrator enables them. Default enablement of **Performance Leader** for `PRODUCCION_REAL` MUST remain unchanged.

#### Scenario: Performance Leader has ABA-MFUND enabled by default

- **GIVEN** a fresh environment with seeds applied
- **WHEN** permissions for `ABA_MFUND` are loaded
- **THEN** the **Performance Leader** category SHALL be enabled

#### Scenario: Business Leader has ABA-MFUND enabled by default

- **GIVEN** a fresh environment with seeds applied
- **WHEN** permissions for `ABA_MFUND` are loaded
- **THEN** the **Business Leader** category SHALL be enabled

#### Scenario: Other categories remain disabled for ABA-MFUND until configured

- **GIVEN** a fresh environment with seeds applied
- **AND** a category that is not named **Performance Leader** or **Business Leader**
- **WHEN** permissions for `ABA_MFUND` are loaded
- **THEN** that category MAY remain disabled until an administrator enables it

#### Scenario: Performance Leader Producción Real seed remains valid

- **GIVEN** a fresh environment with seeds applied
- **WHEN** permissions for `PRODUCCION_REAL` are loaded
- **THEN** the **Performance Leader** category SHALL still be enabled
