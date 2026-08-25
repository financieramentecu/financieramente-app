# Changelog

Todos los cambios notables del proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [1.32.1] - 2026-08-21

### Corregido

- **Variables de entorno vacías en producción (SendGrid y contraseña de super admin):** `docker-compose.prod.yml` referenciaba `${SENDGRID_API_KEY_PROD}`, `${SENDGRID_FROM_EMAIL_PROD}`, `${SENDGRID_FROM_NAME_PROD}`, `${SENDGRID_TEMPLATE_ID_PROD}` y `${SUPER_ADMIN_PASSWORD_PROD}`, pero el `.env` generado por el workflow de despliegue escribe esas variables sin el sufijo `_PROD` (el sufijo solo existe en el nombre del secret de GitHub Actions). Docker Compose las dejaba en blanco silenciosamente dentro del contenedor.

### Técnico

- `docker/docker-compose.prod.yml`: se quitó el sufijo `_PROD` de las 5 variables del servicio `nextjs` para que coincidan con las claves escritas en `.env` por `.github/workflows/deploy-prod.yml`.

## [1.32.0] - 2026-08-13

### Agregado

- **Filtro "Novedades" en Filtros avanzados de negocios:** Los usuarios pueden filtrar el listado por estado de novedad (Nueva, Sometido o Devolución, Declinado, Pendiente, Cancelado) o por "Sin novedad", solo o en combinación con Fecha, Money Strategist, Estado, Compañía y el resto de criterios existentes. Sin selección = Todos (sin criterio de novedad).

### Técnico

- Query/body param `novedadStatuses` shared across GET `/api/negocios`, GET `/api/negocios/stats`, and POST `/api/negocios/export`.
- Sentinel `SIN_NOVEDAD` maps to `Business.novedadStatus IS NULL`; multiple selected values OR together and AND with other advanced filters.
- UI: `AdvancedFiltersSheet` MultiSelect "Novedades"; URL param wiring in `negocios-page-client`; active-filter badge via `countActiveDimensions`.
- Domain constants: `NOVEDAD_FILTER_SIN_NOVEDAD`, `NOVEDAD_FILTER_VALUES`, `NovedadFilterValue` in `business-entity.types.ts`.
- OpenSpec change `negocios-filtro-novedades` archived; delta synced to `openspec/specs/negocios/spec.md`.
- Unit tests: build-business-list-where, schemas, filter-flow, list-export parity, AdvancedFiltersSheet.

## [1.31.1] - 2026-08-12

### Corregido

- **Suspensión de Flagsmith por consumo excesivo de la capa gratuita:** El chequeo de feature flags en el servidor hacía una petición HTTP real a la API de Flagsmith en cada carga de página (sin evaluación local ni caché, y duplicado entre el layout raíz y cada página), agotando la cuota gratuita mensual y provocando la suspensión del servicio. Ahora el SDK evalúa los flags localmente en memoria, refrescando el documento de entorno cada 5 minutos en lugar de en cada request.

### Técnico

- `flagsmith-server.ts`: `enableLocalEvaluation: true` + `environmentRefreshIntervalSeconds: 300` en la instancia de `flagsmith-nodejs`, reduciendo el consumo de ~43,200 a ~14,400 requests/mes por instancia activa.
- Sin `FLAGSMITH_SERVER_KEY` configurada (uso previsto en QA) todos los flags quedan habilitados para pruebas y no se realiza ninguna petición a Flagsmith, sin afectar el fallback conservador existente para errores reales de la API en producción.
- Nuevos flags `leads_module` y `reportes_produccion_real`, gateando `/dashboard/leads` y `/dashboard/reportes/produccion-real` con el mismo patrón que `production_dashboard` (redirect si están deshabilitados).

## [1.31.0] - 2026-08-06

### Agregado

- **Gestión manual del estado de novedad con cinco estados:** Los usuarios ahora pueden registrar el estado real de una novedad (Nueva, Sometido a Devolución, Declinado, Pendiente, Cancelado) sin depender de cambios automáticos. Los analistas de soporte y administradores pueden usar la nueva opción "Gestionar novedad" en el detalle y el menú (⋮) de la tabla para cambiar el estado en cualquier momento. El estado de novedad ya no se resuelve automáticamente cuando el negocio transiciona a Emitido.

- **Endpoint PATCH `/api/negocios/[id]/manage-novedad` para privilegiados:** Restringido a roles `ANALISTA_SOPORTE` y `ADMIN`. Permite transiciones libres (sin estado terminal) entre los cuatro estados manuales. Rechaza intentos de establecer `NUEVA` como destino (esta se asigna solo automáticamente al marcar).

- **Desmarque de novedad con precondiciones de propiedad:** El desmarque de una novedad (`NUEVA`) ahora solo es permitido para el agente titular del negocio, preservando todos los timestamps de novedad (no se limpian). Otros roles pueden usar "Gestionar novedad" → `CANCELADA` para lograr cambios similares sin restricción de propiedad.

### Mejorado

- **Validación de soporte previo a fondeo:** Ambos endpoints de fondeo (`/fondear`, `/fondear-aportes`) ahora rechazan el fondeo cuando `supportCount === 0`, bloqueando antes de cualquier mutación de estado. El mensaje UI es "No se puede fondear sin soportes adjuntos". La edición de `dateAnchored` en un negocio ya fondeado no está sujeta a este guard (el guard aplica solo a acciones de fondeo).

### Corregido

- **Bypass de rol en desmarque de novedad:** Se corrigió un bug donde el desmarque de novedad permitía a `ADMIN` y `ASISTENTE_GERENCIA_OPERATIVA` desmarcar novedades de otros usuarios sin verificar propiedad. Ahora requiere ser el agente titular.

- **Mensaje de error "novedad pendiente" desactualizado:** Se corrigió el mensaje de error en MARK que seguía refiriéndose a "novedad pendiente" en lugar de "novedad nueva".

- **Opción "Gestionar Novedad" en menú (⋮) de tabla:** Se agregó "Gestionar novedad" al menú desplegable de acciones fila en la tabla de negocios, permitiendo acceso rápido sin entrar al detalle.

- **Race condition en cargas de lista de negocios:** Se corrigió un bug donde respuestas HTTP fuera de orden podían sobrescribir resultados más nuevos con datos obsoletos. Se agregó un guard `latestRequestId` en `useBusinesses`.

- **Sidebar en blanco durante carga inicial de sesión:** Se corrigió un problema de UX donde la barra lateral se mostraba vacía mientras se cargaba la sesión. Ahora muestra un skeleton de carga.

- **Menú acordeón del sidebar colapsándose en navegación:** Se corrigió un bug donde el menú acordeón del sidebar se colapsaba al navegar entre secciones. Ahora mantiene los elementos abiertos usando un merge de estado en lugar de sobrescribir.

- **Panel de jerarquía en blanco para usuarios sin árbol:** Se corrigió un bug en el Dashboard de Producción donde el panel de jerarquía reservaba espacio en blanco para usuarios sin árbol jerárquico. Ahora se colapsa completamente cuando está vacío.

- **Usuarios Junior excluidos de propios nodos raíz:** Se corrigió un bug en `buildHierarchyTree` donde usuarios de nivel Junior (sin `beneficiaryMode` OVERRIDE) fueron excluidos de sus propios nodos raíz. Ahora se incluyen.

- **KPIs y Heatmap sin fallback "MS Junior path":** Se corrigió un bug donde los hooks `useProductionKpis` y `useHeatmapTable` no implementaban el patrón de fallback "MS Junior" existente (retornar al `session.user.id` cuando no hay jerarquía). Ahora replican el patrón correctamente.

### Técnico

- **Ampliación de modelo Business:** El campo `novedadStatus` se amplió de dos estados (`PENDIENTE`, `RESUELTA`) a cinco: `NUEVA`, `SOMETIDA_DEVOLUCION`, `DECLINADA`, `PENDIENTE`, `CANCELADA`. Ningún cambio de schema Prisma (sigue siendo `VARCHAR(20)`).

- **Nuevos archivos:**
  - `src/features/negocios/services/business-novedad.service.ts` — Servicio Prisma para consultas y actualizaciones de novedad.
  - `src/app/api/negocios/[id]/manage-novedad/route.ts` — Endpoint PATCH con role gate y auditoría.
  - `src/features/negocios/components/modals/BusinessNovedadManageModal.tsx` — Modal de gestión de novedad.
  - `src/features/negocios/hooks/use-manage-novedad.ts` — Hook AsyncState para el endpoint.
  - `prisma/seeds/backfill-novedad-status.ts` — Backfill idempotente de `PENDIENTE`/`RESUELTA` → `NUEVA`.

- **Archivos modificados:**
  - `src/features/negocios/types/business-entity.types.ts` — 5-state const + `MANUAL_NOVEDAD_STATUSES` (4 valores).
  - `src/app/api/negocios/[id]/route.ts` — Rama de auto-resolución deletreada de `becomesEmitido` (CA2).
  - `src/app/api/negocios/[id]/mark-novedad/route.ts` — MARK sets `NUEVA`; UNMARK requiere `NUEVA` + propiedad.
  - `src/features/negocios/components/ui/BusinessNovedadBadge.tsx` — 5-state palette con iconos (AlertCircle, Undo2, Clock, XCircle, Ban).
  - `src/features/negocios/components/ui/NovedadActionButton.tsx` — Gates actualizadas a semántica `NUEVA`.
  - `src/features/negocios/components/ui/BusinessRowActions.tsx` — Nueva opción "Gestionar novedad" inline.
  - `src/app/dashboard/negocios/[id]/page.tsx`, `components/modals/BusinessViewModal.tsx` — "Gestionar novedad" trigger wiring.
  - `src/features/auth/lib/audit-logger.ts` — Nueva acción `BUSINESS_NOVEDAD_STATUS_CHANGED`.
  - `prisma/ERD.md` — Documentación de 5-state field.
  - `openspec/specs/negocios/spec.md` — Delta spec fusionada (11 ADDED/MODIFIED requirements).

- **Nueva acción de auditoría:** `BUSINESS_NOVEDAD_STATUS_CHANGED` — registra transiciones manuales de estado con from→to detail.

- **Tests:** 393 archivos de prueba, 3423 tests, 0 fallos. Type check limpio (`npx tsc --noEmit`). Test suite completa validada post-fix de P.4.

- **Scripts de soporte:**
  - `prisma/seeds/backfill-novedad-status.ts --dry-run|--apply` — Migra datos heredados pre-release.
  - `scripts/remediate-unsupported-funded-businesses.js --dry-run|--apply` — Remediación de negocios fondeados sin soportes.

## [1.30.0] - 2026-08-05

### Agregado

- **Permisos de Reportes por categoría (COM-80):** Nueva sección en Administración para configurar qué categorías de usuario pueden ver cada reporte del catálogo. Incluye selección de reporte, checkboxes por categoría, control **Todas**, validación al guardar (mínimo una categoría) y confirmación en toast.
- **Menú Reportes dinámico:** El grupo **Reportes** y sus sub-ítems se muestran según los permisos de reporte de la categoría del usuario autenticado (códigos estables), no solo por flags estáticos de rol. Bypass de administrador preservado.
- **Reporte Producción Real (COM-81):** Nuevo reporte en `/dashboard/reportes/produccion-real` con filtros (fecha de creación con mes actual por defecto en Bogotá, tipo de aporte, compañía incluyendo SKANDIA, modos de moneda), árbol jerárquico reutilizable, cuatro KPIs (Producción Real, Regular, Único, Fondeado con % de conversión), barras Regular vs Única, tabla de detalle con scroll continuo y exportación Excel de tres hojas (Resumen KPI, Regular vs Única, Detalle).
- **Reglas de negocio del reporte:** Exclusión global MFUND (SKANDIA + MFUND); KPI Único excluye 2ª+ Anualidad; moneda Todas convierte a USD con TRM automática; modos Peso Colombiano y Moneda Extranjera en montos nativos.
- **Seed por defecto:** Categoría **Performance Leader** habilitada para el código `PRODUCCION_REAL` tras migrar/sembrar.

### Técnico

- **Prisma models:** `ReportDefinition` (`code`, `name`, `description`, `routePath`, soft-delete `status`) and `CategoryReportPermission` (unique per report+category, soft-delete `status`); tables `report_definition` / `category_report_permission`.
- **Migration:** `20260805150000_add_report_permissions` — additive schema; apply with `prisma migrate deploy` when DB is available, then run seed (`prisma/seeds/report-permissions.ts`).
- **Features:** `src/features/report-permissions/` (admin UI, hooks with `AsyncState`, Zod schemas, service-layer Prisma, soft-delete replace permissions) and `src/features/reports/produccion-real/` (filters, KPIs, hierarchy scope, currency conversion, detail mapper, Excel builder).
- **API routes (HTTP only → services):** `GET/PUT /api/report-permissions`, `GET /api/reports/me`, `GET /api/reports/produccion-real/kpis|detail|export`.
- **Navigation:** `menu-items.tsx` + `menu-builder.ts` gate **Reportes** / **Producción Real** and Administración **Permisos de Reportes** via authorized report codes.
- **Audit actions:** `REPORT_PERMISSION_UPDATED`, `REPORT_EXPORTED`.
- **ERD:** Updated `prisma/ERD.md` for new models and Category relations.
- **Tests:** Unit/integration coverage for permissions helpers, soft-delete replace, can-view-report, menu builder Reportes, Producción Real WHERE/KPI/currency/export helpers and routes.
## [1.29.1] - 2026-08-05

### Corregido

- **Conversión de lead a negocio sin bloques de documentación:** Se corrigió la puerta de campo `isBlocked` que bloqueaba todos los campos de contacto cuando se convertía un lead desde `/dashboard/negocios/crear?leadId=<id>`. Ahora, los campos (`email`, `name`, `lastNames`, `phone`, `clientOrigin`, `agent`) se desbloquean cuando un lead tiene `leadId`, independientemente de si el documento está completo. El formulario de creación manual (sin `leadId`) sigue bloqueando hasta 5+ caracteres de documento, sin cambios.

- **Resolución automática de cliente existente al convertir lead:** Al convertir un lead a negocio, el sistema ahora resuelve silenciosamente un cliente existente (por documento exacto, luego por email exacto) y lo reutiliza, evitando la creación de duplicados. Si el cliente encontrado por email tiene un documento diferente, se muestra una alerta de decisión en línea para que el usuario elija actualizar o mantener el documento existente. Si no hay coincidencia, el sistema crea un cliente nuevo como antes. La reactivación de clientes inactivos ocurre automáticamente cuando la conversión usa un documento exacto bajo un lead.

- **Indicador visual mejorado de lead convertido en el Kanban:** Se reemplazó el badge de texto "Negocio creado" con un ícono de estrella esmeralda + tooltip, ocupando menos espacio horizontal en las tarjetas del tablero. El indicador persiste independientemente del estado del negocio vinculado (incluso si se cancela).

- **Bloqueo de conversión para leads sin dueño asignado:** Se agregó un bloqueo en tres capas (UI, servicio y transacción) para evitar convertir leads que no tienen propietario (`idUser == null`). El botón de conversión está deshabilitado con una leyenda explicativa en la UI; la consulta de servicio excluye leads sin dueño; y la transacción falla si se intenta una conversión directa. Este bloqueo solo afecta a leads sin propietario; los administradores y roles bypass ven y pueden convertir leads normalmente.

- **Money Strategist fijado y bloqueado al propietario del lead:** Cuando se convierte un lead que tiene un propietario asignado, el campo `agent` (Money Strategist) del formulario se prefill con ese propietario y se bloquea para que no pueda cambiar, incluso para usuarios AGENTE que normalmente se autoasignan. Este comportamiento aplica solo en conversión de lead; la creación manual y la edición no se ven afectadas.

### Técnico

- **Nuevos archivos:**
  - `src/features/negocios/services/client-resolution.service.ts` — Resuelve clientes existentes por documento (activo), email (activo único), o reactivación de documento inactivo bajo contexto de lead.
  - `src/features/negocios/actions/resolve-existing-client.ts` — Server Action autenticado que expone la resolución con auditoría `CLIENT_REACTIVATED`.
  - `src/features/negocios/components/sections/client-identity-conflict-alert.tsx` — Alerta en línea para conflictos de documento en coincidencias de email, con acciones "Actualizar documento" (deshabilitada para roles no privilegiados) y "Mantener el existente".
  - `src/features/leads/mappers/lead-owner-to-agent-info.ts` — Mapea el propietario del lead a la forma `AgentInfo`.

- **Archivos modificados:**
  - `src/features/negocios/hooks/use-business-form.ts` — `isBlocked` y `isContractBlocked` centralizados (D3/D4); llamada a resolución (D2); estado y resumidor de `identityConflict` (D5).
  - `src/features/negocios/components/sections/client-info-section.tsx` — Consume prop `isBlocked`; renderiza `ClientIdentityConflictAlert`.
  - `src/features/negocios/components/sections/coach-info-section.tsx` — Consume prop `isAgentLocked`; deshabilita `AgentAutocomplete` cuando `isAgentLocked` es true.
  - `src/features/negocios/components/business-form.tsx` — Pasa `isBlocked`/`isContractBlocked` a hijos.
  - `src/features/negocios/components/business-wrapper.tsx` — Acepta/reenvía prop `businessAgent`.
  - `src/features/leads/services/lead-board.service.ts` — Selecciona `idBusiness` en la consulta de tablero.
  - `src/features/leads/types/lead.types.ts` — Agrega `idBusiness: number | null` a `LeadCard`.
  - `src/features/leads/components/lead-card.tsx` — Renderiza ícono de estrella con tooltip y bordes esmeralda cuando `idBusiness !== null`.
  - `src/features/leads/components/lead-detail-sheet.tsx` — Deshabilita botón "Convertir a negocio" con leyenda cuando `lead.idUser == null`.
  - `src/features/leads/services/lead-conversion.service.ts` — Agrega `idUser: { not: null }` a `getLeadForConversion`; `linkLeadToBusinessTx` lanza excepción si `idUser == null` (defensa en profundidad).
  - `src/features/leads/hooks/use-agent-permissions.ts` — Nueva opción `leadId` con `isLeadOwnerLocked`; bloquea autoasignación cuando hay propietario de lead.
  - `src/features/auth/lib/audit-logger.ts` — Agrega acción `CLIENT_REACTIVATED`.

