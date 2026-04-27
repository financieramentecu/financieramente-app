# Proposal: H6 — Listado principal de negocios mejorado

## Intent

HU **H6** (PRD negocios): legibilidad de fechas/estados con DS, **`LIQUIDADO`** en badge, retirar **`COMISIONANDO`** de UI nueva. Hoy: badges duplicados (`getStatusBadge`), strings ES frágiles, mapper API→tabla envía estados desconocidos a **Cancelado**.

**Ciclo de estados (producto):** `EMITIDO` → `FONDEADO` → `LIQUIDADO`. La liquidación de comisiones solo debe marcar el negocio como **`LIQUIDADO`** cuando ya está **`FONDEADO`** (no saltar desde `EMITIDO`). Esto queda reflejado en pre-liquidación y en el delta `specs/pre-liquidacion/spec.md`.

## Scope

### In Scope

- Tipos + **`BusinessStatusBadge`**: añadir **`LIQUIDADO`**; tabla usa el mismo componente que modales.
- **`businessDataForTable`**: mapeo explícito **`LIQUIDADO`**; sin fallback silencioso a Cancelado.
- **`LIST_STATUS_OPTIONS`** + tipos fila: **`LIQUIDADO`**; política **`COMISIONANDO`** (spec).
- Columna **«Fecha creación»** (antes «Fecha»); acciones con **`BUSINESS_STATUS`** donde aplique.
- Tests badge/mapper.

### Out of Scope

- Export Excel (H5); columnas por anualidad en tabla (H4 modal).

**Nota:** migración de datos legacy **`COMISIONANDO` → `LIQUIDADO`** y alineación backend pueden hacerse en el mismo epic o PR vecino; el plan técnico las documenta en diseño/tareas cuando apliquen.

## Approach

Dos fases: (1) tipos, badge, filtros; (2) tabla sin duplicar estilos. Opcional **`statusCode`** (`BusinessStatus`) en fila si se conservan labels ES temporalmente.

## Affected Areas

| Area | Impact |
|------|--------|
| `BusinessTableSection.tsx` | Modified — badges, filtros, acciones |
| `BusinessStatusBadge.tsx` | Modified — `LIQUIDADO` |
| `business.types.ts`, `business-entity.types.ts` | Modified |
| `negocios-page-client.tsx` | Modified — mapper |
| `negocios/__tests__/**` | Modified |
| `pre-liquidacion.service.ts` | Modified — al liquidar: `FONDEADO` → `LIQUIDADO` (no `EMITIDO` → `LIQUIDADO`) |
| `pre-liquidacion.service.test.ts` | Modified — expectativas del `business.updateMany` |

## Risks

| Risk | L | Mitigation |
|------|---|------------|
| Regresión acciones por estado | M | RTL en filas clave |
| API sin `LIQUIDADO` | L | Render defensivo |

## Rollback Plan

Revertir PR: restaurar **`BusinessTableSection`** y **`BusinessStatusBadge`**; sin cambios de datos.

## Dependencies

GET `/api/negocios` expone **`status`** con **`LIQUIDADO`** cuando el negocio haya completado el ciclo hasta liquidación (tras **`FONDEADO`**). Coherencia con H7/migración de estados en BD.

## Success Criteria

- [ ] Creación/emisión/fondeo legibles; **`LIQUIDADO`** en badge.
- [ ] **`BusinessStatusBadge`** único en tabla + modales.
- [ ] Ningún estado válido como Cancelado por error.
- [ ] CI verde.
