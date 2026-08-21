# Proposal: Manual novedad status management

## Intent

Today a business "novedad" only has two states (`PENDIENTE`, `RESUELTA`), and `RESUELTA` is set automatically when the business moves `VENTA_EFECTUADA → EMITIDO`. Support analysts cannot record where a novedad actually stands (returned to the carrier, declined, waiting, cancelled), and the automatic resolution silently overwrites real-world tracking. This change makes the novedad lifecycle explicit and human-owned.

## Source Requirements (verbatim)

**HU**: Como Analista de Soporte, quiero poder gestionar manualmente el estado de una novedad marcada sobre un negocio (cambiándolo entre Sometido a Devolución, Declinado, Pendiente o Cancelado), y como Money Strategist quiero poder desmarcar una novedad únicamente mientras esté en estado "Nueva", para que el seguimiento de novedades refleje con precisión en qué punto de gestión se encuentra cada una, sin depender de cambios automáticos ligados al estado del negocio.

**CA1: Estado inicial al crear una novedad** — Dado que soy un usuario autenticado Y estoy en el detalle de un negocio en estado "Venta Efectuada" Cuando marco el negocio como "Con Novedad" Entonces el campo "Novedad" del negocio queda establecido en estado "Nueva" Y este valor se refleja inmediatamente en la lista de negocios.

**CA2: El cambio de estado del negocio ya NO afecta automáticamente la novedad** — Dado que un negocio tiene una novedad marcada en estado "Nueva" (o cualquier otro estado) Cuando el Analista de Soporte cambia el estado del negocio de "Venta Efectuada" a "Emitido" Entonces el estado de la novedad permanece exactamente igual a como estaba antes del cambio Y no se dispara ninguna actualización automática sobre el campo "Novedad" y ya no hay estado "Pendiente" (como transición automática — Pendiente pasa a ser solo una opción manual del selector).

**CA3: Analista de Soporte cambia manualmente el estado de la novedad** — Dado que soy un Analista de Soporte autenticado Y estoy en el detalle de un negocio que tiene una novedad en estado "Nueva" Cuando hago clic en el botón "Gestionar novedad" Entonces el sistema despliega un panel/modal "Gestión de Novedad" Y visualizo el estado actual ("Nueva") y un selector con las opciones: Sometido a Devolución, Declinado, Pendiente, Cancelado Cuando hago clic en "Guardar" Entonces el sistema actualiza el campo "Novedad" Y el panel se cierra mostrando una confirmación (ej. "Novedad actualizada correctamente") Y el cambio se refleja de inmediato en el badge del detalle del negocio y en la columna "Novedad" de la lista de negocios.

**CA4: Opciones disponibles para el Analista de Soporte** — Dado que soy un Analista de Soporte gestionando la novedad de un negocio Cuando despliego el selector de estado de la novedad en la vista de negocio Entonces visualizo las opciones: "Sometido a Devolución", "Declinado", "Pendiente", "Cancelado" Y puedo seleccionar cualquiera de ellas independientemente del estado actual de la novedad (excepto "Nueva", que solo se asigna automáticamente en la creación).

**CA5: Money Strategist desmarca la novedad mientras está en "Nueva"** — Dado que soy el agente titular del negocio Y el negocio tiene una novedad en estado "Nueva" Cuando selecciono la opción "Desmarcar Novedad" Entonces el sistema elimina la marca de novedad del negocio Y el campo "Novedad" queda vacío/sin valor en la lista de negocios.

**CA6: Visualización del campo Novedad con los nuevos valores en la lista de negocios** — Dado que existen negocios con novedades en distintos estados (Nueva, Sometido a Devolución, Declinado, Pendiente, Cancelado) Cuando consulto la lista de negocios Entonces la columna "Novedad" muestra el valor correspondiente para cada negocio Y cada valor cuenta con un indicador visual distintivo (color) para diferenciarlos fácilmente.

## Confirmed Business Rules

