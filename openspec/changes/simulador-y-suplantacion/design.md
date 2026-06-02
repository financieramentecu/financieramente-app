# Technical Design: Simulador y Suplantación

## Architecture & Approach

### 1. Sistema de Suplantación (Impersonation)
**Core Auth Update**:
Se modifica el callback `jwt` en `src/lib/auth/config.ts`. Si se despacha el evento `update` con `impersonateUserId`, el JWT guarda el `userId` original como `originalUserId` y `originalRole`, e intercambia el `id`, `name`, `email` y `role` por los del usuario objetivo (obtenidos directamente desde la base de datos). Para detener la suplantación (`STOP`), se restauran los datos originales guardados en el token.

**Security**:
- Solo usuarios cuyo rol base es `ADMIN` pueden iniciar la suplantación.
- No se permite suplantar a otro perfil con rol `ADMIN` (bloqueado tanto en UI como en backend).

**UI Components**:
- `ImpersonationBanner`: Se inyecta en `DashboardLayout.tsx` dentro de `SidebarInset`. Muestra una barra naranja de advertencia con la sesión actual y un botón de "Volver a mi sesión Admin".
- `HeaderImpersonationSelect`: Se agrega en `SiteHeader`. Implementa un patrón Combobox (Popover + Command) que busca usuarios activos (omitendo otros Admins) consumiendo `/api/users/search?status=true&forImpersonation=true&limit=100`.

### 2. Mejoras de la Calculadora (Simulador)
**UI y Copy**:
- Se renombran los títulos de la página y breadcrumbs a "Calculadora".
- Se ajustan los `Input` del form (`montoVenta`, `descuento`, `clawback`) con la moneda obtenida de la base de datos para la compañía seleccionada (e.g. "USD").
- El disclaimer sobre las fórmulas se actualiza.

**Lógica de Niveles (`idLevelView` y `idLevelOrigin`)**:
- Se pasa el `userLevelId` del usuario autenticado (desde el Servidor en `page.tsx`) hacia `SimuladorClient` y `SimuladorForm`.
- Para `AGENTE`/`Money Strategy`, el select "Tu Nivel" se autocompleta con su propio nivel.
- La lógica `sellLevels` usa la estructura jerárquica de `levels` para permitir solo que el usuario vea su nivel y los niveles subyacentes, a menos que sea `ADMIN`, que tiene acceso transversal.
