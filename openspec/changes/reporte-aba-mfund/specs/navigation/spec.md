## ADDED Requirements

### Requirement: Reportes includes ABA-MFUND gated by category permission

The **Reportes** menu group SHALL include a sub-item **ABA-MFUND** linking to `/dashboard/reportes/aba-mfund`. That sub-item SHALL appear only when report code `ABA_MFUND` is enabled for the user’s category, or the user has an administrator bypass. Visibility of **Producción Real** SHALL remain independently gated by `PRODUCCION_REAL`.

#### Scenario: Authorized category sees Reportes → ABA-MFUND

- **GIVEN** the user’s category is enabled for `ABA_MFUND`
- **WHEN** the sidebar renders
- **THEN** **Reportes** SHALL be visible
- **AND** **ABA-MFUND** SHALL appear as a sub-item
- **AND** activating it SHALL navigate to `/dashboard/reportes/aba-mfund`

#### Scenario: Unauthorized category hides ABA-MFUND

- **GIVEN** the user’s category is not enabled for `ABA_MFUND`
- **AND** the user is not an administrator bypass
- **WHEN** the sidebar renders
- **THEN** **ABA-MFUND** SHALL NOT appear under Reportes

#### Scenario: Administrator bypass sees ABA-MFUND

- **GIVEN** an authenticated user with administrator role bypass
- **WHEN** the sidebar renders
- **THEN** **ABA-MFUND** SHALL appear under **Reportes**
- **AND** activating it SHALL navigate to `/dashboard/reportes/aba-mfund`

#### Scenario: Producción Real remains independently visible

- **GIVEN** the user’s category is enabled for `PRODUCCION_REAL`
- **AND** that category is not enabled for `ABA_MFUND`
- **AND** the user is not an administrator bypass
- **WHEN** the sidebar renders
- **THEN** **Producción Real** SHALL appear under Reportes
- **AND** **ABA-MFUND** SHALL NOT appear
