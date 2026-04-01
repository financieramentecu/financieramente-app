# Capability: Negocios

## Purpose
Gestionar la creación, edición y visualización de los negocios (vouchers/comisiones) dentro de la plataforma, asegurando que la información capturada sea precisa y clara para los agentes.

## Requirements

### Requirement: Simplificación de Textos de Ayuda y Opciones de Moneda
El sistema debe reducir la carga cognitiva y confusión del usuario en el formulario de creación de negocios mediante la limpieza y precisión de los textos informativos.

#### Scenario: Eliminar mensaje de negocios internacionales
- **WHEN** El usuario se encuentra en la sección de información del producto del formulario "Crear Negocio".
- **THEN** No debe visualizarse el mensaje de ayuda: "Si estas registrado a un negocio internacional elige el nombre del producto...".

#### Scenario: Renombrar opción de Moneda USD
- **WHEN** El usuario despliega el selector de "Moneda" en el formulario "Crear Negocio".
- **THEN** La opción correspondiente al Dólar Americano debe mostrarse con la etiqueta "Moneda Extranjera".

#### Scenario: Actualizar mensaje de ayuda del campo Valor
- **WHEN** El usuario visualiza la sección "Información del negocio" en el formulario "Crear Negocio".
- **THEN** El texto informativo sobre el valor del negocio debe decir: "Recuerde que el campo Valor debe ser equivalente al valor de la prima por 12".
- **AND** Se omiten las referencias previas a "Crea Patrimonio de Skandia" y otras condiciones específicas.


### Requirement: Edit client origin from Ver Negocio modal when EMITIDO

The system SHALL display a confirmation alert before persisting the new client origin if the business is in `EMITIDO` state. The alert MUST warn the user that commissions will be recalculated. If accepted, the system SHALL call the update API.
(Previously: The system saved the origin immediately without alerting about recalculation.)

#### Scenario: User saves new origin and accepts recalculation warning

- GIVEN the user is in edit mode (Select visible) and has selected a different client origin for a business in EMITIDO state
- WHEN the user clicks "Guardar"
- THEN the system SHALL display an alert warning that commissions will be recalculated
- WHEN the user confirms the alert
- THEN the system SHALL send the update request to change `idClientOrigin`
- AND the modal SHALL return to the label view showing the new origin

#### Scenario: User cancels origin change at the warning

- GIVEN the user is in edit mode and has selected a different client origin
- WHEN the user clicks "Guardar"
- THEN the system SHALL display an alert warning that commissions will be recalculated
- WHEN the user cancels or dismisses the alert
- THEN the system SHALL NOT send the update request
- AND the modal SHALL remain in edit mode or revert the selection without saving

---

### Requirement: COMISIONANDO is a valid business status

The system MUST accept `COMISIONANDO` in types, API validation, and filters.

#### Scenario: Validation passes

- GIVEN `status=COMISIONANDO`
- WHEN validated
- THEN validation SHALL succeed

---

### Requirement: Liquidar sets EMITIDO to COMISIONANDO

Liquidar MUST set linked businesses from `EMITIDO` to `COMISIONANDO` only; other statuses unchanged.

#### Scenario: EMITIDO promoted

- GIVEN linked business `EMITIDO`
- WHEN Liquidar completes
- THEN status SHALL be `COMISIONANDO`

#### Scenario: Not EMITIDO

- GIVEN linked business not `EMITIDO`
- WHEN Liquidar completes
- THEN status SHALL be unchanged

#### Scenario: Idempotent COMISIONANDO

- GIVEN business already `COMISIONANDO`
- WHEN Liquidar completes again
- THEN status SHALL remain `COMISIONANDO`

---

### Requirement: COMISIONANDO in business list UI

The system SHOULD show a `COMISIONANDO` badge in business lists.

#### Scenario: Badge visible

- GIVEN row with `COMISIONANDO`
- WHEN rendered
- THEN a status indicator SHALL appear
