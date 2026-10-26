---
'financieramente-app': minor
---

### Agregado

- **Perfil Partner:** Los administradores pueden crear, editar, desactivar y reactivar partners desde Administración → Partners. El partner recibe un correo de activación para crear su contraseña y el administrador puede reenviar el enlace cuando haga falta.
- **Acceso acotado para Partner:** El partner solo ve Dashboard y Mis negocios, y solo accede a sus propios negocios.
- **¿Olvidaste tu contraseña?:** Los usuarios con correo y contraseña pueden restablecerla desde un enlace enviado a su correo.
- **Bloque "Partners" en el heatmap:** Los líderes ven la producción de los partners de su equipo en un bloque propio del heatmap del dashboard.

### Mejorado

- **Inicio de sesión:** El formulario de correo y contraseña ahora está siempre visible en el login.
- **Pre-liquidación:** Los negocios de partners se excluyen de la distribución de comisiones; los archivos que solo contienen negocios de partners también se pueden pre-liquidar.
- **Accesos por negocio centralizados:** Los agentes ya no pueden ver ni modificar comentarios, soportes ni pagos de negocios fuera de su alcance (propios y de sus subordinados).
- **Cierre de sesión al desactivar:** Al desactivar un usuario, su sesión se cierra en la siguiente petición.
- **Consultor:** Ahora puede abrir el detalle de cualquier negocio en modo solo lectura, igual que en la lista; la página de edición no está disponible para este rol.
- **Usuarios sin rol válido:** Los usuarios con rol DEFAULT o desconocido ahora reciben "Sin permisos" (403) en las rutas de negocios y en las acciones de la calculadora.
- **Protección del inicio de sesión:** El ingreso con correo y contraseña limita los intentos repetidos y muestra "Demasiados intentos. Intenta de nuevo más tarde.".

### Corregido

- **Acciones sin sesión:** Algunas acciones del servidor no exigían una sesión activa; ahora la exigen.
- **Eliminar soporte:** Se corrigió el botón de eliminar soporte en el detalle del negocio.
- **Redirección tras el login:** El parámetro `callbackUrl` solo acepta rutas internas de la plataforma.
- **Límite de intentos:** La dirección IP usada para limitar intentos y para la auditoría ya no puede ser alterada por el cliente.

### Técnico

- Migration `20261010150000_partner_profile`: adds `User.activatedAt` (backfilled for existing users) and the `account_token` table (`AccountToken`, types `ACTIVATION` and `RESET`, SHA-256 token hash only).
- New role `PARTNER`, level `PARTNER_EXTERNAL` and category "Partner Externo"; idempotent seed with `npm run prisma:seed:partner` (coverage gate and `CODE_TOO_LONG` check).
- Edge allowlist `src/lib/auth/partner-allowlist.ts` and the `/api` middleware matcher: a PARTNER session is limited to allowlisted pages and endpoints.
- Per-request session revalidation (`session-revalidation`, `session-user.service`): inactive users end their session on the next request (fail-open on DB errors).
- New `business-access.service` centralizes business visibility and ownership for comments, supports, payments, annual payments and mark-novedad; server actions guarded with `requireActionPermission`.
- `SettlementCommission` status `EXCLUDED` for partner businesses in the load-file processors and the pre-liquidation flow.
- Visibility is one rule (`resolveVisibleUserIds`, reused by `resolveBusinessScope`): unknown, DEFAULT and missing roles resolve to an empty scope (fail closed); `business-access.service` returns domain reasons (`FORBIDDEN` / `NOT_FOUND`) mapped to HTTP by `business-access-http`.
- New `AuditAction` values: `SETTLEMENT_EXCLUDED` and `FILE_IMPORT_EXCLUDED_ONLY_CLOSED` (one aggregated event per file/batch), plus `PARTNER_CREATED`, `PARTNER_UPDATED`, `PARTNER_DEACTIVATED`, `PARTNER_REACTIVATED`, `PARTNER_ACTIVATION_RESENT`, `ACCOUNT_ACTIVATED`, `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED`.
- New routes: `/api/admin/partners` (+ `[id]`, `deactivate`, `reactivate`, `resend-activation`, `leaders`, `leader-levels`), `/api/account/{activate,reset-password,forgot-password}`; new pages `/activate-account`, `/forgot-password`, `/reset-password`, `/dashboard/admin/partners`.
- Production dashboard routes pin PARTNER sessions to their own user id (`scopeUserIdsToSession`); heatmap view model gains `partnerRows`.
- Middleware: `/api/*` uses a decode-only session read (`edge-session-token`, `getToken`) that never re-issues the session cookie; `/dashboard/*` keeps the `auth()` wrapper.
- `auth()` is request-memoized with `React.cache` (`memoized-auth`); trusted client IP comes from `x-real-ip`, else the last `x-forwarded-for` hop (`trusted-client-ip`), used by rate limiters and audit logs.
- Credentials login is rate limited per email hash and per IP (`credentials-rate-limiter`, error code `rate_limited`); the in-process limiter evicts expired keys and caps its size.
- Activation and reset links are validated on the server (`account-link-preview.service`); the token preview `GET` endpoints were removed and the token is stripped from the address bar after load.
