# Delta for Negocios

## ADDED Requirements

### Requirement: NEG-01 Ownership enforced on every sub-route

PUT `/api/negocios/[id]`, payments, annual-payments, the edit page and mark-novedad MUST authorize through the central helper (SEC-03). Agents are limited to businesses in their visible scope (self plus subordinates); partners to their own. Privileged roles keep current access.

#### Scenario: Agent edits business out of scope (behavior change)

- GIVEN an AGENTE and a business outside self+subordinates
- WHEN PUT, payments, annual-payments or mark-novedad is called
- THEN 403/404 and no change

#### Scenario: Edit page

- GIVEN a user without access to a business
- WHEN opening its edit page
- THEN not-found or redirect

### Requirement: NEG-02 Partner business creation

When the session role is PARTNER, `createBusiness` MUST force `idUser` to the session user and resolve the PPC through the PARTNER_EXTERNAL configuration of the product, flagged for new businesses. If the product has no such PPC the creation MUST fail with a clear Spanish error and persist nothing.

#### Scenario: Create

- GIVEN a partner and a product with a partner PPC
- WHEN the business is created
- THEN `idUser` equals the partner and the PPC belongs to PARTNER_EXTERNAL

#### Scenario: Missing PPC

- GIVEN a product without a partner PPC
- WHEN the partner creates a business
- THEN creation fails with no row written

### Requirement: NEG-03 Partner list, export and restrictions

List and export for PARTNER MUST be limited to own businesses (list/export parity). PARTNER MUST NOT cancel; the cancel UI MUST be hidden and the endpoint MUST return 403. Leaders and superiors MUST see their partners' businesses through hierarchical visibility.

#### Scenario: Leader visibility

- GIVEN a partner under leader L
- WHEN L (or a superior) lists businesses
- THEN the partner's businesses appear

## MODIFIED Requirements

### Requirement: Validación de Rol en Endpoint de Actualización

El endpoint `PUT /api/negocios/[id]` MUST validar los permisos del usuario antes de procesar cambios en campos sensibles que afectan la liquidación, y MUST verificar que el negocio pertenezca al alcance del usuario (AGENTE: propio y subordinados; PARTNER: propio) antes de cualquier cambio.
(Previously: only role-based field validation; no ownership check for non-privileged roles.)

#### Scenario: API procesa actualización total para Admin

- **GIVEN** una petición `PUT` con cambios en `valor` e `idProduct` realizada por un `ADMIN`
- **WHEN** el backend recibe la solicitud
- **THEN** el sistema MUST validar que el estado del negocio permita la edición (ej: no `LIQUIDADO`)
- **AND** el sistema SHALL actualizar todos los campos proporcionados en la base de datos

#### Scenario: API rechaza actualización de campos sensibles para Agente

- **GIVEN** una petición `PUT` con cambios en `valor` realizada por un `AGENTE`
- **WHEN** el backend recibe la solicitud
- **THEN** el sistema MUST retornar un error HTTP 403 (Forbidden) o ignorar los campos no permitidos para ese rol, persistiendo solo los autorizados (Contrato)

#### Scenario: Ownership rejected for agent and partner

- **GIVEN** un negocio fuera del alcance del `AGENTE` o `PARTNER` solicitante
- **WHEN** envía `PUT` sobre ese negocio
- **THEN** el sistema MUST retornar 403/404 sin modificar datos ni escribir AuditLog

#### Scenario: Partner edit rules

- **GIVEN** un `PARTNER` que edita su propio negocio en `EMITIDO`
- **WHEN** modifica campos clave o contrato
- **THEN** el sistema MUST rechazar el cambio, igual que para un agente