| # | Rule |
|---|------|
| 1 | Five states: `NUEVA`, `SOMETIDA_DEVOLUCION`, `DECLINADA`, `PENDIENTE`, `CANCELADA`. `NUEVA` is assignable only by MARK, never offered in the selector. |
| 2 | "Gestionar novedad" is allowed for `ANALISTA_SOPORTE` **and** `ADMIN`. |
| 3 | Auto-resolution on `VENTA_EFECTUADA → EMITIDO` is removed entirely, including its `BUSINESS_NOVEDAD_RESOLVED` audit emission. Existing `RESUELTA` rows are backfilled to `NUEVA` by a data script (no schema migration — column stays `VARCHAR(20)`). |
| 4 | Cancelling a business (`/api/negocios/[id]/cancel`) must not touch `novedadStatus`. |
| 5 | MARK keeps its current authorization (authenticated only). UNMARK is gated to `novedadStatus === 'NUEVA'` **and** the owning agent (`business.idUser === currentUser.idUser`). |

## Scope

### In Scope
- Widen `BUSINESS_NOVEDAD_STATUS` to the five states above (longest key `SOMETIDA_DEVOLUCION` = 19 chars, fits `VarChar(20)`).
- New role-gated endpoint `PATCH /api/negocios/[id]/manage-novedad` + feature service + Zod schema, with a new `BUSINESS_NOVEDAD_STATUS_CHANGED` audit action.
- New `BusinessNovedadManageModal` + "Gestionar novedad" trigger (detail page and `BusinessViewModal`), plus `use-manage-novedad` hook using `AsyncState<BusinessEntity>`.
- Remove auto-resolve from `PUT /api/negocios/[id]`; tighten UNMARK; extend `BusinessNovedadBadge` STATUS_CONFIG to five entries.
- Idempotent backfill script `RESUELTA → NUEVA`.
- Update colocated unit/integration tests and `prisma/ERD.md` notes if field semantics change.

### Out of Scope
- Prisma/DB enum or CHECK constraint for `novedadStatus` (stays `VarChar(20)`).
- Novedad status history/timeline table; only `AuditLog` records transitions.
- Free-text reason/comment on status change.
- Notifications or emails on novedad transitions.
- Filtering/sorting the business list by novedad status.
- Changing MARK authorization, or exposing "Gestionar novedad" to `ASISTENTE_GERENCIA_OPERATIVA`/`AGENTE`.
- Repurposing `novedadResolvedAt`; it is left in place, unwritten by the new flow.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `negocios`: novedad lifecycle becomes a five-state, manually managed field; automatic resolution on business-status transition is removed; UNMARK gains owner + `NUEVA` preconditions; a new privileged manual status-change operation is added.

## Approach

Approach 2 from exploration: a **dedicated endpoint per business action**, matching the existing `cancel` / `fondear` / `mark-novedad` convention and the project's mandatory SRP rule. `mark-novedad` keeps the self-service MARK/UNMARK model; `manage-novedad` owns the privileged status editor with its own role check, schema, service function and audit action. Prisma access lives in `src/features/negocios/services/`; the route handles HTTP only.

**Badge palette (CA6)** — extends the existing `bg-{color}-100 / text-{color}-800 / border-{color}-300` convention already used by `BusinessNovedadBadge` and `BusinessStatusBadge`. Each state also carries a distinct lucide icon so colour is never the sole differentiator (WCAG 1.4.1):