- **Nueva acción de auditoría:** `CLIENT_REACTIVATED` — registra reactivación de clientes inactivos durante conversión de lead.

## [1.29.0] - 2026-08-05

### Agregado

- **Módulo Leads completo — Sincronización CRM + Kanban de funnel:** Los usuarios pueden ahora ingerir leads desde un CRM externo (vía webhook normalizado a través de n8n) y verlos en un tablero Kanban de solo lectura organizado por columnas configurables. El webhook es autenticado por API key (sin HMAC), rate limitado (~120 req/min) y upsert idempotente por `externalCrmId`. Incluye visibilidad por jerarquía (los leads sin dueño asignado solo son visibles para administradores).

- **Conversión manual de lead a Cliente + Negocio:** Desde el detalle de un lead, los usuarios pueden convertirlo manualmente en un Cliente y un Negocio, reutilizando el formulario de creación de negocios existente. La conversión requiere `identityNumber` en el momento de la conversión, guarda contra conversiones duplicadas con un único FK opcional `idBusiness` en `Lead`, y produce una entrada de auditoría completa.

- **Administración de columnas de funnel:** Los administradores pueden crear, renombrar, reordenar y eliminar (soft-delete) columnas del funnel de leads desde la sección Administración/Configuración. Cada columna mapea a un `externalStatusKey` único del CRM. Las columnas con leads activos no pueden eliminarse. La columna "Sin mapear" es fija y no eliminable, recibiendo cualquier `statusKey` no mapeado.

- **Estado de resultado (outcomeStatus) con bloqueo de WON terminal:** Los leads tienen un estado de resultado fijo (`OPEN`, `WON`, `LOST`, `ABANDONED`, por defecto `OPEN`). Una vez que un lead alcanza `WON`, ese estado se vuelve terminal: no puede ser cambiado por webhooks posteriores (aunque otros campos sí se actualizan). Los estados `LOST` y `ABANDONED` permanecen mutables. El estado aparece como un badge visual en las tarjetas del Kanban.

- **Filtros avanzados en el tablero de Leads:** El tablero Kanban ofrece filtros por resultado (chips multiseleccionables con OR) y rango de fechas de creación (por defecto, mes actual). Los filtros se combinan con AND y respetan la visibilidad por jerarquía del usuario.

- **Entrada de navegación Leads:** Se agregó un elemento de menú top-level "Leads" que navega al tablero Kanban, visible para todos los roles (incluyendo AGENTE). Se agregó también una sub-entrada bajo Administración para la gestión de columnas del funnel.

- **Bugfix app-wide — DateRangePicker ahora muestra rangos seleccionados:** Se corrigió un bug preexistente en el que el `DateRangePicker` (y todo picker de rangos de fechas en la app) nunca resaltaba el rango seleccionado. La raíz es que `src/app/tailwind.css` importa Tailwind v4 sin la directiva `@config`, impidiendo que las clases de colores personalizados se generen. Se agregaron reglas explícitas en `globals.css` para `[data-slot='calendar']` que seleccionan el rango. Este fix beneficia a todos los pickers de rango en la aplicación. (La solución completa de `@config` se deja fuera de alcance como una mejora futura).

### Mejorado

- **Drag & drop accesible en el panel admin de columnas:** Se reemplazaron los botones ↑/↓ con una solución de arrastrar y soltar usando `@dnd-kit` (primer uso de esta librería en el repo), que incluye soporte para teclado (KeyboardSensor) y es accesible.

- **Inmovilidad de clave de estado del CRM:** La clave `externalStatusKey` de una columna es inmutable después de su creación (enforced en el servicio, no solo en UI). Cambiarla haría que el webhook routing se quiebre. Si se necesita una clave diferente, se crea una nueva columna.

- **Soft-delete con tombstone para reutilización de claves:** Al eliminar una columna, su `externalStatusKey` se reescribe como `${key}__deleted_${id}` para liberar el valor único y permitir crear una nueva columna con la misma clave después.

### Corregido

- **Leads visibles para todos los roles:** Se corrigió un bug donde "Leads" fue agregado a `ALL_MENU_ITEMS` pero no tenía rama en el allow-list `buildMenuByRole()`, haciéndolo invisible. Se agregaron ramas condicionales en `menu-builder.ts` y explícitas en `AGENTE_MENU_ITEMS`.

### Técnico

- **Modelos Prisma nuevos:** `Lead` (nullable unique `externalCrmId`, nullable FK a `User`, FK a `LeadFunnelColumn`, unique FK opcional a `Business`, soft delete `active`) y `LeadFunnelColumn` (`name`, unique `externalStatusKey`, `position`, `isFallback` para la columna "Sin mapear", soft delete `active`).

- **Migraciones Prisma:** `20260803190000_add_leads_module` (modelos, índices, FKs) y `20260804000000_add_lead_outcome_status` (enum `LeadOutcomeStatus` con valores OPEN/WON/LOST/ABANDONED). Nota: ambas generadas y validadas, pero no aplicadas a la DB compartida de dev (Neon) debido a un drift preexistente no relacionado en columnas `novedad_*`; el propietario debe ejecutar `prisma migrate resolve --applied` antes del deploy.

- **Endpoints nuevos:**
  - `POST /api/leads/crm-sync` — webhook de ingesta, autenticado por `x-api-key` (timingSafeEqual sobre SHA-256), rate limit en memoria, upsert idempotente, fallback para `statusKey`/`outcomeStatus` no mapeados, resolución de dueño sin "sticky owner", auditoría completa.
  - `GET /api/leads` — devuelve tablero (leads agrupados por columna server-side, visibilidad por jerarquía, filtros por outcome + fecha).
  - `GET /api/leads/[id]` — detalle del lead (scope jerárquico).
  - `GET/POST /api/leads/funnel-columns` — CRUD de columnas (admin).
  - `PATCH/DELETE /api/leads/funnel-columns/[id]` — actualizar/eliminar columna (admin).

- **Nuevas acciones de auditoría:** `LEAD_CREATED`, `LEAD_STATUS_CHANGED`, `LEAD_OWNER_ASSIGNED`, `LEAD_OWNER_UNRESOLVED`, `LEAD_OUTCOME_STATUS_LOCKED`, `LEAD_CONVERTED_TO_BUSINESS`, `LEAD_FUNNEL_COLUMN_CREATED`, `LEAD_FUNNEL_COLUMN_UPDATED`.

- **Función pura `resolveOutcomeStatus(raw, current)`:** Mapea valores entrantes (case-insensitive) a enum interno, maneja valores no reconocidos (fallback a OPEN + audit), y aplica lógica de bloqueo terminal cuando `current === 'WON'` (retorna `{value, unresolved, locked}`).

- **Normalización de claves de estado:** Nueva `normalizeFunnelStatusKey()` (uppercase + espacios→guiones bajos) aplicada en create/update de columnas y en matching del webhook, permitiendo admins escribir `lead nuevo` que el CRM envía como `LEAD_NUEVO` sin desincronización.

- **Interfaz de mapeo:** `mapLeadToBusinessDefaults()` en `src/features/leads/mappers/` (now uses `Pick<LeadDetail, 'name'|'lastName'|'email'|'phone'|'identityNumber'>` para evitar requerir campos derivados como `ownerName`).

- **Actualización ERD.md:** Nuevos modelos `Lead` y `LeadFunnelColumn`, relaciones a `User`/`Business`, índices, notas sobre claves tombstoned y la columna isFallback.

- **Tests:** 40 archivos, 285 tests (lib puro, services, routes, componentes, integración full-flow). Type check limpio (`npx tsc --noEmit`), lint limpio.

- **Documentación:** `docs/LEADS_WEBHOOK_INTEGRATION_GUIDE.md` (guía para configurar n8n), `docs/LEADS_CRM_SYNC_TESTING_GUIDE.md` (curls de prueba del webhook incl. bloqueo WON y rate limit), `docs/ENVIRONMENT_VARIABLES.md` (documentación de `LEADS_CRM_SYNC_API_KEY`).

- **Seed:** `prisma/seeds/lead-funnel-columns.ts` — upsert idempotente de las 22 columnas reales del funnel de negocio + columna "Sin mapear" (isFallback).

## [1.28.0] - 2026-08-04

### Agregado

- **Filtro "Soporte" en el Dashboard de producción (COM-79):** En el panel "Filtros del reporte" se puede segmentar por negocios con o sin comprobantes cargados (`Todos` / `Con` / `Sin`). El valor por defecto es `Todos`.
- **Reactividad de widgets al filtro de soporte:** Al aplicar el filtro, se recalculan VENTA TOTAL (FX, local y total USD), las donas de origen/compañía/estado, las barras de producción por Money Strategist y el heatmap por empresa (USD y NEG), con intersección AND respecto al resto de filtros y a la jerarquía seleccionada.
- **Consistencia heatmap ↔ listado:** El acordeón de la celda del heatmap reenvía el mismo criterio de soporte al listado de negocios, evitando desalineación entre el agregado y el detalle.

### Técnico

- Extensión del contrato `DashboardFilterDraft` / `DashboardAppliedFilters` con `hasSupports?: boolean` (`undefined` = Todos; `true` = Con; `false` = Sin), acción `SET_HAS_SUPPORTS`, badges activos y igualdad draft/applied.
- Predicado compartido en `buildProductionWhereClause`: `supports.some/none` solo con `status: true` (misma semántica soft-delete que el listado de negocios).
- Helper `parseDashboardAppliedFilters` reutilizado por las rutas `kpis`, `by-origin`, `by-company`, `by-status`, `ms-chart` y `heatmap`; serialización del query param en los 6 hooks de agregación.
- Forward de `hasSupports` en `toBusinessListQueryParams` para el bridge heatmap → `/api/negocios`.
- Cobertura unitaria de WHERE, reducer/badges, parser de query params y bridge del heatmap.
- OpenSpec change `dashboard-filtro-soporte` (proposal, design, specs, tasks).

## [1.27.0] - 2026-08-03

### Agregado

- **URLs clickeables en comentarios (COM-82):** Al visualizar comentarios, las direcciones que empiezan con `http://`, `https://` o `www.` se muestran como hipervínculos (estilo diferenciado) y se abren en una nueva pestaña con `noopener noreferrer`. El resto del texto del comentario se mantiene como texto plano, incluso cuando hay varias URLs en el mismo mensaje.

## [1.26.3] - 2026-08-03

### Agregado

- **Carga de comprobantes desde Venta Efectuada (COM-76):** Money Strategists y Analistas de Soporte pueden subir comprobantes desde el estado "Venta Efectuada", sin esperar a que el negocio esté en "Emitido" ni a que exista número de contrato. La acción "Subir comprobante" en la columna Acciones queda habilitada también en esa etapa temprana, y al completar la carga se muestra un mensaje de éxito.

## [1.26.2] - 2026-07-30

### Agregado

- **Money Strategist puede eliminar sus comprobantes (COM-75):** El rol Money Strategist (Agente) ahora puede eliminar comprobantes de los negocios que gestiona directamente, sin depender de un Analista de Soporte u otro rol operativo.
- **Confirmación antes de eliminar:** Al eliminar un comprobante se muestra un diálogo de confirmación explicando que la acción no se puede deshacer, evitando borrados accidentales.

### Mejorado

- **Feedback de error al eliminar:** Si la eliminación falla, se muestra una notificación (toast) con un mensaje claro en lugar de fallar en silencio.

### Corregido

- **Alcance de permisos en la API:** La eliminación de comprobantes valida en el backend que el comprobante pertenezca al negocio indicado y, para Money Strategist, que el negocio esté dentro de su jerarquía visible; de lo contrario responde 403.

### Técnico

- `canDeleteBusinessComprobante()` en `src/features/auth/lib/roles.ts` centraliza la validación de rol (ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE, AGENTE), usada tanto en la UI como en la API.
- `deactivateComprobante()` (`business-supports.service.ts`) acepta un parámetro `auth` opcional (`businessId`, `visibleUserIds`) para forzar pertenencia al negocio y, cuando aplica, la jerarquía visible del usuario vía `resolveVisibleUserIds`.
- Nuevo código de error `FORBIDDEN` en `ComprobanteErrorCode`, mapeado a HTTP 403 en la ruta `DELETE /api/negocios/[id]/comprobantes/[supportId]`.
- `ViewComprobantesSheet` reemplaza el borrado directo por un flujo de confirmación (`AlertDialog`) con estado `pendingDeleteId`/`isConfirming` y notificación de error vía `sonner`.

## [1.26.1] - 2026-08-03

### Agregado

- **KPIs del Resumen filtrados (COM-73):** Al aplicar filtros avanzados en Negocios (fechas, Money Strategist, estado, categoría, soportes, compañía, producto, origen, plazo, periodicidad), las tarjetas de Resumen (Ventas Efectuadas, Emitidos y Fondeados) se recalculan automáticamente con el mismo criterio que la tabla, incluyendo montos en moneda local y extranjera y el indicador de soportes pendientes en Emitidos.

### Mejorado

- **Paridad lista ↔ Resumen:** Los KPIs usan la misma semántica de filtros que el listado (`dateFrom`/`dateTo` = fondeo, `createdFrom`/`createdTo` = creación, etc.). Al limpiar filtros, el Resumen vuelve al consolidado global (según el alcance del rol).

### Corregido

- **Resultados sin coincidencias en KPIs:** Si los filtros no arrojan negocios, las tarjetas muestran `0` en conteos y montos (sin `null`/`NaN` ni errores visuales).
- **Hydration en filtros avanzados:** Se corrigió el warning de HTML inválido (`button` anidado) en el selector múltiple del panel de filtros avanzados.

## [1.26.0] - 2026-07-31

### Agregado

- **Marcador de "Novedad" para negocios en VENTA_EFECTUADA:** Los gestores de negocios ahora pueden marcar con "Con Novedad" los negocios que están bloqueados esperando información o correcciones (datos faltantes, contrato pendiente, etc.). El flag se resuelve automáticamente cuando el negocio pasa a estado EMITIDO, manteniendo un historial de auditoría completo.

- **Columna de Novedad en tabla de negocios:** La tabla principal de negocios incluye una nueva columna "Novedad" inmediatamente después de "Estado", mostrando el estado del marcador (vacío cuando no hay novedad, "Pendiente" en naranja, "Resuelta" en verde).

- **Acciones de Novedad en fila de negocios:** El menú desplegable de acciones permite "Marcar Con Novedad" (visible solo en VENTA_EFECTUADA sin novedad pendiente) y "Desmarcar Novedad" (visible solo si hay novedad pendiente), disponible para todos los roles autenticados sin restricción de permisos.

- **Auto-resolución de Novedad:** Cuando un negocio con novedad pendiente transiciona a EMITIDO (por cualquier motivo), el sistema automáticamente resuelve el flag y registra la resolución en el audit log.

- **Persistencia de novedad en cancelación:** Si un negocio con novedad pendiente es cancelado, el flag se mantiene para auditoría y referencia.

- **Display en vista de detalle:** La vista de detalle del negocio (modal y página de dashboard) muestra el estado de novedad con la misma semántica de colores que la tabla.

- **Auditoría completa:** Nuevas acciones de audit log: `BUSINESS_NOVEDAD_MARKED`, `BUSINESS_NOVEDAD_UNMARKED`, `BUSINESS_NOVEDAD_RESOLVED` con registro de usuario, IP, user agent y detalles.

- **Excel export:** La columna de Novedad se incluye automáticamente en las exportaciones de negocios con los mismos valores (vacío/"Pendiente"/"Resuelta").

### Técnico

- **Campos de datos:** Tres nuevos campos nullable en `Business`: `novedadStatus` (PENDIENTE | RESUELTA), `novedadMarkedAt`, `novedadResolvedAt`.

- **API endpoint:** Nuevo `PATCH /api/negocios/[id]/mark-novedad` con soporte dual para acciones MARK/UNMARK, validación de precondiciones (409 Conflict), y respuestas `ApiResponse<BusinessEntity>`.

- **Auto-resolución transaccional:** La resolución automática ocurre dentro de la transacción existente de `PUT /api/negocios/[id]` sin redondas adicionales.

- **Hook de estado:** Nueva `useMarkNovedad` que retorna `AsyncState<BusinessEntity>` siguiendo patrones de proyecto.

- **Componentes:** `BusinessNovedadBadge` con patrón STATUS_CONFIG, integrado en `BusinessRowActions`, `BusinessTableSection`, `BusinessViewModal`, y página de detalle.

- **Migración Prisma:** Migración generada (pendiente aplicación a DB antes de deploy).

## [1.25.0] - 2026-07-30

### Agregado

- **Edición de datos básicos del cliente desde el negocio:** Administrador y Asistente Operativo de Gerencia ahora pueden editar documento, correo, nombres, teléfono y origen del cliente directamente desde la edición del negocio, con validación, control de permisos por rol y registro en el log de auditoría.

- **Acordeón de negocios por celda en el heatmap:** En el panel "Producción por empresa (heatmap)", cada celda asesor-empresa ahora se puede expandir con un ícono dedicado para ver el listado de negocios detrás de esa cifra, agrupados por empresa. Cada negocio muestra producto, número de contrato, valor (USD/COP), y estado, con un enlace "Ir a negocio" que abre el detalle en una pestaña nueva sin perder el contexto del análisis.

- **Expansión múltiple y persistente:** Varias celdas pueden quedar expandidas al mismo tiempo. Si se aplica un filtro del dashboard mientras una celda está expandida, esta permanece abierta y solo se refresca su contenido; un recargado completo de la página sí reinicia el estado de expansión.

### Corregido

- **Heatmap del dashboard no cargaba datos en el primer render:** El heatmap permanecía vacío al cargar la página por primera vez y solo mostraba datos al cambiar un filtro. El problema era que la tasa TRM (necesaria para la conversión) carga de forma asíncrona y el efecto de carga de datos no se reactivaba al resolverse. Corregido.

- **Celdas expandidas del heatmap volvían a "Cargando…" sin motivo:** Al abrir una nueva celda del acordeón o al plegar/desplegar el menú lateral, las celdas ya expandidas se recargaban innecesariamente. Corregido memoizando el mapa de periodicidades usado por el acordeón.

