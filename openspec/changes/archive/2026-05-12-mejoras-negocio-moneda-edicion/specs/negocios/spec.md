# Delta for Negocios

## ADDED Requirements

### Requirement: Flexibilidad de Selección de Moneda en Creación

El sistema SHALL facilitar la creación de negocios permitiendo el ajuste manual de la moneda, independientemente de la configuración por defecto de la compañía seleccionada.

#### Scenario: Cambio manual de moneda tras selección de compañía
- **GIVEN** el usuario está en el formulario de creación de negocio
- **WHEN** selecciona una compañía que tiene una moneda predeterminada (ej: USD)
- **THEN** el sistema SHALL cargar automáticamente esa moneda en el campo "Moneda"
- **AND** el sistema MUST mantener el campo "Moneda" habilitado para que el usuario pueda cambiarlo (ej: a COP) si lo desea

---

### Requirement: Edición Total de Negocios para Roles Privilegiados

El sistema MUST permitir la corrección total de la información de un negocio existente para usuarios con roles administrativos, asegurando la integridad operativa sin bloquear campos clave para estos perfiles.

#### Scenario: Usuario Admin edita campos restringidos
- **GIVEN** un usuario con rol `ADMIN` o `ASISTENTE_GERENCIA_OPERATIVA` visualiza un negocio en estado `EMITIDO`
- **WHEN** entra en modo edición
- **THEN** el sistema MUST habilitar los campos: Producto, Valor, Moneda, Periodicidad y Plazo
- **AND** el sistema MUST habilitar el cambio del Agente (Money Strategist) asignado
- **AND** el sistema SHALL enviar todos los cambios al endpoint `PUT /api/negocios/[id]` para su persistencia

#### Scenario: Usuario Agente mantiene edición restringida
- **GIVEN** un usuario con rol `AGENTE` visualiza su propio negocio en estado `EMITIDO`
- **WHEN** entra en modo edición
- **THEN** el sistema MUST mantener bloqueados los campos: Producto, Valor, Moneda, Periodicidad y Plazo
- **AND** el sistema MUST mantener bloqueado el campo Agente
- **AND** el sistema SHALL permitir únicamente la edición del número de Contrato (comportamiento actual)

#### Scenario: Bloqueo de información del cliente en edición de negocio
- **GIVEN** cualquier usuario en modo edición de un negocio
- **WHEN** visualiza la sección "Información del cliente"
- **THEN** el sistema MUST mantener todos los campos del cliente (Nombre, Documento, etc.) como solo lectura
- **AND** el sistema SHALL NOT permitir cambios en la entidad cliente desde este formulario

---

### Requirement: Validación de Rol en Endpoint de Actualización

El endpoint `PUT /api/negocios/[id]` MUST validar los permisos del usuario antes de procesar cambios en campos sensibles que afectan la liquidación.

#### Scenario: API procesa actualización total para Admin
- **GIVEN** una petición `PUT` con cambios en `valor` e `idProduct` realizada por un `ADMIN`
- **WHEN** el backend recibe la solicitud
- **THEN** el sistema MUST validar que el estado del negocio permita la edición (ej: no `LIQUIDADO`)
- **AND** el sistema SHALL actualizar todos los campos proporcionados en la base de datos

#### Scenario: API rechaza actualización de campos sensibles para Agente
- **GIVEN** una petición `PUT` con cambios en `valor` realizada por un `AGENTE`
- **WHEN** el backend recibe la solicitud
- **THEN** el sistema MUST retornar un error HTTP 403 (Forbidden) o ignorar los campos no permitidos para ese rol, persistiendo solo los autorizados (Contrato)