| State | Label | Palette | Icon |
|-------|-------|---------|------|
| `NUEVA` | Nueva | blue (info) | `AlertCircle` |
| `SOMETIDA_DEVOLUCION` | Sometido a Devolución | amber (warning) | `Undo2` |
| `PENDIENTE` | Pendiente | orange (retains today's Pendiente styling) | `Clock` |
| `DECLINADA` | Declinado | red (destructive) | `XCircle` |
| `CANCELADA` | Cancelado | slate (muted) | `Ban` |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/negocios/types/business-entity.types.ts` | Modified | Five-state const + union |
| `src/app/api/negocios/[id]/route.ts` | Modified | Remove auto-resolve block + its audit log |
| `src/app/api/negocios/[id]/mark-novedad/route.ts` | Modified | MARK sets `NUEVA`; UNMARK requires `NUEVA` + ownership |
| `src/app/api/negocios/[id]/manage-novedad/route.ts` | New | Role-gated manual status change |
| `src/features/negocios/services/` | New/Modified | Novedad status service functions |
| `src/features/negocios/lib/business-api.schemas.ts` | Modified | New manage-novedad schema |
| `src/features/negocios/components/modals/BusinessNovedadManageModal.tsx` | New | Gestión de Novedad modal |
| `src/features/negocios/components/ui/BusinessNovedadBadge.tsx` | Modified | Five-state STATUS_CONFIG |
| `src/features/negocios/components/ui/NovedadActionButton.tsx` | Modified | `canUnmark` uses `NUEVA` + ownership |
| `src/features/negocios/hooks/use-manage-novedad.ts` | New | `AsyncState<BusinessEntity>` hook |
| `src/app/dashboard/negocios/[id]/page.tsx`, `modals/BusinessViewModal.tsx` | Modified | Render "Gestionar novedad" for allowed roles |
| `src/features/auth/lib/audit-logger.ts` | Modified | Add `BUSINESS_NOVEDAD_STATUS_CHANGED` |
| `prisma/scripts/` (backfill) | New | `RESUELTA → NUEVA`, idempotent |
| `openspec/specs/negocios/spec.md` | Modified | Delta spec for novedad lifecycle |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Backfill not run in prod → orphan `RESUELTA` values crash `STATUS_CONFIG[status]` lookup | Med | Badge falls back to a neutral chip for unknown values; backfill runs as a release step and is idempotent |
| Removing auto-resolve leaves novedades stale forever (no one advances them) | Med | Explicit product decision; manual states are the point. Follow-up: novedad aging report (out of scope) |
| `becomesEmitido` in the PUT route is also used for payments/date logic | Med | Delete only the novedad branch, not the variable; existing PUT tests must stay green |
| UNMARK ownership gate breaks backoffice users who relied on unrestricted unmark | Low | Confirmed business rule; backoffice uses "Gestionar novedad" → `CANCELADA` instead |
| Amber vs orange adjacency reduces at-a-glance distinction | Low | Distinct icons + labels per state; validate in review |

## Rollback Plan

1. Revert the feature branch (all changes are additive files plus edits to five existing files; no schema migration to reverse).
2. If already released and only the data is wrong, re-run the inverse backfill (`NUEVA → RESUELTA` restricted to businesses whose status is `EMITIDO` and that have no `BUSINESS_NOVEDAD_STATUS_CHANGED` audit entry).
3. `manage-novedad` is a new route: removing it cannot break existing clients.

## Dependencies

- None external. No Prisma schema migration required (`novedadStatus` stays `String? @db.VarChar(20)`).
- Backfill script must be executed as part of the deployment for CA2/CA6 correctness.

## Success Criteria

- [x] Marking a novedad sets `NUEVA`, visible immediately in detail and list (CA1).
- [x] `VENTA_EFECTUADA → EMITIDO` leaves `novedadStatus` byte-identical and emits no novedad audit event (CA2).
- [x] `ANALISTA_SOPORTE` and `ADMIN` can change the status via the modal to any of the four manual options from any current state; other roles get 403 (CA3, CA4).
- [x] Only the owning agent can UNMARK, and only while `NUEVA`; every other case is rejected (CA5).
- [x] All five states render with distinct colour + icon in the list column and detail badge (CA6).
- [x] Zero rows with `novedadStatus = 'RESUELTA'` after backfill.
- [x] Every manual status change produces a `BUSINESS_NOVEDAD_STATUS_CHANGED` audit entry with user, IP, user-agent and from→to detail.