- **Columna "Money Strategist" del heatmap con fondo transparente:** Al hacer scroll horizontal en la tabla del heatmap, el texto de otras columnas se superponía sobre la columna fija "Money Strategist". El fondo de la columna ahora es sólido y correctamente opaco tanto en modo claro como oscuro.

## [1.24.0] - 2026-07-10

### Agregado

- **Comentarios integrados en contratos:** Money Strategist y Analistas de Soporte ahora pueden agregar comentarios directamente en cada contrato. Los comentarios se visualizan en un hilo ordenado cronológicamente con estilos diferenciados según el rol (Money Strategist a la izquierda, Analista de Soporte a la derecha).

- **Dos puntos de entrada para agregar comentarios:** Abre el menú de acciones de un contrato y selecciona "Agregar comentario" para usar un modal, o accede al panel lateral de comentarios desde la vista de detalle del contrato.

- **Notificaciones bidireccionales en tiempo real:** Cuando un Money Strategist comenta, todos los Analistas de Soporte reciben notificación automáticamente. Cuando un Analista comenta, el Money Strategist asignado al contrato recibe notificación. Las notificaciones incluyen el nombre del autor, tiempo relativo, y número de contrato.

- **Panel de notificaciones mejorado:** Las notificaciones de comentarios aparecen en la campana con indicador visual de punto azul para no leídas. Al hacer clic en una notificación, el sistema navega al contrato y abre automáticamente el panel de comentarios en el comentario nuevo, marcándolo como leído.

- **Validación de caracteres en comentarios:** El nombre del comentario está limitado a 40 caracteres y el detalle a 200 caracteres, con contadores visuales que muestran el límite en tiempo real.

### Mejorado

- **Comunicación centralizada:** Toda la conversación sobre un contrato queda registrada en el sistema sin depender de canales externos (email, chat), mejorando la trazabilidad y la conformidad normativa.

- **Auditoría completa:** Todos los comentarios quedan registrados en el audit log del sistema, con identificación del usuario, timestamp y contenido.

### Técnico

- **Modelo de datos:** Nuevo modelo `Comment` con relaciones a `Business` (contrato) y `User` (autor). Incluye soft-delete (`status` boolean) siguiendo convención del proyecto.

- **Servicio de notificaciones extendido:** El sistema de notificaciones SSE existente ahora soporta eventos de `comment-added` para actualizaciones en tiempo real del hilo de comentarios.

- **API routes:** Nuevos endpoints `/api/negocios/[id]/comments` (GET para listar, POST para crear) con validación Zod y respuestas `ApiResponse<T>`.

## [1.23.0] - 2026-07-09

### Agregado

- **Edición de fecha de fondeo desde tabla de negocios:** Los operadores (ADMIN, Asistente Operativo de Gerencia, Analista de Soporte) ahora pueden editar la fecha de fondeo (`dateAnchored`) directamente desde la tabla de negocios, de manera similar a cómo editan la fecha de emisión. La edición automáticamente sincroniza la fecha del primer pago para mantener la consistencia.

- **Modal de fecha de fondeo para negocios sin aportes:** Los Administradores y Analistas de Soporte ahora pueden seleccionar la fecha real de fondeo cuando un negocio sin aportes (como MFUND de Skandia con modalidad única) es fondeado. El modal "Confirmar Fondeo" permite elegir la fecha exacta, mejorando la precisión del registro de operaciones.

- **Script de remediación de fondeos sin soporte:** Nueva herramienta administrativa para revertir negocios que fueron fondeados sin tener soportes adjuntos (error que podía ocurrir antes de implementar la validación). El script permite modo `--dry-run` para inspeccionar cambios antes de aplicarlos.

### Mejorado

- **Validación obligatoria de soportes antes de fondear:** Ahora es imposible fondear un negocio (en ambos flujos: fondeo directo y fondeo de aportes) si no tiene al menos un comprobante de pago adjunto. Si falta soporte, el sistema muestra un mensaje claro: "No se puede fondear sin soportes adjuntos", mejorando la conformidad normativa.

- **Sincronización transaccional de fechas de fondeo:** Cuando se edita la fecha de fondeo de un negocio, la fecha del primer pago se actualiza automáticamente en la misma transacción, garantizando consistencia incluso si hay fallos parciales.

- **Notificaciones genéricas mejoradas:** Las notificaciones ahora son completamente desacopladas de la entidad `Business` y soportan `callbackUrl` para redirección flexible, permitiendo su uso en cualquier flujo del sistema.

- **Refrescado automático de datos en tabla de negocios:** La tabla ahora refrescaba los datos de negocio en background, garantizando que los cambios realizados por otros operadores sean visibles sin necesidad de F5.

- **Botón "Limpiar Filtros" mejorado:** El botón ahora aplica cambios inmediatamente sin necesidad de hacer clic adicional.

### Corregido

- **Eliminación de código huérfano:** Se removió el endpoint `/fondear-anualidades` que estaba siendo reemplazado por `/fondear-aportes`. Esta limpieza reduce la deuda técnica sin impactar funcionalidad.

- **Error de conexión SSE en navegador:** Se corrigió problema que causaba error en almacenamiento de SSE cuando se ejecutaba en entornos browser (se añadió validación de `typeof process`).

- **Bucle infinito en hook `useBusinesses`:** Se corrigió problema en Storybook donde el hook entraba en bucle infinito por dependencias dinámicas.

- **Botón "Limpiar Filtros" se aplica al hacer clic:** Antes requería un paso adicional; ahora aplica inmediatamente.

- **Sidebar de notificaciones ahora flota correctamente:** Se corrigió desplazamiento visual y comportamiento del drawer de notificaciones.

- **Optimización de query N+1 en calculadora:** Se resolvió problema de performance donde la calculadora hacía múltiples queries innecesarias.

- **Error de Storybook con NextJS Router:** Se corrigió error `SB_FRAMEWORK_NEXTJS_0002` (NextjsRouterMocksNotAvailable) que impedía renderización en Chromatic.

## [1.22.13] - 2026-07-04

### Corregido

- **Error de enrutamiento en Storybook:** Se corrigió el error `SB_FRAMEWORK_NEXTJS_0002` (NextjsRouterMocksNotAvailable) que impedía la renderización correcta de los componentes con `next/navigation` en los tests visuales y estáticos de Chromatic. La solución elimina aliases redundantes en la configuración de webpack de Storybook.

## [1.22.12] - 2026-07-03

### Cambiado

- **Notificaciones genéricas:** Las notificaciones en la plataforma han sido desacopladas de la entidad `Business`, volviéndolas completamente genéricas. Ahora soportan un `callbackUrl` para redirección flexible y se pueden utilizar en cualquier flujo del sistema (no sólo para negocios). También se simplificó la interfaz del Drawer de notificaciones, eliminando los filtros condicionales acoplados a negocios.

### Corregido

- **Bucle infinito en Storybook:** Se corrigió un error que causaba que `useBusinesses` entrara en un bucle infinito de re-renderizados en entornos de prueba (como Chromatic) al recibir arreglos creados dinámicamente. La función ahora maneja sus dependencias de forma inmutable usando `JSON.stringify`.

## [1.22.11] - 2026-06-30

### Agregado

- **Fondeo manual del primer aporte con fecha personalizada:** Los operadores ahora pueden fondear manualmente el primer aporte de un negocio seleccionando una fecha específica. Esto proporciona mejor control sobre el calendario de liquidación de comisiones. El primer aporte es el único que permite fondeo manual; los aportes 2 en adelante se fondean automáticamente mediante el cron cuando llega su fecha programada.

- **Botón de Cartera en el primer aporte:** El primer aporte ahora muestra tanto el botón "Fondear" como el botón "Cartera" cuando la fecha esperada es en el mes actual o futuro, permitiendo marcar el pago como en cartera sin esperar a que el cron lo fondee automáticamente.

### Mejorado

- **Restricción inteligente de pagos durante emisión:** Cuando un negocio aún no ha sido fondeado (estado EMITIDO), únicamente el primer aporte puede ser modificado manualmente. Los aportes 2 en adelante aparecen desactivados visualmente, previniendo operaciones accidentales en pagos futuros antes de que el primer aporte sea procesado.

- **Sincronización en tiempo real de la interfaz:** Después de fondear el primer aporte, tanto el modal de fondeo como la lista principal de negocios se actualizan automáticamente, mostrando el cambio de estado del negocio (EMITIDO → FONDEADO) y la fecha de fondeo sin necesidad de refrescar la página.

- **Timeout ampliado para fondeo de aportes múltiples:** El timeout de la transacción de fondeo se aumentó de 5 a 15 segundos para acomodar la actualización de múltiples aportes y cálculo de fechas esperadas sin expiración, mejorando la confiabilidad del proceso.

### Corregido

- **Cálculo de bloqueo de pagos usa fecha de fondeo correcta:** La lógica de restricción ahora verifica correctamente `dateAnchored` (fecha real de fondeo del negocio) en lugar de `dateIssued` (fecha de emisión del contrato), asegurando que los pagos 2+ se desbloqueacen correctamente una vez que el negocio es fondeado.

## [1.22.10] - 2026-06-23

### Agregado

- **Exportar a Excel para roles con jerarquía (Nivel 2 a Nivel 6):** Los usuarios con jerarquía asignada entre Team Leader y MIA ahora pueden exportar a Excel la Lista de Negocios desde la pantalla, respetando los filtros avanzados aplicados y mostrando únicamente la información dentro de su alcance jerárquico. Antes dependían de un Analista Operativo u otro rol con permisos adicionales para obtener este archivo.

### Corregido

- **Exportación a Excel podía incluir negocios fuera del alcance del usuario:** El archivo Excel generado no filtraba por el árbol jerárquico del usuario como sí lo hace la lista en pantalla, por lo que un usuario podía exportar negocios que no le correspondían ver. Ahora la exportación respeta el mismo alcance que la vista de tabla.

## [1.22.9] - 2026-06-20

### Corregido

- **Gráfica de Estado del dashboard ignoraba el filtro de estado:** Al aplicar un filtro por estado en el dashboard de producción, la gráfica de pastel "Distribución por Estado" seguía mostrando siempre los mismos estados, sin reflejar la selección. Ahora la gráfica respeta el filtro aplicado.

## [1.22.8] - 2026-06-17

### Corregido

- **Cron de fondeo no detectaba pagos vencidos el mismo día:** Si el cron diario corría temprano (por ejemplo, 6 a.m.), no fondeaba los aportes cuya fecha esperada era ese mismo día — quedaban para el día siguiente. Ahora el cron reconoce correctamente los pagos vencidos el día en curso.
- **Fecha de fondeo no coincidía con la fecha programada:** Al fondear un aporte (por cron o manualmente), la fecha que quedaba registrada era la del momento en que se ejecutaba la acción, no la fecha originalmente programada. Si el fondeo se atrasaba varios días, se perdía la fecha real esperada. Ahora la fecha de fondeo del aporte y del negocio respeta siempre la fecha programada.
- **Fechas de negocio podían mostrarse con un día de diferencia:** La fecha de emisión, la fecha esperada de fondeo y los filtros avanzados por fecha (Fondeo, Creación, Emisión) podían mostrarse o guardarse con un día de diferencia según el huso horario del navegador o del servidor. Ahora todas las fechas de negocio se calculan de forma consistente en hora de Bogotá, sin importar desde dónde se acceda a la plataforma.
- **Filtrar la lista de negocios podía devolver "sin resultados":** Si se aplicaba un filtro (de fecha, estado, soportes, etc.) estando en una página distinta a la primera, la lista podía mostrarse vacía aunque sí existieran negocios que cumplían el filtro. Ahora aplicar cualquier filtro vuelve siempre a la primera página de resultados.

## [1.22.7] - 2026-06-15

### Corregido

- **Aportes en Cartera desde pagos pendientes:** El botón "Cartera" ahora funciona correctamente sobre aportes en estado Sin Fondear. Antes, al hacer clic no ocurría nada porque el servicio solo aceptaba aportes ya Fondeados como origen de la transición.
- **Color verde en aportes fondeados del mes actual:** Los aportes marcados como Fondeados en el mes en curso ahora muestran el fondo verde y el ícono de check, igual que los aportes de meses anteriores. Antes aparecían en gris como si estuvieran pendientes.
- **Botones de acción visibles solo al pasar el cursor:** Los botones "Cartera" y "Pago Anticipado" en la lista de aportes ahora se muestran únicamente al pasar el cursor sobre la fila, evitando el ruido visual cuando hay muchos aportes. El botón "Quitar Cartera" sigue siempre visible por ser una acción de alerta.
- **Modal de aportes unificado:** Todos los aportes (fondeados y sin fondear) ahora se gestionan desde la misma interfaz de fila con botones contextuales. Se eliminó el flujo de selección masiva con checkboxes que ya no aplica con el nuevo ciclo de vida del cron.
- **Fecha de fondeo no se sobreescribe al editar un negocio:** Al modificar los datos de un negocio ya emitido, el sistema ya no pisaba la fecha real de fondeo con una fecha recalculada del calendario de aportes.

### Mejorado

- **Nuevo ciclo de vida de aportes (SIN_FONDEAR → FONDEADO):** Los aportes generados al emitir un negocio ahora nacen en estado Sin Fondear. Un cron diario los fondea automáticamente cuando llega su fecha esperada, reflejando con precisión el estado real de cada pago. Antes todos los aportes nacían Fondeados inmediatamente, independientemente de su fecha.
- **Fecha de portfolio con hora exacta:** Las fechas de registro de Cartera y Pago Anticipado ahora incluyen la hora del evento (UTC), lo que permite monitoreo y trazabilidad precisos en los logs.

## [1.22.6] - 2026-06-12

### Corregido

- **Conteo de Soportes Activos:** Se corrigió el conteo de soportes de pago en la vista de negocios para incluir únicamente los soportes que están en estado activo, excluyendo los eliminados lógicamente.
- **Rendimiento Dashboard (N+1):** Se optimizó la ruta `/api/negocios/stats` para realizar una sola agrupación masiva (`groupBy`) en base de datos en lugar de consultar individualmente cada estado (Venta Efectuada, Emitido, Fondeado). Esto resuelve el problema de "Repeating Spans" (N+1) reportado por Sentry.

## [1.22.5] - 2026-06-10

### Corregido

- **Filtro por campo de fecha en negocios:** Al cambiar el campo de fecha en los filtros avanzados (Fondeo, Creación o Emisión), el rango seleccionado ahora se conserva y la búsqueda se aplica sobre la fecha correspondiente en la base de datos. Antes, cambiar de campo descartaba el filtro silenciosamente (la lista quedaba sin filtrar aunque el rango se veía seleccionado) y, para el rol Agente/Coach, cualquier filtro de fecha se aplicaba siempre sobre la fecha de creación.
- **Filtro de fecha por defecto visible:** El filtro de fecha que se aplica automáticamente al entrar a la lista de negocios (mes actual: por fecha de creación para Agente/Coach y por fecha de fondeo para Administrador, Asistente Operativo de Gerencia y Analista de Soporte) ahora se refleja en el panel de filtros avanzados y en el badge de filtros activos. Puede modificarse o limpiarse como cualquier otro filtro y nunca pisa una selección hecha por el usuario.

## [1.22.4] - 2026-06-10

### Mejorado

- **Backup automático de base de datos:** Se implementó un sistema de respaldo automático de PostgreSQL hacia Digital Ocean Spaces. Los backups se ejecutan 3 veces al día (00:00, 08:00 y 16:00 UTC) y se retienen los 2 más recientes. Reemplaza el servicio de backup anterior que no funcionaba correctamente.

### Corregido

- **Filtros del dashboard con selección múltiple:** Los selectores de Compañía, Producto, Categoría y Origen ahora muestran todos los ítems marcados cuando el filtro está en modo "todas". Al hacer clic en un ítem individual desde ese estado se deselecciona solo ese ítem, manteniendo los demás activos. El botón "Todas/Todos" funciona ahora como toggle real: si todo está seleccionado, desmarca todo y permite construir una selección desde cero.

## [1.22.3] - 2026-06-05

### Corregido

- **Filtro de Money Strategist visible para todos los roles:** El selector de Money Strategist en los filtros avanzados de la lista de negocios ahora carga correctamente para cualquier usuario autenticado. Anteriormente retornaba un error 401 para roles distintos de Administrador porque consultaba un endpoint restringido.
- **Lista de Money Strategists acotada por jerarquía:** Los usuarios con rol Agente/Coach ven únicamente los money strategists que tienen a su cargo (toda la cadena descendente), no todos los del sistema. Los roles de backoffice (Administrador, Asistente Operativo de Gerencia, Analista de Soporte) siguen viendo la lista completa.
- **Campos ocultos para MS Junior:** Los campos "Money Strategist" y "Categoría del Money Strategist" se ocultan automáticamente para los usuarios en el nivel más bajo de la jerarquía (MS Junior / LEVEL_0), ya que no tienen agentes a cargo que filtrar.

## [1.22.2] - 2026-06-05

### Corregido

- **Error del Simulador en QA:** Se corrigió un error que impedía visualizar el resultado de la calculadora en el entorno de QA tras la migración de la base de datos (`idProductPercentageCommissionNewBusinesses`).
- **Validación de Usuarios sin Nivel:** La validación que impide el uso del simulador a usuarios sin nivel asignado ahora restringe específicamente al rol de `AGENTE`. Los usuarios con roles administrativos (ej. `ASISTENTE_GERENCIA_OPERATIVA`, `ADMIN`) pueden usar el simulador sin nivel.

## [1.22.1] - 2026-06-04

### Mejorado

- **CI/CD Sentry Env Injection:** Se actualizaron los pipelines de GitHub Actions (QA y Producción) y el `Dockerfile` para inyectar automáticamente las variables `SENTRY_AUTH_TOKEN` y `NEXT_PUBLIC_SENTRY_DSN`, garantizando que el mapeo de sourcemaps y el registro de eventos en Sentry funcionen de manera nativa sin configuraciones manuales en los droplets.

## [1.22.0] - 2026-06-03

### Nuevo

