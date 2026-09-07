# Spec: Admin

## Purpose
TBD - Documentación de las funcionalidades administrativas del sistema.

## Requirements

### Requirement: Unificación de UI Admin
Todos los módulos que utilizan `CrudTable` (Monedas, Productos, Periodicidades) deben migrar al componente `DataTable` unificado.

#### Scenario: Consistencia de Acciones
- **WHEN** Se migra una tabla de Admin.
- **THEN** Las acciones de Editar y Eliminar deben seguir funcionando pero inyectadas como celdas estándar en el nuevo motor.

#### Scenario: Búsqueda y Paginación
- **WHEN** El usuario busca o navega entre páginas en un módulo Admin.
- **THEN** El comportamiento debe ser el provisto por el motor TanStack integrado en `DataTable`.

### Requirement: Rol por defecto de Usuario Nuevo

El sistema MUST asignar el rol `AGENTE` por defecto y estado inactivo a cualquier usuario nuevo que inicie sesión por primera vez.

#### Scenario: Primer inicio de sesión de un usuario nuevo
- GIVEN que el usuario no existe en la base de datos
- WHEN el usuario hace inicio de sesión a través de OAuth (Google) o Credenciales
- THEN el sistema crea el usuario con el rol `AGENTE`
- AND el estado inicial del usuario es `active: false`
- AND el sistema bloquea el acceso informando que la cuenta está deshabilitada (independientemente del rol)
- AND el sistema envía una ÚNICA notificación por correo electrónico a los administradores informando sobre el nuevo usuario

### Requirement: Filtrado de Categorías Asignables

El sistema MUST permitir a los administradores seleccionar solo categorías con modo de beneficiario `OVERRIDE` al editar el perfil de un usuario.

#### Scenario: Visualización de categorías disponibles
- GIVEN que un administrador está editando un usuario en `UserActionsCard`
- WHEN abre el selector de Categorías
- THEN el selector solo muestra categorías cuyo `beneficiaryMode` sea exactamente `OVERRIDE`

### Requirement: Asignación Jerárquica de Líderes

El sistema MUST filtrar la lista de líderes disponibles basándose en el nivel jerárquico inmediatamente superior (`idNextCategory`) de la categoría asignada al usuario. Si no hay nivel superior, el sistema MUST deshabilitar la selección de líder.

#### Scenario: Asignación de líder para nivel intermedio
- GIVEN que un administrador selecciona una categoría que tiene un `nextCategory` válido (y de tipo `OVERRIDE`)
- WHEN el sistema carga la lista de líderes
- THEN el dropdown de líderes solo muestra usuarios activos que pertenecen a la categoría especificada en `idNextCategory`

#### Scenario: Asignación de líder para el último nivel jerárquico
- GIVEN que un administrador selecciona una categoría cuyo `nextCategory` es nulo o no es de tipo `OVERRIDE` (último nivel)
- WHEN el sistema actualiza la vista
- THEN el dropdown de líderes se deshabilita
- AND no se requiere seleccionar un líder para guardar los cambios

### Requirement: Visibilidad de Estado Completo en Tabla de Usuarios

El sistema MUST mostrar la Categoría y el Líder de cada usuario directamente en la vista general (tabla) de usuarios administradores.

#### Scenario: Visualización de la lista de usuarios
- GIVEN que el administrador entra a la página de gestión de usuarios
- WHEN se renderiza la tabla principal
- THEN la tabla muestra columnas dedicadas para la Categoría y el Líder
- AND si el usuario no tiene categoría o líder asignado, se indica visualmente

---

## ADDED Requirements (from reportes-produccion-real-y-permisos)

### Requirement: Permisos de Reportes module in Administración

The Administración hub SHALL include a card/module for configuring report visibility by user category, navigating to `/dashboard/admin/report-permissions`.

#### Scenario: Admin hub shows Permisos de Reportes card

- **GIVEN** an authenticated administrator opens `/dashboard/admin`
- **WHEN** the module grid renders
- **THEN** a card for **Permisos de Reportes** (or **Permisos por Reporte**) SHALL be present
- **AND** activating it SHALL navigate to the report-permissions admin page

#### Scenario: Module is admin-only

- **GIVEN** a user without administración permission
- **WHEN** they attempt to open `/dashboard/admin/report-permissions`
- **THEN** access SHALL be denied

### Requirement: Lead Deletion in Admin Destructive Action Surface

The system MUST restrict Lead deletion (`DELETE /api/leads/[id]`) to users with role `ADMIN` via `requireRole([UserRole.ADMIN])`. Non-admin roles MUST be rejected before any eligibility or lead-lookup logic runs.

#### Scenario: Non-admin is forbidden from deleting a lead

- GIVEN an authenticated user without the `ADMIN` role
- WHEN `DELETE /api/leads/[id]` is called
- THEN the system SHALL return HTTP 403
- AND no lead lookup or soft-delete SHALL occur

#### Scenario: Admin passes the role gate

- GIVEN an authenticated user with the `ADMIN` role
- WHEN `DELETE /api/leads/[id]` is called
- THEN the request SHALL proceed to lead lookup and eligibility evaluation