- **Renombre de Simulador a Calculadora:** Se actualizó la nomenclatura en toda la aplicación, cambiando "Simulador" por "Calculadora" en las rutas (`/dashboard/calculadora`), componentes y menú de navegación para reflejar mejor su propósito.
- **Integración con Sentry:** Se completó la configuración del SDK de Sentry (`@sentry/nextjs`) para el monitoreo de errores en producción, incluyendo la configuración de cliente, servidor y edge, y se deshabilitó su inicialización en entornos de desarrollo local para evitar ruido.
- **Filtros avanzados en negocios (Sheet completo):** La lista de negocios ahora cuenta con un panel deslizable de filtros avanzados que reemplaza el modal anterior. Incluye diez dimensiones de filtrado: rango de fechas con selector de campo (fondeo, creación o emisión), Money Strategist (multiselect de usuarios), estado (multiselect), soportes/comprobantes (todos / con / sin), compañía, producto, origen, plazo, periodicidad y categoría del Money Strategist. El cambio de compañía filtra automáticamente los productos disponibles.

- **Badge de filtros activos:** El botón "Filtros avanzados" muestra un badge ámbar con la cantidad de dimensiones activas. Se oculta cuando no hay filtros aplicados.

- **Exportación Excel con paridad de filtros:** La descarga de Excel respeta exactamente los mismos filtros que se aplican en la tabla, sin excepción. Ambas rutas (lista y exportación) comparten el mismo esquema de validación.

- **Eliminar negocio fondeado:** Los roles Administrador, Analista de Soporte y Asistente Operativo de Gerencia pueden cancelar negocios en estado Fondeado directamente desde el menú de acciones de la tabla, sin necesidad de cambiar el estado manualmente.

- **Ver motivo de cancelación:** Los negocios cancelados muestran ahora una nueva opción "Ver motivo cancelación" en el menú de acciones, que abre un modal con la observación registrada al momento de la cancelación.

- **Control de acceso "Ver como" por feature flag:** El botón para suplantar usuarios en la tabla de administración ahora está gobernado por el feature flag `impersonation_select` (fallback: desactivado). Permite activar o desactivar la funcionalidad sin re-desplegar.

### Mejorado

- **Nuevos endpoints de catálogo:** Se agregaron `GET /api/periodicities` y `GET /api/negocios/terms` para exponer los catálogos de periodicidades y plazos disponibles en la base de datos, usados por los filtros avanzados.

- **Categorías override:** El endpoint `GET /api/categories` soporta el parámetro `?beneficiaryMode=OVERRIDE` para retornar únicamente las categorías asociadas a usuarios con nivel de tipo Override.

### Corregido

- **Filtro "Sin soportes" no funcionaba:** El parámetro `hasSupports` llegaba al hook de la lista pero no se enviaba al API. Ahora todos los filtros del Sheet se propagan correctamente hasta la consulta.

- **Modal de cancelación se cerraba solo:** Al abrir el modal de cancelación en un negocio fondeado, el modal se cerraba inmediatamente si la carga de datos fallaba. Ahora se pre-carga con los datos disponibles de la tabla antes de iniciar la petición al API.

## [1.21.1] - 2026-06-02

### Corregido

- **Visualización de 0 en bono de leads:** Se solucionó un problema visual en la Calculadora de Comisiones donde, al no existir un bono por fuente de leads, se mostraba un "0" suelto en la interfaz en lugar de ocultar el bloque por completo.
- **Validación de nivel en el Simulador:** Los usuarios de la fuerza de ventas que no tienen un nivel asignado ahora son bloqueados correctamente al intentar simular comisiones, mostrando un mensaje claro de error. Se garantiza que los roles de backoffice (Soporte, Admin) puedan simular libremente sin esta restricción.
- **Mensajes de validación en formulario:** Se reemplazaron los errores genéricos de tipo (`Invalid input`) en el formulario del simulador por mensajes descriptivos como "Seleccione una compañía" o "Seleccione un producto", mejorando la retroalimentación al usuario.

## [1.21.0] - 2026-06-01

### Nuevo

- **Feature Flag para el Simulador:** Se integró el flag `dashboard_simulador` en Flagsmith para controlar el acceso al Simulador (Calculadora) de forma dinámica.
- **Simulador de comisiones mejorado:** El simulador (Calculadora) ahora soporta configuración dinámica de moneda dependiendo del negocio. Además, la selección de niveles jerárquicos ahora respeta estrictamente la cadena de mando del usuario, permitiendo a los roles como *Money Strategist* ver solo sus subniveles.
- **Modo Suplantación ("Ver como"):** Los administradores ahora pueden simular la sesión de cualquier usuario (agentes, soporte, etc.) desde la tabla de usuarios o un menú en el header. Esto permite revisar problemas o probar flujos sin necesidad de credenciales adicionales, mostrando siempre un banner de advertencia para regresar al rol original.

### Mejorado

- **Filtros Avanzados (Negocios):** Mejoras visuales en la sección de filtros avanzados, incluyendo una presentación en tres columnas, badge de conteo de filtros aplicados, e integración profunda con la paleta de colores oficial de la app (verde corporativo).

## [1.20.0] - 2026-05-29

### Nuevo

- **Gráfica de dona "Distribución por estado":** El dashboard incluye una tercera gráfica de dona que muestra cuántos negocios del scope activo están en cada etapa del ciclo de vida: **Venta Efectuada**, **Emitido** y **Fondeado**. Los colores son fijos: naranja para venta efectuada, azul para emitido y verde para fondeado. La gráfica se ubica a la derecha de las donuts de origen y compañía, completando una grilla de tres columnas en pantallas grandes.

### Mejorado

- **Tooltip con desglose por moneda en todas las donuts:** Al posicionarse sobre cualquier segmento de las tres gráficas de dona (origen, compañía o estado), el tooltip ahora muestra el total en USD consolidado más, cuando aplica, dos líneas de detalle: **Moneda extranjera** (cantidad de negocios, porcentaje global y monto en USD) y **Moneda local** (cantidad de negocios, porcentaje global, equivalente en USD y monto original en COP). Los porcentajes del desglose siempre suman el porcentaje total del segmento.

- **Segmentos unificados por entidad en origen y compañía:** Las donuts de origen del cliente y de compañía ahora muestran un único segmento por entidad en lugar de dos segmentos separados (uno COP y uno USD). Toda la producción de una misma entidad queda agrupada visualmente en un solo color; el detalle monetario por tipo de moneda sigue disponible en el tooltip.

- **Altura uniforme entre las tres donuts:** Las tres tarjetas del panel de distribución tienen ahora la misma altura, eliminando el desalineado visual cuando las leyendas tienen distinto número de ítems.

## [1.19.0] - 2026-05-28

### Nuevo

- **Gráfica de dona "Negocios por Compañía":** El dashboard incluye una nueva gráfica de dona que muestra la distribución de los negocios del scope jerárquico agrupados por compañía (SKANDIA, DOMINION, ITA, MANHATTAN, MEJORCDT, TRINITY, entre otras) y por moneda. Cada compañía recibe un color identificador propio tomado de una paleta distinta a la del origen; los negocios en moneda extranjera aparecen con el tono sólido y los de moneda local con una variante más clara del mismo color.

- **Vista lado a lado de las dos donuts:** La gráfica de compañías se muestra a la derecha de la gráfica de origen del cliente en una grilla de dos columnas, permitiendo comparar de un vistazo la concentración de producción por aliado y por canal de origen sin necesidad de desplazarse.

- **Tooltip con valor monetario:** Al posicionarse sobre un segmento, el tooltip muestra el nombre de la compañía, la moneda, la cantidad de negocios y el porcentaje del total. Los segmentos en COP también muestran el equivalente en USD calculado con la TRM vigente y el monto original en pesos como referencia.

- **Integración completa con árbol y filtros:** La gráfica respeta el scope jerárquico activo y todos los filtros del dashboard (rango de fechas, estado, origen, categoría, compañía, etc.). Al marcar o desmarcar nodos en el árbol o cambiar cualquier filtro, los porcentajes y conteos se recalculan automáticamente. Si los filtros no producen resultados, se muestra un estado vacío con el mensaje *"Sin negocios para los filtros aplicados"*.

## [1.18.0] - 2026-05-28

### Nuevo

- **Gráfica de dona "Origen del cliente":** El dashboard incluye una nueva gráfica de dona que muestra la distribución de los negocios del scope jerárquico agrupados por tipo de origen del cliente (Método Vortex, Propio, Asesoría Gratuita, KAM/Influencer, etc.) y por moneda. Cada origen recibe un color identificador consistente; los negocios en moneda extranjera aparecen con el tono sólido y los de moneda local con una variante más clara del mismo color.

- **Desglose por moneda en el origen:** Cada tipo de origen puede mostrar hasta dos segmentos: uno para negocios en **USD** y otro para negocios en **COP**. La leyenda lateral lista cada combinación con su porcentaje (ej. *Método Vortex USD · 30%* / *Método Vortex COP · 16.7%*).

- **Tooltip con equivalencia monetaria:** Al posicionarse sobre un segmento, aparece un tooltip con la cantidad de negocios, el porcentaje y el monto total. Los segmentos en USD muestran el valor directamente en dólares. Los segmentos en COP muestran el equivalente en USD (calculado con la TRM vigente) y el monto original en pesos como referencia.

- **Integración con árbol y filtros:** La gráfica respeta el scope jerárquico activo y todos los filtros del dashboard (compañía, categoría, rango de fechas, origen, etc.). Al marcar o desmarcar nodos en el árbol o cambiar cualquier filtro, los porcentajes y conteos se recalculan automáticamente.

## [1.17.0] - 2026-05-28

### Nuevo

- **Tabla heatmap de producción por compañía:** El dashboard incluye una nueva tabla que muestra la producción de cada Money Strategist del scope jerárquico desglosada por compañía. Cada compañía aparece con dos columnas: el monto total en **USD** con intensidad de color según el volumen (a mayor producción, fondo más oscuro) y la cantidad de **negocios**. Para producción en moneda local, la celda también muestra el equivalente en **COP** debajo del valor en USD. El texto de celdas oscuras cambia a blanco automáticamente para mantener la legibilidad.

- **Agrupación jerárquica en la tabla:** Las filas se agrupan por nivel (Team Leader, MS Senior, MS Junior, etc.) con un separador de sección que identifica cada grupo por su color de nivel. Un botón en el encabezado de la columna **Money Strategist** permite invertir el orden jerárquico (de mayor a menor rango y viceversa).

- **Buscador en el árbol de jerarquía:** El panel izquierdo del dashboard incluye un campo de búsqueda para filtrar personas en el árbol. Los resultados se muestran en lista plana con el nombre resaltado, el avatar de iniciales y el nivel de cada persona; hacer clic en un resultado activa o desactiva esa persona directamente.

- **Colapso del panel de jerarquía:** Un nuevo botón en el encabezado del árbol permite colapsar o expandir el panel lateral izquierdo para ganar espacio en la vista principal. El panel se anima suavemente al abrirse o cerrarse.

### Mejorado

- **Diseño del panel Venta Total:** El bloque de KPIs en USD ahora tiene fondo verde oscuro (#003c45) —el mismo color del menú principal— con texto blanco y tarjetas translúcidas. El indicador de TRM automática muestra un punto pulsante animado que señala que el valor es en tiempo real. El formulario de TRM manual solo aparece cuando la consulta automática falla, no durante la carga inicial.

- **Gráfica de barras ordenada por producción:** Las barras de la gráfica por Money Strategist ahora se ordenan de mayor a menor producción total en USD, facilitando identificar quién lidera el período.

- **Árbol de jerarquía sin niveles beneficiarios:** Los usuarios con nivel de tipo `BENEFICIARIO_GENERAL` ya no aparecen en el árbol del dashboard, evitando confusión con los niveles comerciales activos.

### Corregido

- **Actualización de niveles en administración:** Se corrigió un error que impedía guardar cambios en la configuración de un nivel cuando se modificaba el beneficiario fijo o el nivel siguiente. Prisma rechazaba los campos por nombres incorrectos; ahora se usan los campos correctos de la API de relaciones.

## [1.16.0] - 2026-05-27

### Nuevo

- **Gráfica de producción por Money Strategist:** El dashboard incluye una gráfica de barras agrupadas que compara, para cada persona visible en el árbol jerárquico, la producción en **moneda extranjera (USD)** frente a la producción **nacional convertida a USD** con la TRM vigente. Cada agente aparece con dos barras (azul y verde); al pasar el cursor se muestra el monto y la cantidad de negocios del período y filtros aplicados.

- **Comparación visual por equipo:** Los grupos se ordenan según la jerarquía activa (el usuario autenticado primero, luego su equipo). Al marcar o desmarcar nodos en el árbol, o al aplicar filtros de fechas y catálogos, la gráfica se actualiza con los mismos criterios que el panel de KPIs. Si hay muchos agentes, la gráfica permite desplazamiento horizontal para revisar todos los nombres.

### Mejorado

- **TRM compartida entre KPIs y gráfica:** La tasa de cambio se consulta una sola vez al cargar el dashboard y alimenta tanto las tarjetas de KPIs como la conversión de la barra nacional en la gráfica. Si la consulta automática falla, la TRM manual ingresada en el panel general sigue recalculando ambas vistas.

- **Estado vacío en la gráfica:** Cuando no hay producción para la combinación de árbol y filtros seleccionados, se muestra el mensaje *Sin producción registrada para los filtros aplicados* en lugar de una gráfica vacía confusa.

## [1.15.0] - 2026-05-27

### Nuevo

- **Panel de KPIs en USD con TRM automática:** El dashboard de producción ahora muestra tres tarjetas de métricas en dólares: **Detalle Internacional** (negocios en USD), **Nacional convertido a USD** (total COP dividido por la TRM) y **Total USD** (suma de ambos). La TRM del día se consulta automáticamente al Banco de la República; si la consulta falla, se puede ingresar la TRM manualmente para recalcular los valores al instante. El valor en COP equivalente aparece debajo del monto en USD en la tarjeta Nacional para facilitar la comparativa.

- **Período activo visible en el panel:** El encabezado del panel de ventas muestra el rango de fechas que está aplicado actualmente, así siempre es claro qué período representan los números.

### Mejorado

- **Skeletons de carga en las tarjetas:** Mientras los datos se están cargando (al entrar al dashboard o al aplicar filtros), las tarjetas muestran un indicador animado en lugar de mostrar brevemente valores en cero, evitando lecturas erróneas durante la transición.

## [1.14.0] - 2026-05-27

### Nuevo

- **Panel de filtros del dashboard:** El dashboard de producción ahora incluye un panel de filtros completo con 8 controles: rango de fechas (selección por día), estado del negocio, categoría, compañía, producto, origen, plazo y periodicidad. Los cambios en los filtros no se aplican hasta que el usuario confirma con el botón **Aplicar**, preservando los datos visibles mientras se ajusta la selección.

- **Filtros de compañía y producto con búsqueda:** Los selectores de compañía y producto incluyen campo de búsqueda para encontrar opciones rápidamente en listas largas. Al seleccionar una compañía, el listado de productos se reduce automáticamente a los productos de esa compañía.

- **Catálogo de periodicidad desde la base de datos:** Las opciones de periodicidad (Mensual, Trimestral, Anual, etc.) se cargan directamente desde la tabla de datos, de modo que cualquier periodicidad configurada en el sistema aparece automáticamente en el filtro sin cambios de código.

### Mejorado

- **Árbol jerárquico con resaltado por categoría:** Al aplicar un filtro de categoría, los nodos del árbol que no pertenecen a esa categoría se atenúan visualmente, facilitando identificar qué usuarios contribuyen a los resultados filtrados.

- **Navegación más compacta:** Se eliminó el elemento "Inicio" del breadcrumb para ganar espacio vertical. El panel de filtros también se redujo en altura (padding y tamaño de fuente optimizados) para mostrar más contenido útil en pantalla.

- **Skeleton de jerarquía visible:** El indicador de carga del árbol jerárquico ahora muestra el gris estándar del sistema en lugar de un color casi invisible.

## [1.13.0] - 2026-05-26

### Nuevo

- **Dashboard de producción — Árbol jerárquico:** Nuevo panel lateral en el dashboard que muestra la estructura organizacional del equipo. Cada usuario aparece con su nombre, categoría y color de nivel. Los nodos se pueden marcar o desmarcar para filtrar los datos del dashboard; al desmarcar un líder, sus subordinados también se excluyen del filtro. Solo se listan usuarios con nivel asignado.

- **Activación gradual del dashboard:** El módulo de dashboard de producción se controla con el feature flag `production_dashboard` en Flagsmith, permitiendo habilitarlo por usuario o por entorno sin un nuevo deploy. Cuando el flag está desactivado, la opción de menú no aparece y el acceso directo a `/dashboard` redirige a Negocios.

### Mejorado

- **Redirección después del login:** Todos los usuarios ingresan por defecto a **Negocios** (`/dashboard/negocios`) en lugar del dashboard de producción, simplificando el flujo de entrada habitual.

- **Feature flags por identidad:** Flagsmith evalúa los flags por correo del usuario autenticado, de modo que las pruebas en QA y desarrollo reflejan los overrides configurados por persona.

## [1.12.0] - 2026-05-27

### Nuevo

- **Fondear el primer pago:** Administradores y Analistas de Soporte ahora pueden registrar el fondeo del primer aporte directamente desde el modal de aportes. Al hacer clic en "Fondear", se ingresa la fecha de fondeo y el sistema cambia el estado del negocio de **Emitido** a **Fondeado** de forma automática y atómica. Si el primer aporte estaba en cartera y el cliente lo pagó, el negocio también transiciona a Fondeado al registrar el pago de cartera.

- **Fechas en zona horaria de Bogotá:** Todas las fechas del sistema (modal de aportes y tabla de negocios) ahora se muestran correctamente en hora Colombia (UTC-5), eliminando el desfase de un día que aparecía en ciertos casos.

### Infraestructura

- **Llaves Flagsmith por entorno:** Se configuraron las claves de servidor de Flagsmith para los entornos de QA y Producción, completando la integración de feature flags iniciada en 1.10.0.

## [1.11.0] - 2026-05-24

### Nuevo

- **Cartera pagada:** Cuando un cliente paga una deuda en cartera, el sistema ahora registra el pago como **Cartera Pagada** — un estado definitivo que deja constancia permanente del cobro. Ya no es posible revertir un aporte pagado, garantizando la trazabilidad del ciclo de cobro completo.

- **Confirmación con fecha de pago:** Al marcar un aporte como pagado desde cartera, se muestra un diálogo de confirmación donde el analista ingresa la fecha exacta en que el cliente realizó el pago. Esa fecha queda registrada y visible en el detalle del aporte.

### Corregido

- **Fecha de cartera mostraba un día menos:** Las fechas de aportes en estado Cartera, Pago Anticipado y Cartera Pagada se mostraban con un día de desfase (por ejemplo, 24 de mayo aparecía como 23 de mayo). Corregido para todos los estados del modal de fondeo.

## [1.10.0] - 2026-05-23

### Infraestructura

- **Gestión de funcionalidades por entorno (Feature Flags):** Se integró Flagsmith como plataforma de feature flags. Esto permite habilitar o deshabilitar funcionalidades de forma remota por entorno (QA / Producción) sin necesidad de un nuevo deploy. Las nuevas funcionalidades de alto impacto se irán lanzando bajo flags de manera progresiva.

- **Política de seguridad de contenido ampliada:** Se reforzó la cabecera `Content-Security-Policy` del servidor para incluir directivas `frame-src` y `object-src`, mejorando la protección contra ataques de inyección de contenido embebido.

## [1.9.0] - 2026-05-22

### Nuevo

- **Cédulas y documentos alfanuméricos:** El campo de número de identificación del cliente ahora acepta letras, dígitos, puntos y guiones, eliminando el bloqueo que impedía registrar clientes con Cédula de Extranjería (`CE-123456`), pasaporte (`PE-123456`) u otros documentos con letras. El sistema normaliza automáticamente el número a mayúsculas al guardarlo, garantizando consistencia en la base de datos.

## [1.8.1] - 2026-05-22

### Nuevo

- **Buscador en filtros avanzados:** Se agregaron campos de texto en el modal de "Filtros Avanzados" para buscar y filtrar en tiempo real las opciones de Compañía, Producto y Origen.
- **Limpiar filtros de búsqueda:** El botón "Limpiar" ahora también reinicia el texto ingresado en los buscadores.

## [1.8.0] - 2026-05-22

### Nuevo

- **Comprobantes en PDF:** Los usuarios ahora pueden subir archivos PDF como comprobantes de pago, además de las imágenes (JPEG, PNG, WebP). El visor de comprobantes muestra los PDF directamente en pantalla con un visor inline, y el botón "Ver original" sigue disponible para abrirlos en una nueva pestaña. Los PDF se identifican visualmente con un ícono de documento en la lista de comprobantes.

## [1.7.0] - 2026-05-22

### Nuevo

- **Estados de Fondeo Avanzados:** El modal de fondeo ahora soporta dos nuevos estados por aporte: **En Cartera** (marcado en rojo cuando un pago está en gestión de cobro) y **Pago Anticipado** (cuando el cliente pagó antes de la fecha proyectada). Analistas de Soporte y Administradores pueden registrar estos estados directamente desde el modal.

- **Ciclo de vida completo del aporte:** Los aportes ahora nacen automáticamente como Fondeados al momento de emitir el negocio, con sus fechas proyectadas por cuota. El color del aporte (verde o gris) se determina comparando la fecha proyectada de cada cuota con el mes actual — sin necesidad de acciones manuales.

- **Reversión de Cartera:** Los analistas pueden revertir un aporte marcado como En Cartera con un clic en "Quitar Cartera", devolviendo el aporte a su estado anterior y registrando el cambio en el log de auditoría.

- **Confirmación obligatoria en transiciones:** Todas las acciones de cambio de estado (marcar Cartera, Pago Anticipado, Quitar Cartera) requieren confirmación explícita del usuario antes de ejecutarse.

- **Control de acceso por rol:** Los botones de acción solo son visibles para Analistas de Soporte y Administradores. Los Agentes/Coach pueden ver el estado de cada aporte pero no realizar cambios.

- **Auditoría completa:** Cada cambio de estado queda registrado automáticamente en el log de auditoría con usuario, IP, fecha y hora.

- **Script de migración de pagos:** Se incluye un script (`prisma/seeds/migrate-payments-to-fondeado.ts`) para migrar pagos existentes en estado SIN_FONDEAR al nuevo modelo FONDEADO.

### Mejorado

- **Diseño del modal de fondeo:** Las filas de aportes son más compactas. Los botones de acción aparecen al pasar el mouse sobre cada fila y llevan íconos descriptivos. Los aportes de meses pasados se muestran en verde reducido para aprovechar mejor el espacio.

- **Recálculo de fechas al cambiar emisión:** Al modificar la fecha de emisión de un negocio, se recalculan automáticamente las fechas proyectadas de todos los aportes en estado Fondeado, respetando los aportes en Cartera o Pago Anticipado.

### Corregido

- **Rendimiento en actualización de negocios:** Se resolvió un error de timeout (P2028) que ocurría al guardar negocios con muchos aportes. Las actualizaciones de fechas ahora se ejecutan fuera de la transacción principal.

- **Mensaje de validación en cambio de rol:** Al intentar guardar un usuario con rol Agente sin categoría asignada, ahora se muestra el mensaje de error específico en lugar del JSON técnico.

## [1.6.4] - 2026-05-21

### Nuevo

- **Recálculo de fechas de fondeo desde Fecha de Emisión:** Se implementó el recálculo dinámico de las fechas esperadas de los aportes basados en la fecha de emisión del negocio y no desde la fecha del primer fondeo. Al registrar o actualizar la fecha de emisión de un negocio en estado emitido (`EMITIDO`), se recalculan automáticamente las fechas de fondeos proyectados.
- **Edición rápida desde la tabla:** Se añadió la opción de editar la fecha de emisión directamente en la tabla principal de negocios a través de una celda de fecha interactiva. El ícono de lápiz de edición está ahora **para siempre visible** para todos los negocios elegibles sin necesidad de hover. El botón está habilitado exclusivamente para negocios en estado emitido (`EMITIDO`).
- **Selector de Fechas Libre:** Se eliminó la restricción de fecha máxima (`max`) tanto en el modal de detalle del negocio como en la celda interactiva de la tabla, permitiendo seleccionar libremente cualquier fecha en el pasado o futuro según las necesidades operativas, eliminando también las validaciones de cliente que impedían el registro de fechas futuras.

### Interno

- **Pruebas y Verificación:** Se crearon y adaptaron suites de pruebas unitarias robustas en el frontend (`business-view-modal.date-issued.test.tsx`) y backend (`route.test.ts`), garantizando el cumplimiento al 100% de los criterios de aceptación sin regresiones.

## [1.6.3] - 2026-05-19

### Nuevo

- **Precarga automática de Periodicidad para SKANDIA + MFUND:** Al seleccionar la compañía Skandia y el producto MFUND en el formulario de creación de negocio, el campo Periodicidad se completa automáticamente con "Aportes Ocasionales". El campo permanece editable: si el agente necesita seleccionar otro valor, el cambio se respeta sin revertirse. En modo edición, el valor guardado en base de datos se preserva tal cual.

## [1.6.2] - 2026-05-15

### Nuevo

- **Filas por página en tabla de negocios:** Se habilitó el selector de "Filas por página" en la tabla de negocios. Los usuarios ahora pueden elegir ver 10, 20, 50 o 100 registros simultáneamente, mejorando la navegación en listados extensos.

### Corregido

- **Alineación de filtros en dashboard:** Se estandarizó la altura (`h-9`) y alineación de todos los controles de filtro (búsqueda, fechas, estados) en el listado de negocios, eliminando desajustes visuales y mejorando la estética premium del dashboard.

- **Sincronización de Prisma (Supports):** Se resolvieron errores de ejecución relacionados con la relación `supports` en el modelo `Business`. Se sincronizaron los tipos de Prisma y el mapeo de entidades para garantizar que el conteo de soportes sea robusto tanto en ejecución como en pruebas.

- **Actualización de negocio fallaba con plazo o aportes en cero:** Al guardar un negocio con plazo `0` (productos Skandia/Mfund) o con `0` aportes, el sistema devolvía "Error al actualizar" de forma silenciosa. La validación del servidor rechazaba valores cero aunque fueran válidos para esos productos.

- **Mensajes de error de validación ahora en español y descriptivos:** Los mensajes que devuelve la API al detectar datos inválidos en la edición de negocios ahora indican claramente qué campo falló y por qué.

## [1.6.1] - 2026-05-15 (Legacy)

## [1.6.0] - 2026-05-14

### Nuevo

- **Soportes de Pago por Negocio:** Los usuarios pueden adjuntar imágenes de comprobantes (JPEG, PNG, WebP) a cada negocio directamente desde la tabla de negocios. Las imágenes se almacenan de forma segura en Digital Ocean Spaces, organizadas por número de contrato.

- **Visor de Comprobantes:** Un panel lateral permite visualizar todos los comprobantes de un negocio con lista de miniaturas a la izquierda y vista previa grande a la derecha. Incluye información del archivo (fecha, tamaño, formato, usuario que subió) y botón para ver el original.

- **Columna "Soporte de Pago":** La tabla de negocios ahora muestra una columna con el estado de comprobantes por negocio: chip verde con la cantidad de soportes subidos, o chip ámbar "Sin soporte" cuando no tiene ninguno.

- **Indicador de Emitidos sin Soporte:** La tarjeta de "Emitidos" en el dashboard ahora muestra cuántos negocios emitidos no tienen comprobante de pago adjunto, facilitando el seguimiento de casos pendientes.

- **Gestión de Acciones por Fila:** Las acciones de cada negocio (Editar, Ver detalle, Eliminar) se agrupan en un menú desplegable "⋮" para liberar espacio. Los íconos de subir y ver comprobantes quedan visibles directamente en la fila.

- **Tarjetas de Estadísticas Compactas:** El panel de KPIs del dashboard ocupa menos espacio vertical y puede ocultarse con un botón para maximizar el espacio de la tabla de negocios.

### Permisos

- **Eliminar comprobantes** está restringido a los roles Administrador, Asistente Operativo de Gerencia y Analista de Soporte.
- Subir y visualizar comprobantes está disponible para todos los roles.
- El botón de subir comprobante solo aparece cuando el negocio tiene estado Emitido o Fondeado y tiene número de contrato asignado.

### Interno

- 1969 pruebas pasando, 0 errores de TypeScript.
- Nueva regla de proyecto: todo el código debe escribirse en inglés (nombres de variables, archivos, comentarios). El español se reserva para cadenas de texto visibles al usuario.
- Variables de entorno `DO_SPACES_*` configuradas en Docker Compose (QA y Prod) y workflows de CI/CD.

## [1.5.1] - 2026-05-13

### Corregido

- **Visibilidad de Negocios – Roles Operativos:** Los usuarios con rol Asistente Operativo de Gerencia y Analista de Soporte ahora pueden ver todos los negocios y estadísticas del sistema, al igual que el Administrador. Antes solo veían los negocios de su propia cadena jerárquica.

- **Estadísticas del Dashboard:** Los indicadores de negocios (Ventas Efectuadas, Emitidos, Fondeados) ahora son visibles para todos los roles. Los datos se filtran automáticamente según lo que cada usuario tiene permitido ver.

- **Selector de Líder en Formulario de Usuario:** Al editar un usuario que ya tiene un líder asignado, el nivel y el nombre del líder ahora se pre-cargan correctamente en los selectores.

- **Migración de Base de Datos – Estabilidad:** Se corrigió una migración que fallaba en ambientes QA y producción al encontrar configuraciones de producto duplicadas. Ahora se depuran automáticamente los duplicados antes de crear el índice único, y todas las operaciones son idempotentes (seguras de re-ejecutar).

### Interno

- 1886 pruebas pasando, 0 errores de TypeScript.
- **Listado de Negocios – Ordenamiento por Columnas:** Se habilitó el ordenamiento funcional en el servidor para las columnas Cliente, Identificación, Contrato, Compañía y Producto. Se eliminó el ordenamiento forzado en el cliente que impedía que la selección del usuario se reflejara correctamente tras la carga de datos.
- **Formulario de Negocio – Limpieza de Etiquetas:** Se eliminaron las etiquetas de depuración "(No editable - Sin Rol)" del campo Money Strategist en el formulario de edición, proporcionando una interfaz más limpia para el usuario.
- **Dashboard – Layout de Filtros:** Se ajustó el espaciado vertical de los filtros en el listado de negocios para evitar recortes visuales en ciertas resoluciones.

### Interno

- **API – Validación de Ordenamiento:** Se actualizaron los esquemas de validación Zod en `business-api.schemas.ts` para soportar las nuevas claves de ordenamiento del servidor.
- **Pruebas Unitarias – Sincronización de Comportamiento:** Se ajustaron las pruebas unitarias del listado de negocios para validar el ordenamiento delegado al servidor en lugar de la lógica de ordenamiento local previa.

## [1.5.0] - 2026-05-13

### Añadido

- **Comisión y Tipo de Aporte por Producto:** Cada producto ahora tiene dos campos nuevos: el porcentaje de comisión que aplica al momento de la liquidación (0–100%) y el tipo de aporte que recibe (`REGULAR` o `UNICO`). Ambos campos están disponibles en el formulario de creación y edición de productos, y se muestran en la tabla de administración.

- **Sincronización de Comisiones desde CSV:** Se incluye un script de seed que lee el archivo `docs/product-percentage-payment-commission.csv` y actualiza automáticamente los productos existentes con sus porcentajes de comisión y tipo de aporte. El proceso reporta en consola los productos que no se encontraron en la base de datos.

### Corregido

- **Carga de Archivos – Contadores de Sincronización:** Se corrigieron los contadores de registros nuevos y duplicados durante la importación de archivos LAG. El sistema ahora detecta correctamente los duplicados por número de carga y evita insertar registros repetidos.

### Interno

- 3 migraciones Prisma: campo `commissionPercentage` (Decimal), enumeración `ContributionType`, renombre de valor `INICIO → UNICO` en la DB.
- 18 pruebas unitarias nuevas (schemas Zod, mapper de Decimal, utilidades del seed).
- 1885 pruebas pasando, 0 errores de TypeScript.

## [1.4.0] - 2026-05-09

### Añadido

- **Jerarquía de Niveles:** Se separó el concepto de jerarquía de comisiones (ahora llamado **Nivel**) del concepto de agrupación de agentes (ahora llamado **Categoría**). Los niveles van de MS Junior (LEVEL_0) hasta Partner (LEVEL_5) más el nivel General para la agencia. Cada nivel tiene su propio color identificador.

- **Distribución de Comisiones por Nivel:** Se cargó la tabla estándar de distribución para todos los productos activos. Cada nivel de configuración (LEVEL_0 al LEVEL_5) tiene su propio plan de porcentajes hacia los niveles superiores de la cadena.

- **Visibilidad Jerárquica de Negocios:** Los líderes ahora pueden ver los negocios de todas las personas a su cargo en la cadena de jerarquía — no solo los directos, sino toda la red hacia abajo. Un LEVEL_4 ve negocios de LEVEL_3, 2, 1 y 0 que estén bajo su liderazgo. El detalle de cada negocio también es accesible para el líder correspondiente.

- **Selector de Líder en Formulario de Usuario:** Al asignar un líder a un usuario, ahora se selecciona primero el nivel del líder y luego se listan solo los usuarios de ese nivel — reemplazando el buscador anterior por un flujo más preciso y guiado.

- **Indicador de Carga en Selectores:** Todos los selectores del formulario de usuario muestran un indicador visual mientras cargan sus opciones.

### Mejorado

- **Tabla de Usuarios:** La columna de nivel ahora muestra un chip coloreado con el color asignado al nivel. La columna de categoría muestra solo el nombre sin decoración adicional.

- **Reglas de Distribución:** El formulario de reglas filtra y muestra solo los niveles relevantes por encima del nivel de configuración del producto, evitando configuraciones inválidas.

- **Terminología:** El término "Agente" fue reemplazado por **"Money Strategist"** en toda la interfaz visible al usuario.

- **Configuración de Productos:** La clave única de configuración cambió de Compañía-Producto-Categoría a Compañía-Producto-Nivel, alineada con la nueva estructura jerárquica.

### Interno

- Migración de base de datos: modelo `Category` renombrado a `Level`; nueva tabla `Category` para agrupación de agentes; tabla de distribución renombrada a `product_percentaje_commision_level`. 6 migraciones Prisma incluidas.
- 1880 pruebas pasando, 0 errores de TypeScript.

## [1.3.3] - 2026-05-08

### Corregido

- **Compañías – Validación de Moneda:** Se flexibilizó la validación del campo `idCurrency` para permitir tanto números como cadenas de texto. Esto resuelve el error "Invalid input" que ocurría al guardar cambios en empresas desde el panel administrativo.
- **Compañías – Feedback de Eliminación:** Se corrigió un error de estado reactivo que impedía que el diálogo de confirmación se cerrara y mostrara el mensaje de éxito tras eliminar una empresa. Ahora la interfaz responde instantáneamente a la acción.

### Añadido

- **Compañías – Edición de Nombre:** Se habilitó la posibilidad de modificar el nombre de la empresa directamente desde el formulario de edición, manteniendo la validación de unicidad en el sistema.

### Interno

- **Pruebas – Cobertura de Validación:** Actualización de la suite de pruebas unitarias para cubrir casos de tipos de moneda mixtos (string/number) y asegurar la estabilidad de los esquemas de Zod.
- **SDD – Documentación de Cambio:** Generación de especificaciones, diseño y reporte de verificación para el ciclo de vida del cambio `fix-company-validation-delete`.

## [1.3.2] - 2026-05-08

### Corregido

- **Interfaz – Selectores con scroll:** Se resolvió un problema de usabilidad en el componente `Select` donde las listas largas de opciones (ej. > 10 ítems) quedaban recortadas y no permitían el desplazamiento. Ahora el componente implementa un scroll nativo con una altura máxima de 320px (`max-h-80`), asegurando que todos los elementos sean accesibles en cualquier resolución.

### Interno

- **Componentes – Refactor de Altura:** Eliminación de restricciones de altura vinculadas dinámicamente al disparador (`trigger-height`) en el `Viewport` de Radix UI para permitir el crecimiento natural del contenido hasta el límite máximo.
- **Pruebas – Validación de UI:** Implementación de suite de pruebas unitarias para el componente `Select` que garantiza la persistencia de las clases de scroll y límites de altura.

## [1.3.1] - 2026-05-07

### Mejorado

- **Configuración de Productos – Estabilidad:** Los códigos de configuración de productos ahora se generan utilizando el `code` interno de las categorías en lugar de su nombre visual. Esto garantiza que los identificadores de negocio permanezcan estables aunque se renombren las categorías en la interfaz administrativa.
- **API – Integridad de Datos:** Refactorización del proceso de creación de configuraciones para asegurar una generación de códigos consistente y libre de dependencias de visualización.

### Interno

- **Scripts – Corrección de Datos:** Nuevo script de seed `fix-product-config-codes.ts` para normalizar retroactivamente todos los códigos de configuración existentes y eliminar duplicados causados por la remoción del origen.
- **Pruebas – Robustez:** Actualización de la suite de pruebas para validar la nueva lógica de generación de códigos basada en identificadores estables.

## [1.3.0] - 2026-05-07

### Añadido

- **Administración – Asignación Jerárquica:** Nueva interfaz administrativa para asignar Categoría y Líder a los usuarios. El sistema filtra dinámicamente las categorías de tipo `OVERRIDE` y los líderes disponibles basados en el nivel jerárquico superior (`idNextCategory`).
- **Administración – UX Jerárquica:** Etiquetas dinámicas en los selectores que indican el nombre de la categoría superior (ej. "Líder (COACH)") y feedback visual de "Nivel Máximo" cuando no hay niveles superiores configurados.
- **Usuarios – Tabla de Gestión:** Se añadieron columnas de Categoría y Líder a la tabla principal de usuarios para una auditoría visual rápida del árbol jerárquico.

### Mejorado

- **Seguridad – Activación de Usuarios:** El acceso al sistema ahora se rige estrictamente por el estado `active: false`. Los usuarios nuevos creados automáticamente quedan bloqueados y con el rol `AGENTE` por defecto, requiriendo activación manual por un administrador.
- **Notificaciones – Registro de Usuario:** Se centralizó el envío de correos electrónicos a administradores en la capa de creación de usuarios, eliminando notificaciones duplicadas y asegurando una traza de auditoría única.
- **Roles – Simplificación:** Eliminado el rol legacy `DEFAULT`. Todos los nuevos integrantes asumen el rol `AGENTE` desde su primer inicio de sesión, manteniendo la restricción de acceso hasta su aprobación.

### Interno

- **Pruebas – Cobertura de Activación:** Suite de pruebas unitarias actualizada para validar el nuevo flujo de creación con rol `AGENTE` y bloqueo por inactividad.
- **API Admin:** Refactorización del endpoint de usuarios para soportar filtros jerárquicos y relaciones de líder/categoría.

## [1.2.0] - 2026-05-07

### Añadido

- **Negocios – Búsqueda de Agentes:** El campo de búsqueda de agente ahora muestra la categoría del asesor directamente en los resultados del autocompletado, facilitando la identificación.
- **Configuración de Producto – Eliminación Lógica:** La desactivación de configuraciones de producto y reglas de distribución ahora utiliza un borrado lógico (soft delete) para mantener la integridad histórica.
- **Configuración de Producto – Auditoría:** Agregados registros de auditoría obligatorios para la creación, actualización y desactivación de configuraciones de producto y sus reglas de distribución.

### Mejorado

- **Configuración de Producto – Independencia del Origen:** La clave de unicidad y el código generado para la configuración de productos ya no incluyen el segmento de Origen del cliente. La asignación de comisiones ahora se realiza exclusivamente mediante la combinación de Producto y Categoría, simplificando significativamente el modelo de datos.
- **Negocios – Resolución de Comisión:** Al crear un nuevo negocio, el sistema resuelve la comisión aplicable basándose únicamente en el producto y categoría, eliminando la dependencia rígida del origen del cliente.

## [1.1.0] - 2026-05-07

### Añadido

- **Tipos de Categoría – Eliminación Lógica:** Al borrar un tipo de categoría, ahora se preservan sus datos en el sistema marcándolo como inactivo, manteniendo la integridad histórica y previniendo errores de referencias en cascada.
- **Tipos de Categoría – Tabla Genérica:** La vista de administración se ha actualizado para utilizar el componente compartido `DataTable`, ofreciendo sincronización de filtros con la URL, ordenamiento y consistencia visual con el resto de la aplicación.

### Mejorado

- **Formulario de Categorías – Tipos Activos:** Al crear una nueva categoría, el selector de "Tipo de Categoría" ahora muestra exclusivamente los tipos activos.
- **Formulario de Categorías – Edición Segura:** Si se edita una categoría antigua cuyo tipo asignado fue marcado como inactivo, este se mantendrá visible como opción de respaldo en el formulario, previniendo alteraciones involuntarias.
- **Rendimiento:** Se creó un endpoint interno optimizado (`/active`) que elimina el procesamiento de paginación para agilizar la carga del selector de tipos de categoría en los formularios.

## [1.0.2] - 2026-05-07

### Añadido

- **Categorías – Color identificador:** Cada categoría ahora tiene un color asignado (`#RRGGBB`) visible como chip circular en la tabla. El formulario de creación y edición incluye un selector de color nativo con paleta HTML completa.
- **Categorías – Secuencia jerárquica:** Se puede configurar cuál es la siguiente categoría en la jerarquía de la empresa (MS JUNIOR → MS SENIOR → TEAM LEADER → PERFORMANCE LEADER → BUSINESS LEADER → PARTNER → MIA). La tabla muestra la siguiente categoría en una columna dedicada.
- **Categorías – Audit log:** Toda operación de creación, edición o desactivación de categorías queda registrada en el log de auditoría del sistema.

### Mejorado

- **Categorías – Modo beneficiario:** Los valores internos del modo de beneficiario se renombraron a `OVERRIDE` y `BENEFICIARIO_GENERAL` para mayor claridad semántica. El formulario muestra el selector de usuario beneficiario solo cuando el modo es `BENEFICIARIO_GENERAL`.
- **Categorías – Filtro de tipo dinámico:** El filtro de tipo de categoría en la tabla admin ahora carga los tipos directamente desde la base de datos en lugar de ser una lista fija.
- **Categorías – Eliminación segura:** La desactivación de categorías ahora es lógica (cambia el estado a inactivo) en lugar de borrar el registro, preservando la trazabilidad histórica.
- **Administración – ERD actualizado:** El diagrama entidad-relación (`prisma/ERD.md`) se mantiene sincronizado con el esquema de base de datos y se estableció como regla obligatoria actualizarlo ante cualquier cambio de schema.

### Interno

- Migración manual de enum PostgreSQL: `UPLINE_CHAIN → OVERRIDE`, `FIXED_BENEFICIARY → BENEFICIARIO_GENERAL`.
- Seed de categorías reescrito con estrategia 3-pass para manejar la FK auto-referencial de secuencia.
- Nuevas acciones de auditoría: `CATEGORY_CREATED`, `CATEGORY_UPDATED`, `CATEGORY_DEACTIVATED`.

---

## [1.0.1] - 2026-05-05

### Infraestructura

- **Docker:** Se sincronizaron los nombres de las variables de entorno de producción (`SENDGRID_*_PROD`) y se habilitó la inyección de `SUPER_ADMIN_PASSWORD` en la configuración de producción para asegurar la correcta activación de la cuenta administrativa y el envío de correos.

## [1.0.0] - 2026-05-01

### Añadido

- **Negocios – Aportes y fondeos periódicos:** El sistema ahora calcula y persiste el **número de aportes** (`numAportes`) de cada negocio en el momento de su creación, considerando la periodicidad y las excepciones por compañía/producto (SKANDIA+MFUND → sin aportes; Pago Único / Aportes Ocasionales → 1 aporte). Los aportes se visualizan en el detalle del negocio indicando cuántos han sido fondeados.
- **Negocios – Fechas esperadas de fondeo:** Al fondear un negocio por primera vez (transición EMITIDO → FONDEADO), el sistema genera automáticamente una **fecha esperada** para cada aporte usando `date-fns/addMonths`, creando así un calendario de fondeos proyectados.
- **Negocios – Modal de fondeo multi-aporte:** Nuevo `FundingModal` que permite seleccionar individualmente qué aportes fondear, mostrando su estado (pendiente/fondeado) y fecha anclada cuando corresponde.
- **Compañías – Configuración de moneda:** Las compañías ahora tienen una **moneda asociada** configurable desde el panel de administración. El formulario de compañías incluye un selector de moneda y el campo se persiste en base de datos.

### Mejorado

- **Negocios – Permisos de fondeo por rol:** Los roles `ADMIN` y `ASISTENTE_GERENCIA_OPERATIVA` pueden fondear negocios. El rol `AGENTE` (coach) tiene acceso de **solo lectura** al estado de fondeo — el botón muestra "Ver Fondeo" cuando el negocio tiene aportes registrados, y está oculto si no los tiene.
- **Negocios – Plataforma renombrada a Money Strategist:** La interfaz refleja el nombre comercial actualizado del producto.
- **Administración – Gestión de monedas:** Los formularios de creación y edición de compañías permiten asignar la moneda de operación de cada compañía.
- **Permisos – Funciones de rol centralizadas:** Se reemplazaron las verificaciones de rol inline por funciones reutilizables `canFundPayments()` y `canViewPayments()` en la capa de autorización.

### Interno

- Modelo Prisma `AnnualPayment` renombrado a `Payment` (`@@map("payments")`) para generalizar el concepto más allá de la periodicidad anual. Todas las rutas, servicios, mappers y tests actualizados.
- Acción de auditoría renombrada a `BUSINESS_PAYMENT_FUNDED`.
- Cobertura de tests ampliada: ruta `/fondear-aportes` (5 tests) y `AnnualFundingModal` (4 tests).

## [1.0.0-beta.18] - 2026-04-29

### Añadido

- **Negocios – Contratos alfanuméricos:** El campo de contrato en el formulario ahora acepta letras, números y guiones (ej. `CONT-123`), alineando la validación del frontend con la capacidad de la base de datos. Se incluyeron pruebas unitarias para garantizar la validez de este formato.

### Mejorado

- **Negocios – Legibilidad del encabezado:** Se ajustó el color del texto en el banner principal a `primary-foreground` para asegurar un contraste óptimo en modo claro sobre el fondo verde oscuro. Se simplificó el texto del banner para una interfaz más limpia.

## [1.0.0-beta.17] - 2026-04-26

### Añadido

- **Coach – KPIs en Mis negocios:** Tarjetas compactas con indicadores clave para el perfil coach, coherentes con los filtros por **fecha de creación** del negocio cuando defines un rango de fechas.

### Mejorado

- **Negocios – Exportación Excel operativa:** El archivo descargado respeta el **orden y los nombres de columnas** definidos con operación (por ejemplo **Número de Cédula**, **Correo electrónico**, **Teléfono**, **Periodicidad del pago**, bloque **Creación → Emisión → Fondeo**, líderes adicionales después de **Fecha de Fondeo** y cabeceras **Fecha Fondeo Anualidad** por cuota cuando aplica). La columna **Valor de Negocio** sigue exportándose con **formato moneda** en Excel.
- **Coach – Listado y rutas:** Para coach, el listado puede filtrarse por **fecha de creación** en línea con las estadísticas; las exportaciones usan rangos **inclusivos en calendario Bogotá** donde corresponde. La entrada **/dashboard/agente** redirige al listado de negocios y se eliminó la duplicidad en el menú lateral.

### Corregido

- **Negocios:** Eliminado un import no utilizado en la página del listado que podía generar advertencias en el análisis estático.

### Documentación / Interno

- **OpenSpec:** El spec maestro `negocios` incorpora el requerimiento actualizado de exportación Excel operacional; archivado el cambio SDD `excel-negocios-export-columnas` (`openspec/changes/archive/2026-04-26-excel-negocios-export-columnas/`).

## [1.0.0-beta.16] - 2026-04-25

### Añadido

- **Negocios – Exportación a Excel dinámica:** La exportación ahora incluye el campo **Celular** e inserta dinámicamente columnas de **Fecha inicial/final fondeo** al principio del documento si el reporte se generó usando un filtro de rango de fechas, agilizando las revisiones operativas.

### Mejorado

- **Negocios – UI del formulario simplificada:** La interfaz de creación y edición de negocios consolidó el antiguo bloque de "Información de producto" directamente dentro de la sección de negocio, agrupando armónicamente contrato, producto, compañía, plazo y periodicidad.
- **Negocios – Exportación Excel optimizada:** Se eliminaron las columnas "Mes", "Año" y "Es anualidad", limpiando el reporte de datos redundantes. Se implementó parsing robusto de fechas hidratadas para prevenir cierres inesperados en la exportación por inconsistencia de tipos.
- **Negocios – Coherencia de fondeo de anualidades:** Al fondear anualidades, el sistema actualiza incondicionalmente el campo de anclaje (`dateAnchored`) del negocio padre para garantizar que la transición al estado FONDEADO mantenga una traza temporal inmutable a nivel de dominio.

### Documentación / Interno

- **Pruebas y SDD:** La suite de pruebas fue completamente adaptada (169 tests pasando), cubriendo inserción dinámica de columnas, transacciones directas a nivel de Prisma en el proceso de fondeo y validaciones unitarias en la exportación. Delta specs sincronizados y archivada la propuesta SDD `2026-04-25-ajustes-negocio-excel-fondeo`.

## [1.0.0-beta.15] - 2026-04-23

### Añadido

- **Negocios – Exportación a Excel mejorada:** Rediseño completo del formato de exportación para análisis de liquidación. El archivo incluye cabeceras profesionales con fondo azul claro y texto en negrita, así como ajuste automático del ancho de todas las columnas según el contenido.
- **Negocios – Campos de tiempo y moneda:** Se añadieron las columnas **Mes** (nombre completo en español) y **Año** calculados desde la emisión. La columna **Valor negocio** cuenta ahora con formato nativo de moneda (`$#,##0.00`).

### Mejorado

- **Negocios – Orden Operativo:** Reordenamiento y renombramiento de las 22 columnas críticas (Agente, Nombres y Apellidos del Cliente, etc.) para cumplir con el flujo de auditoría operativa y liquidación manual.

### Documentación / Interno

- **OpenSpec:** Sincronización de requerimientos de exportación avanzada en el spec maestro de `negocios` y archivo completo del cambio `excel-negocios-export` con todas sus verificaciones.

## [1.0.0-beta.14] - 2026-04-22

### Añadido

- **Base de Datos – Carga Inicial (Seed):** Refactorizado el proceso de carga maestro (`prisma db seed`). El sistema ya no inserta datos parciales harcodeados, sino que pobla dinámicamente todo el portafolio de la operación basándose en el catálogo documentado (8 compañías y decenas de productos financieros asociados listos para operar).
- **Carga Inicial – Trazabilidad Dinámica:** Garantizada la integridad relacional (*Foreign Keys*) mediante un motor de *lookup asíncrono* que asocia nativamente los productos a la empresa propietaria sin importar el desfasaje de IDs autoincrementales.

### Documentación / Interno

- **OpenSpec:** Desarrolladas e integradas las especificaciones de comportamiento `seed-pipeline`; cerrado y archivado de manera completa el registro `register-companies-products-csv`.

## [1.0.0-beta.13] - 2026-04-22

### Añadido

- **Crear negocio – Comisión por porcentaje (PPC):** Si no hay reglas específicas de comisión para producto, origen o categoría, el sistema puede usar una **configuración global porcentual** cuando exista, para no bloquear la creación por falta de una distribución puntual.

### Mejorado

- **Listado de negocios:** El orden por defecto es por **fecha de creación** (más recientes primero), con **desempate estable** por identificador del negocio. En la tabla puedes **ordenar** por **Estado** y **Fecha creación**.
- **Fondeo directo:** Antes de **Fondear** un negocio **Emitido** cuando aplica el flujo sin anualidades, aparece un **diálogo de confirmación** y, al confirmar, un **indicador de carga** mientras se procesa. Si el negocio tiene **cuotas anuales** en juego, este paso no interrumpe el **flujo de fondeo por anualidades**.

### Corregido

- **Categoría del agente:** La categoría queda **alineada con la categoría asignada** al negocio cuando corresponde ese mapeo.

### Documentación / Interno

- **OpenSpec:** Requisitos de PPC global, orden de listado y UX de fondeo incorporados al spec `negocios`; change **default-global-ppc-for-business-create** archivado (`openspec/changes/archive/2026-04-22-default-global-ppc-for-business-create/`).

## [1.0.0-beta.12] - 2026-04-21

### Añadido

- **Negocios – Estado Liquidado:** En el **listado principal** ves el estado **Liquidado** con la **misma presentación** que en el detalle (modal), gracias al badge compartido. El filtro de estado incluye **Liquidado**; la opción heredada **Comisionando** **no** aparece en el desplegable renovado (si la API aún devuelve ese valor legacy, la fila sigue mostrando un **indicador de estado** sin quedar en blanco).

### Mejorado

- **Listado de negocios:** La columna de creación se llama **Fecha creación** para distinguirla de emisión y fondeo; el mapeo desde la API evita etiquetar por error como **Cancelado** estados válidos o aún no contemplados en la UI.
- **Liquidación de comisiones:** Los negocios vinculados pasan a **Liquidado** solo cuando ya estaban **Fondeados**, en línea con el flujo **Emitido → Fondeado → Liquidado** (no se promueve desde **Emitido** en ese paso).

### Documentación / Interno

- **Base de datos:** Migración Prisma que alinea el valor legacy **COMISIONANDO** con **LIQUIDADO** en el enum de estado del negocio; en cada entorno aplicar **`prisma migrate deploy`** antes de usar esta versión en producción.
- **OpenSpec:** Specs principales `negocios` y `pre-liquidacion` actualizados; change **2026-04-20-h6-listado-negocios-mejorado** archivado (`openspec/changes/archive/2026-04-21-2026-04-20-h6-listado-negocios-mejorado/`) con verificación y reporte de archivo.

## [1.0.0-beta.11] - 2026-04-18

### Añadido

- **Negocios – Exportar a Excel:** **Administrador**, **Asistente de gerencia operativa** y **Analista de soporte** pueden descargar un archivo **.xlsx** con el mismo conjunto de negocios que resulta de aplicar **búsqueda**, **estado** y **rango de fechas** en el listado. El archivo incluye identificador y contrato, estado, fechas de creación, emisión y fondeo, datos de cliente y producto, periodicidad y anualidades, categoría del coach, **cadena de líderes** y **fechas de fondeo por cuota anual** cuando aplica. Si el resultado supera **5 000 filas**, la exportación se rechaza con un mensaje claro en lugar de generar un archivo desmedido.

### Mejorado

- **Negocios – Fechas:** Las fechas relevantes en listado y export usan una zona horaria consistente (**América/Bogotá**) para una lectura uniforme.

### Documentación / Interno

- **OpenSpec:** Requisitos H5 de exportación Excel incorporados al spec `negocios`; change **2026-04-18-h5-reporte-excel-negocios** archivado (`openspec/changes/archive/2026-04-18-h5-reporte-excel-negocios/`) con diseño, tareas, verificación e informe de archivo.

## [1.0.0-beta.10] - 2026-04-18

### Añadido

- **Negocios – Fondeo por cuotas anuales:** Si el negocio tiene **anualidades** con al menos una cuota **sin fondear**, en el listado aparece **Fondear anualidad** (también cuando el padre ya está **Fondeado** y aún quedan cuotas pendientes). El **modal** muestra el **contrato en el título**, lista **todas las cuotas**, las ya fondeadas con **fecha de anclaje**, y permite elegir cuotas pendientes antes de confirmar. La confirmación usa una **API dedicada** para anualidades y queda **auditada**. El botón **Fondear** directo solo aplica cuando **no hay filas de anualidad**; si existen, el fondeo general por la ruta antigua queda **bloqueado** para evitar inconsistencias.

### Documentación / Interno

- **OpenSpec:** Requisitos HU4 de fondeo por anualidades incorporados al spec `negocios`; change **hu4-fondeo-anualidades** archivado (`openspec/changes/archive/2026-04-18-2026-04-18-hu4-fondeo-anualidades/`) con informe de verificación.

## [1.0.0-beta.9] - 2026-04-18

### Añadido

- **Negocios – Fondeo sin anualidades:** En el listado, si el negocio está **Emitido** y **no tiene anualidades** registradas, aparece la acción **Fondear** para **Agente** (sus negocios), **Asistente gerencia operativa** y **Administrador**. Al confirmar, el estado pasa a **Fondeado**, se guarda la **fecha de anclaje** y queda registrado en auditoría.
- **Listado de negocios:** Puedes **filtrar por estado Fondeado** y ver el **badge Fondeado** (estilo distintivo) en la tabla y vistas coherentes con el estado.

### Mejorado

- **Estados del negocio:** La definición canónica de estados (`BUSINESS_STATUS`) queda centralizada para evitar discrepancias entre pantallas y API.

### Documentación / Interno

- **Base de datos:** Columna `date_anchored` en `business` y migración Prisma; en cada entorno aplicar **`prisma migrate deploy`** antes de usar esta versión en producción.
- **OpenSpec:** Requisitos de fondeo sin anualidades y SSOT de estados incorporados al spec `negocios`; change **hu3-fondeo-sin-anualidades** archivado (`openspec/changes/archive/2026-04-18-hu3-fondeo-sin-anualidades/`) con informe de verificación.

## [1.0.0-beta.8] - 2026-04-17

### Añadido

- **Negocios – Fecha de emisión:** Al registrar el **contrato** por primera vez (ya sea en la creación del negocio o al pasar de **Venta efectuada** a **Emitido**), el sistema guarda la **fecha de emisión** para trazabilidad y reportes. Si solo se **corrige el número de contrato** cuando el negocio ya está emitido, la fecha de emisión **no se modifica**.

### Documentación / Interno

- **Base de datos:** Columna `date_issued` en `business` y migración Prisma; en cada entorno aplicar **`prisma migrate deploy`** antes de usar esta versión en producción.
- **OpenSpec:** Requisitos de fecha de emisión incorporados al spec `negocios`; change **business-date-issued-hu2** archivado con artefactos SDD y verificación.

## [1.0.0-beta.7] - 2026-04-17

### Añadido

- **Negocios – Periodicidad Anual:** Al crear un negocio con periodicidad de compra **Anual** y un **plazo** entre **1 y 25**, el sistema **registra en la base de datos** una fila de anualidad por cada año de plazo (índices 1…n), en estado inicial **sin fondear** y **sin fecha de fondeo** hasta un proceso posterior. En este caso el plazo **es obligatorio**; la regla de **Venta efectuada** sin contrato al crear se mantiene.

### Mejorado

- **Plazo del negocio:** Tope **máximo 25** (años) alineado entre formulario y validación en servidor, coherente con el registro de anualidades.
- **Contrato (rezagos):** Texto de ayuda más claro en la búsqueda de contrato y forma de **vaciar** la selección sin quedar anclado al valor anterior.

### Documentación / Interno

- **Base de datos:** Tabla `annual_payment` y migración Prisma; en cada entorno aplicar **`prisma migrate deploy`**.
- **OpenSpec:** Requisitos de anualidades al crear negocio en el spec `negocios`; change **annual-payment-rows-on-create-h1** archivado con informe de verificación.
- **PRDs:** Documentos de configuración de comisiones movidos a `PRDs/configuration-distribution/`; borrador de reporte de negocios en `PRDs/bussines-report/`.

## [1.0.0-beta.6] - 2026-04-15

### Añadido

- **Asistente en dos pasos** para el flujo **configuración de producto → distribución de comisiones**: siempre ves en qué paso estás (indicador con “Paso 1 de 2” / “Paso 2 de 2”).
- **Tras crear una configuración nueva**, la app te lleva al **formulario de distribución** usando el **código** de la configuración (ruta por código), para seguir sin buscar la fila a mano.
- **Columna Distribución** en el listado de configuraciones de producto: muestra si la distribución está **pendiente** o **configurada** y un enlace **Continuar configuración** cuando aún falta completarla.

### Mejorado

- El control **Agregar categoría** en la pantalla de distribución se ve claramente como **acción principal** (no solo como texto suelto).
- **Migas de pan:** los códigos con caracteres especiales (por ejemplo `+`) se leen bien en la ruta y los enlaces intermedios llevan a páginas válidas.

### Corregido

- **Primera distribución tras crear la configuración:** ya no aparece el error por “distribución activa duplicada”; se **actualiza** la regla inicial que crea el sistema en lugar de intentar crear otra.
- **Enlaces y redirecciones con código en la URL** (segmentos codificados como `%2B`): la configuración se encuentra correctamente al abrir el flujo desde el listado o tras guardar.
- **Redirección inmediata** tras guardar la configuración: es fiable porque usa el resultado devuelto al guardar, no solo el estado async en segundo plano.

### Documentación / Interno

- Requisitos **RF-11** incorporados al spec principal `product-configuration`; cambio OpenSpec **archivado** (`openspec/changes/archive/2026-04-14-rf-11-wizard-post-crear-a/`) con informe de verificación.

## [1.0.0-beta.5] - 2026-04-14

### Corregido

- **RF-11 Wizard (post–crear configuración):** Tras crear la configuración de producto, la redirección al **paso 2** (`/config-distribucion-comisiones/{código}/reglas/crear`) se hace de forma fiable en el **submit** usando el valor devuelto por la mutación (`createProductConfiguration` → `ProductConfiguration | null`), en lugar de depender solo de `useEffect` sobre el estado async.
- **Distribución – “Continuar configuración”:** Al completar la distribución no se intenta crear un segundo `ProductPercentageCommission` (rechazado si ya hay uno activo); se detecta la regla semilla sin líneas de categoría y el formulario pasa a **editar** (actualizar la existente).
- **Resolución por código en URL:** Normalización con `decodeURIComponent` en cliente y en `GET /api/product-configurations/by-code/[code]` para códigos con caracteres codificados (p. ej. `+` como `%2B`), evitando “Configuración no encontrada” tras redirección.
- **Migas de pan:** Las etiquetas muestran el código decodificado y los enlaces usan segmentos codificados correctamente; etiquetas amigables para rutas de configuración de distribución y reglas.

### Mejorado

- **Configuración de producto – Listado:** La tabla compartida (configuración de producto y vista de distribución de comisiones que reutiliza el mismo listado) **ya no muestra** la columna **Distribución para nuevos negocios**. La asignación de la distribución para nuevos negocios sigue haciéndose en los flujos de edición/asignación (B/C); solo se simplifica lo que ves en el listado.

### Documentación / Interno

- **OpenSpec:** Requisito RF-09 en el spec principal `product-configuration`; change `rf-09-remove-list-column-nuevos-negocios` archivado con informe de verificación.
- **OpenSpec (RF-11):** Change `rf-11-wizard-post-crear-a` — `tasks.md` actualizado (fase 3 redirección a `/reglas/crear`, fase 7 seguimiento); `exploration.md` con tabla de implementación aplicada.

## [1.0.0-beta.4] - 2026-04-13

### Añadido

- **Administración – Config. distribución de comisiones:** Nuevo acceso en el menú lateral (dentro de **Administración**) que abre un flujo donde **identificas la configuración de producto por código** antes de ver la tabla de reglas de distribución. Incluye búsqueda, selección y **enlaces directos** que conservan el código en la URL cuando es válido.
- **Reglas (flujo por código):** Botón **Buscar nueva distribución** para volver a la pantalla de búsqueda y elegir otra configuración sin perder el contexto del flujo nuevo.
- **Tabla de reglas de distribución:** Las acciones **Editar** y **Asignar a nuevos negocios** quedan **visibles en cada fila**, sin tener que abrir primero el menú de tres puntos.

### Mejorado

- **Configuración de producto:** El enlace principal **Distribución de Comisión** en el listado lleva al **flujo por código** (ruta nueva del dashboard). Si una fila no tiene código usable (datos heredados), el enlace te dirige a la **entrada de búsqueda** para localizar la configuración correctamente.
- **Barra lateral y tooltips:** Ajustes en submenús anidados y en tooltips para que textos largos (por ejemplo nombres de secciones) se lean bien y no queden recortados de forma confusa.
- **Carga de archivos:** Navegación más clara, pestañas tipo tarjeta y etiquetas alineadas con el flujo de archivos e historial.

### Compatibilidad

- Siguen disponibles las URLs **por id** del flujo clásico (`…/distribucion-comisiones/[id]/…`) para favoritos y enlaces antiguos; el listado de configuración de producto ya no usa ese camino como acción principal hacia la distribución.

### Documentación / Interno

- **Base de datos:** Migración Prisma que asegura **código obligatorio y único** en cada configuración de producto. En cada entorno hay que aplicar **`prisma migrate deploy`** (ver runbook del proyecto si hubo estados intermedios de despliegue).
- **API:** Documentado `GET /api/product-configurations/by-code/[code]` para resolución por código exacto.
- **OpenSpec:** Requisitos RF-06 / RF-07 integrados en los specs principales (`product-configuration`, `navigation`, `commission-distribution-ui`); cambio OpenSpec correspondiente archivado.
- **Pruebas:** Scripts de Vitest unificados con la bandera `--run` en los comandos `npm` de test; limpieza menor en mocks de integración.

## [1.0.0-beta.3] - 2026-04-12

### Añadido

- **Distribución de comisiones – Cartera por regla:** Cada regla puede indicar si aplica **cartera**. Si está activa, verás un **porcentaje de cartera** por línea de categoría, con validación de rango **1 %–100 %** y **suma máxima 100 %** entre líneas, independiente de la suma de distribución.
- **Persistencia al desactivar cartera:** Si quitas la marca de cartera y guardas, los porcentajes de cartera guardados **no se borran**; vuelven a mostrarse cuando vuelves a activar la opción.
- **Tabla de reglas – Columna Cartera:** Cuando al menos una regla usa cartera, el listado muestra la columna **Cartera** con el mismo criterio de formato que el resto de porcentajes en lectura.

### Mejorado

- **Validación al salir del campo (RF-02):** En porcentajes de **distribución** y, si la cartera está visible, en **cartera**, los errores por valor vacío o fuera de rango pueden mostrarse al **perder el foco**, sin depender solo del botón guardar.
- **Lista de reglas:** Un solo **buscador** integrado en la tabla (menos controles duplicados en la página).
- **Formulario de regla:** El interruptor de cartera queda dentro del bloque de categorías; el pie de totales **alinea** columnas de porcentaje y cartera con las filas.
- **Porcentajes en lectura:** Presentación más limpia, evitando ceros decimales finales innecesarios cuando el valor es entero o ya está redondeado de forma natural.

### Documentación / Interno

- **Prisma:** Migración para `hasPortfolio` en configuración producto–categoría; ampliación de decimales en porcentajes por categoría; seeds ajustados para que las fracciones sumen coherencia con la UI.
- **API:** Documentación y contratos de creación/edición de reglas con cartera y fusión en servidor al desactivar el flag.
- **OpenSpec:** Cambio `explore-rf-03-hasportfolio` archivado; spec principal `commission-distribution-ui` actualizada (RF-03, RF-04, cartera).

## [1.0.0-beta.2] - 2026-04-10

### Añadido

- **Distribución de comisiones – Campo de porcentaje dedicado:** Al editar categorías en una regla, el porcentaje usa un control con el símbolo **%** como adorno (no mezclado con el número), entrada tipo texto con teclado decimal, y **pegado normalizado** para formatos como `12,5 %` o `12.5%` según el locale de la aplicación. Mientras escribes se permiten hasta **cuatro** decimales; si borras todo el campo, **no** se fuerza el valor a cero antes de validar.
- **Porcentajes en lectura unificados:** Las vistas que muestran porcentajes de distribución (tabla de reglas, totales del formulario, **pre-liquidación** vía `formatPct`, **histórico de liquidaciones**) comparten la misma regla de presentación: separadores según locale, precisión coherente con el valor del servidor (sin redondeo caprichoso en cliente) y entero mostrado con relleno de decimales en pantalla según RF-01.

### Mejorado

- **Distribución de comisiones – Validación RF-05:** Cada línea de categoría exige un porcentaje entre **1 % y 100 %**; la **suma** de todas las líneas no puede superar **100 %**. Los errores son explícitos en el formulario, con indicación en vivo cuando el total se excede y mensajes al intentar guardar si algo falla.
- **Distribución de comisiones – Precisión al cargar reglas:** El mapeo desde Prisma usa aritmética **Decimal** al pasar de fracción al modelo de dominio (0–100), evitando la pérdida de precisión que imponía un redondeo fijo a dos decimales.
- **Distribución de comisiones – Formulario y edición:** Errores de campo más visibles (estilo destructivo, icono, `role="alert"` donde aplica, `aria-invalid` en select y campo de porcentaje); filas de categoría con separación y altura consistentes; página **editar regla** sin título duplicado; skeleton alineado al formulario sin columna “Activo” en el flujo de lista.

### Documentación / Interno

- **PRDs:** Documentos de requisitos de producto para configuración de comisiones y tema MAPA (UX / configuración producto-comisión) en `PRDs/`.
- **OpenSpec:** Change `rf-01-presentacion-porcentajes` con propuesta, diseño, tareas, especificaciones delta (`ui-system`, `commission-distribution-ui`), exploración e informe de verificación SDD.
- **Repositorio:** Entrada en `.gitignore` para la carpeta `.atl/` (artefactos locales de agentes).

## [1.0.0-beta.1] - 2026-04-05

### Añadido

- **Pre-liquidación – Comisión tras descuento (impuesto):** El sistema guarda el monto de comisión distribuida **después** del descuento fiscal y calcula el clawback sobre esa base. En el modal de detalle de distribución verás la columna **Com. Dist. con descuento** y totales coherentes con cada fila.
- **Negocios – Edición de contrato:** Al abrir **Editar**, los datos del negocio se obtienen de forma estable desde el servidor (API y capa de datos dedicada), reduciendo desfases respecto al listado.

### Mejorado

- **Carga de archivos – Números en Excel:** Lectura y validación de importes más tolerantes a formatos regionales y separadores decimales, con reglas documentadas en OpenSpec.
- **UI – Tablas con totales:** El pie de totales del `DataTable` comparte la misma tabla que el cuerpo, alineando columnas e importes (por ejemplo en modales con desglose).

### Documentación / Interno

- **Base de datos:** Migración Prisma para `value_commission_with_discount` en distribuciones de comisión.
- **API y especificaciones:** Ajustes en `AGENTS.md`, modo de artefactos SDD Engram en OpenSpec y ampliación del spec de carga de archivos.
- **Pruebas:** Cobertura ampliada en pre-liquidación (helper de montos, servicio, modal), negocios (edición, API), roles y ruta de distribución.

## [1.0.0-beta.0] - 2026-03-31

Primera versión **beta** pública del ciclo 1.x: refuerza la pre-liquidación, la liquidación parcial y el estado de negocio **Comisionando**.

### Añadido

- **Pre-liquidación – Liquidar de extremo a extremo:** Al confirmar la liquidación, el sistema actualiza en una sola operación las comisiones y sus distribuciones, aplica retenciones tipo póliza (clawback) cuando corresponde, actualiza saldos de clawback por usuario y deja trazabilidad coherente con la liquidación real.
- **Pre-liquidación – Rezagar con trazabilidad de usuario:** El rezago registra que la acción fue iniciada por el operador (`isLagByUser` y fecha asociada), además del estado rezagado y la marca de rezago ya existentes.
- **Negocios – Estado Comisionando:** Nuevo estado de negocio tras liquidar desde pre-liquidación cuando el negocio estaba **Emitido**; visible en tipos, validación de API y badge en la interfaz.
- **Pre-liquidación – Archivo completado solo cuando la cola está vacía:** Un archivo pasa a **Completado** únicamente cuando no quedan comisiones pendientes de sincronizar **ni** en cola de pre-liquidación, evitando cerrar el archivo mientras aún hay registros por liquidar.

### Mejorado

- **Negocios – Lista principal:** Las filas en estado **Comisionando** ya no se muestran por error como canceladas; el badge usa el estilo azul acorde al resto del producto.
- **Pre-liquidación – Detalle sin registros:** Si el archivo no tiene comisiones pre-liquidadas, se ofrece un acceso directo a **Liquidaciones** para continuar el flujo operativo.

### Corregido

- **Modales compartidos:** Ajustes de accesibilidad y comportamiento del modal base usado en confirmaciones de liquidar y rezagar (enfoque y cierre coherentes).

### Documentación / Interno

- **Prisma:** Migración para campos de rezago por usuario en comisiones de liquidación; diagrama **ERD** alineado con el schema actual.
- **OpenSpec:** Requisitos de pre-liquidación y negocios incorporados al catálogo principal; change `liquidar-rezagar-preliquidacion` archivado con informe de verificación.
- **Pruebas:** Cobertura ampliada en servicio de pre-liquidación, rutas API de liquidar/rezagar y badge de estado en negocios.

## [0.2.9] - 2026-03-31

### Añadido

- **Administración – Maestro de Categorías:** Implementación completa del CRUD para categorías desde el dashboard administrativo. Incluye soporte para el nuevo modelo de beneficiario fijo (`FIXED_BENEFICIARY`) y configuración de productos vinculada.
- **Administración – Maestro de Orígenes:** Nueva sección para gestionar orígenes de póliza (`ClientOrigin`), permitiendo crear, editar y listar orígenes de clientes de forma independiente en `/dashboard/admin/origins`.
- **UI – DataTable Premium:** Rediseño y mejora del componente de tablas compartidas, con soporte nativo para filtros de tipo Combobox, estados de carga (Skeleton) y diseño optimizado para interfaces administrativas.
- **Categorías – API de Tipos:** Nuevo endpoint para consultar tipos de categorías disponibles, facilitando la integración con formularios dinámicos.

### Mejorado

- **Calidad de Código – Tipado estricto:** Eliminación completa de `any` en servicios críticos como `pre-liquidacion.service.ts` y componentes de tablas, asegurando la integridad de los datos mediante interfaces reales de Prisma y TypeScript.
- **Linting – Resolución de advertencias:** Limpieza exhaustiva de ~25 problemas de ESLint en múltiples features, incluyendo imports duplicados, dependencias de hooks faltantes y variables no utilizadas.

### Interno

- **Pruebas:** Sincronización de mocks y fixtures para categorías, alineando las pruebas unitarias con los nuevos esquemas de validación Zod.
- **Infraestructura:** Actualización de seeds para incluir orígenes por defecto y categorías base.

## [0.2.8] - 2026-03-29

### Añadido

- **Carga de archivos – Pestañas "Archivos" e "Historial":** La pantalla de carga divide el listado en dos contextos: archivos en proceso (`LOAD` / `PRE-SETTLED`) en "Archivos" y cargas finalizadas (`COMPLETED`) en "Historial", cada uno con su propio filtro de estados en el servidor.
- **Carga de archivos – Tarjetas y badges de estado:** Cada fila usa componentes dedicados con etiquetas y colores claros; los estados "Sincronizado" y "Pre-liquidado" se distinguen bien entre sí.
- **Carga de archivos – API multi-estado:** El listado puede consultarse con varios estados a la vez (`status` como lista separada por comas), manteniendo compatibilidad con un solo valor.

### Mejorado

- **Carga de archivos – Historial:** Navegación interna con el enrutador de la app (sin recargar la página completa), textos de botones más claros (por ejemplo "Ir a Pre-liquidación", "Cargar otro archivo") y mejor contraste en acciones como eliminar.
- **Carga de archivos – Errores de red:** Si el historial recibe una respuesta que no es JSON (por ejemplo una página de error HTML), se muestra un mensaje entendible en lugar de un error técnico de parseo.

### Documentación / Interno

- OpenSpec: especificación `carga-archivos` en el catálogo principal y archivo del change `file-sync-ux-improvement` con informe de verificación.

## [0.2.7] - 2026-03-28

### Añadido

- **Liquidaciones – Histórico:** Vista de histórico de liquidaciones con filtros por mes o rango de fechas y desglose por comisión liquidada (integración desde historial de desarrollo).
- **Pre-liquidación – Beneficiario por categoría:** Resolución de beneficiario según `beneficiaryMode` de la categoría (`UPLINE_CHAIN` o `FIXED_BENEFICIARY`), persistencia de `idBeneficiaryUser` en distribuciones, alineación de clawback con el beneficiario de la fila y respuesta con `registrosConError` cuando falla la configuración.
- **Pre-liquidación – Errores de configuración en UI:** Modal que lista registros omitidos tras preliquidar, con código de categoría y motivo.
- **Categorías – Modo beneficiario:** Formulario y API de categorías permiten fijar modo de beneficiario y usuario fijo cuando aplica; validación cruzada en esquemas Zod.
- **OpenSpec – Especificaciones:** Nuevo spec principal `categories` y actualización de `pre-liquidación` (archivado el cambio `preliquidacion-beneficiario-categoria-clawback`).

### Corregido

- **Pre-liquidación – Modal de distribución:** Textos de resumen y tabla alineados con comisión (`Valor Comisión`, `Com. Dist.`).

### Interno

- Integración de rama `develop` (liquidaciones, seeds, migraciones Prisma, ajustes de comisión y UI).
- Eliminación de helpers no usados en el plugin OpenCode `background-agents`.
- Pruebas unitarias alineadas con códigos de error del resolvedor y etiquetas de acciones en tabla de registros.

## [0.2.6] - 2026-03-24

### Añadido

- **Negocios – Cambio de origen con reliquidación:** Implementado aviso de confirmación al cambiar el origen del cliente en negocios con estado `EMITIDO`. Al confirmar, el sistema reliquida atómicamente todas las comisiones asociadas en estado `PRE-SETTLED`, aplicando la nueva configuración de porcentajes del origen seleccionado.
- **Pre-liquidación – Estandarización de cálculos:** El motor de cálculo ahora utiliza `commissionValue` como fuente única de verdad para la base de comisión bruta, garantizando consistencia entre la UI y los registros de base de datos.
- **Pre-liquidación – Desglose de distribución mejorado:** El modal de detalle ahora incluye la "Comisión Total" en la cabecera y muestra las columnas descriptivas de "% Dist. de Comisión" y desglose de descuentos de forma organizada.

### Corregido

- **Pre-liquidación – Integridad de cálculos:** Se corrigió la lógica de descuentos para que el Clawback se reste de forma independiente de los descuentos de comisión distribuidos, asegurando que la comisión final sea exacta (`Bruta - Descuento - Clawback`).
- **Infraestructura – Certificados SSL (servidor):** El script `setup-ssl.sh` ya no usa un flag de Certbot no soportado en versiones 1.x de los droplets, de modo que la emisión inicial del certificado Let's Encrypt vuelve a completarse sin error.

### Interno

- **Despliegue – Scripts SSL:** Los workflows de QA y producción copian al servidor `setup-ssl.sh` junto con `ssl-renew.sh` y dejan ambos ejecutables, alineado con la renovación automática por cron.
- **Documentación – Dominio y SSL:** En la guía de dominio y HTTPS se documentó cómo subir `setup-ssl.sh` manualmente cuando el servidor aún no lo tiene tras un deploy antiguo.
- **Pruebas:** Restaurada la suite técnica con 100% de éxito (1441 tests), incluyendo nuevos casos para reliquidación atómica y validación de tipos estrictos en mocks.
- **Arquitectura:** Archivados artefactos SDD del cambio `recalculate-commission-origin-change` y sincronización de especificaciones en `openspec/`.

## [0.2.5] - 2026-03-21

### Añadido

- **Pre-liquidación – Modal de distribución de comisión:** Desde la tabla de registros pre-liquidados, cada fila tiene un botón "Detalle de Distribución" que abre un modal con el desglose completo por usuario: comisión bruta, descuentos, porcentaje de clawback, tipo de retención y comisión final (en negrita).

## [0.2.4] - 2026-03-17

### Corregido

- **Pre-liquidación – Archivos PRE-SETTLED ahora visibles en el módulo:** Los archivos que ya fueron pre-liquidados ahora aparecen correctamente en la vista principal del módulo de Pre-liquidación, sin necesidad de navegar a otra pestaña.
- **Pre-liquidación – Estado del archivo actualizado correctamente:** Al ejecutar la pre-liquidación, el archivo queda marcado como `PRE-SETTLED` de forma inmediata e incondicional, eliminando casos en que el estado quedaba en `LOAD` sin reflejar el procesamiento realizado.
- **Carga de archivos – Bloqueo de sincronización global por período pre-liquidado:** Si un período ya fue pre-liquidado por cualquier usuario, ningún otro usuario puede sincronizar registros en ese mismo período. El sistema retorna 409 para todos los intentos sobre períodos en estado `PRE-SETTLED`.
- **Pre-liquidación – Botón "IR a PRELIQUIDACIÓN" navega al archivo correcto:** El botón en el historial de carga ahora redirige directamente al detalle del archivo pre-liquidado en lugar de la página principal del módulo.
- **Pre-liquidación – Etiqueta de estado corregida:** El badge del estado pre-liquidado ahora muestra `Pre-liquidado` en lugar de `PRE-LIQUIDADO`.

### Mejorado

- **Pre-liquidación – Vista simplificada:** Se eliminó la pestaña "Histórico". Los archivos pre-liquidados se muestran directamente en la vista principal del módulo.

## [0.2.3] - 2026-03-17

### Añadido

- **Pre-liquidación – Botón "Preliquidar" en sincronización:** Los usuarios con rol Administrador o Asistente Operativo de Gerencia ahora pueden iniciar el proceso de pre-liquidación directamente desde el historial de archivos sincronizados, sin necesidad de ir al módulo de pre-liquidación.
- **Pre-liquidación – Listado de comisiones PRE-SETTLED:** La página de detalle de pre-liquidación muestra ahora únicamente las comisiones en estado pre-liquidado, permitiendo validar los cálculos de distribución comisional por archivo.
- **Pre-liquidación – Ruta de consulta de registros pre-liquidados:** Nueva ruta `GET /api/pre-liquidacion/pre-settled/[fileId]` que retorna las comisiones pre-liquidadas de un archivo específico.

### Mejorado

- **Pre-liquidación – Tab "Pre-liquidar" muestra solo archivos pre-liquidados:** El listado filtra únicamente archivos que ya tienen registros en estado PRE-SETTLED, eliminando la confusión con archivos pendientes de sincronización.
- **Pre-liquidación – Indicadores actualizados:** El stat "Total Registros" refleja el conteo de registros pre-liquidados; se eliminó la tarjeta "Sincronizados" y el botón "Limpiar" para simplificar la interfaz.
- **Pre-liquidación – Columna "Cantidad de Registros":** Ahora muestra el número de registros en estado PRE-SETTLED por archivo.
- **Seguridad – Control de acceso en pre-liquidación:** El endpoint de procesamiento de pre-liquidación ahora valida que el usuario tenga los permisos correspondientes (ADMIN o ASISTENTE_GERENCIA_OPERATIVA), retornando 403 para roles no autorizados.

## [0.2.2] - 2026-03-16

### Añadido

- **Carga de archivos – Control por período:** Cada importación queda asociada a un mes y año. El sistema reutiliza la importación existente si ya hay una en estado LOAD para el mismo período, y bloquea la sincronización si el período ya fue liquidado (COMPLETED).
- **Carga de archivos – Nombres estandarizados:** Los archivos ahora siguen el formato `SINCRONIZACION-TIPO-MES-AÑO` (ej. `SINCRONIZACION-POLIZA-MARZO-2026`) para facilitar su identificación.
- **Carga de archivos – Resolución de errores en re-sincronización:** Al volver a sincronizar un archivo, los registros que anteriormente fallaron y ahora se procesan correctamente quedan marcados como resueltos en el historial de errores.
- **Carga de archivos – Filtros de historial por período:** Los filtros de fecha fueron reemplazados por selectores de Mes y Año para buscar directamente por período de sincronización.

### Mejorado

- **Carga de archivos – Resumen de sincronización por sesión:** El resumen de contadores (Sincronizados, Errores, No sincronizados, Rezagados) que se muestra al finalizar una carga ahora refleja únicamente los registros procesados en esa sesión, no el acumulado histórico del archivo.
- **Carga de archivos – Historial filtrado por defecto:** El historial muestra únicamente archivos en estado Cargado (LOAD) y Completado (COMPLETED), ocultando estados intermedios de procesamiento.
- **Carga de archivos – Indicadores contextuales:** Se añadió una nota en el resumen de sincronización aclarando que los contadores corresponden a la sesión actual, y una nota en el historial indicando que los valores son el acumulado de todas las sincronizaciones del archivo.

### Corregido

- **Carga de archivos – Contadores acumulados en resumen:** Al terminar la sincronización, los contadores mostraban el total histórico del archivo en lugar de los registros de la sesión actual.

## [0.2.1] - 2026-03-11

### Añadido

- **Administrador:** Integradas documentación y directrices estructuradas para orquestador SDD, y se mejoró la visibilidad del modelo de archivos en el área de administración.
- **Pre-liquidación:** La creación histórica del desglose de *Clawback* fue condicionado al flujo de la comisión, refinando la trazabilidad.

### Mejorado / Refactorizado

- **Pre-liquidación:** Extracción completa de las operaciones al balance del asesor (`ClawbackBalance`) durante la pre-liquidación; estas actualizaciones ahora quedarán delegadas exclusivamente al paso de liquidación para prevenir desincronizaciones de saldos totales.

## [0.2.0] - 2026-03-10

### Añadido

- **Administración – Descuentos de comisión:** Nueva sección en Administración para gestionar descuentos de impuesto y clawback. Permite crear descuentos (nombre, tipo, porcentaje), ver listado con estado activo/inactivo, inactivar descuentos y consultar KPIs del impuesto y clawback activos. Los datos se persisten en la base de datos y se auditan las creaciones.
- **Carga de archivos – Lectura UTF-8 y eliminación:** Lectura de archivos CSV en UTF-8, búsqueda sin sensibilidad a acentos en pruebas y flujo de eliminación de importaciones (LOAD/ERROR) con pruebas asociadas.
- **Carga de archivos – Vista por estado ampliada:** Eliminación de archivos en historial cuando el estado es LOAD o ERROR; vista por estado con pestañas (Sincronizados, Errores, No sincronizados, Rezagados) y tablas paginadas; botón "Ver detalle" con modal a pantalla completa.
- **Documentación – Reglas de arquitectura:** Reglas siempre aplicadas: las rutas API no deben llamar Prisma (solo servicios de features) y los hooks con llamadas asíncronas deben usar el tipo `AsyncState<T>` del módulo compartido.

### Mejorado

- **Carga de archivos – Vista por estado:** Estabilidad de dependencias en la vista por estado (useMemo) para evitar re-renderizados innecesarios; porcentaje de clawback para Póliza tomado desde la configuración cuando el plan no es CLAW.
- **Carga de archivos – UI de resumen:** Tarjetas de resumen (Sincronizados, Errores, No sincronizados, Rezagados) con colores sólidos e iconos Lucide; formato requerido indicado por separado para Voluntaria y Póliza.
- **Descuentos – Carga de datos:** La API de descuentos serializa correctamente porcentajes y fechas para el cliente; la página de administración muestra un mensaje de error claro cuando falla la carga en lugar de una tabla vacía.

### Corregido

- **Descuentos:** Los datos de descuentos no cargaban en la página de administración por la serialización de tipos Prisma (Decimal, Date); corregido mapeando la respuesta a objetos planos.
- **Vista por estado (carga de archivos):** Advertencia de ESLint por dependencias del `useEffect` resuelta; variable no utilizada eliminada.

### Documentación / Interno

- OpenSpec: change admin-discount (diseño, propuesta, tareas, specs), archivado de changes 005-fix-preliquidation-visibility, refactor-load-file-v2 y unify-admin-domain-logic; specs de commission-discounts, pre-liquidación, unified-entity-management y actualización de load-file-v2.
- SDD/CLAUDE y .cursorrules con directrices del orquestador Spec-Driven Development.
- Pruebas unitarias para descuentos (schemas, servicio, hooks), API inactivate y rutas de descuentos.

## [0.1.0]

### Añadido

- **Carga de archivos – Eliminación en historial:** Se puede eliminar un archivo del historial cuando está en estado **LOAD** o **ERROR**. Los archivos pre-liquidados o liquidados no se pueden eliminar y se muestra un mensaje claro.
- **Carga de archivos – Vista por estado:** Tras cargar un archivo y en el historial se muestran cuatro resúmenes (Sincronizados, Errores, No sincronizados, Rezagados) con pestañas y tablas. Los registros se obtienen con paginación desde el servidor.
- **Carga de archivos – Detalle en historial:** En historial, el botón "Ver detalle" abre un modal a pantalla completa con la misma vista por estado (cuatro cards y cuatro pestañas con tablas).
- **Carga de archivos – Formato requerido:** En la sección de formato requerido de Skandia se indican por separado las columnas para archivos **Voluntaria** y **Póliza**.

### Mejorado

- **Carga de archivos – Consistencia de conteos:** El número de "No sincronizados" que se muestra justo después de subir el archivo coincide con el que aparece en el historial (se usa el valor guardado en el backend).
- **Carga de archivos – Eliminación con errores relacionados:** La eliminación de un archivo del historial funciona correctamente aunque el archivo tenga registros de error asociados; se eliminan primero las dependencias en el orden adecuado.

### Corregido

- Eliminación de archivos en historial cuando el estado era ERROR: ahora se permite eliminar tanto en LOAD como en ERROR.

### Documentación / Interno

- OpenSpec y plan del change refactor-load-file-v2 actualizados (diseño, tareas, especificaciones).
- Pruebas unitarias ampliadas para proceso por lotes (Voluntaria, Póliza, FileImportError, integridad) y validación de estructura Excel.
- Documento de QA para load-file-v2 (`docs/qa-load-file-v2.md`).
