# Proposal: HU4 — Fondeo con anualidades

## Intent

Hoy los negocios con `AnnualPayment` **no** se pueden fondear: UI oculta "Fondear" y `POST .../fondear` responde **400**. H4 (PRD) exige **modal** con checkbox por cuota, fechas `dateAnchored` visibles, y **primera** cuota pagada → padre **`FONDEADO`** + **`business.dateAnchored`** alineado a H5.

## Scope

### In Scope

- **API** transaccional: marcar cuotas; actualizar `AnnualPayment` (`status`, `dateAnchored`).
- **Primera** cuota pagada en un negocio `EMITIDO` → `Business` a `FONDEADO` y `dateAnchored` del negocio (mismo instante de registro, p. ej. `now()`).
- **Modal** (checkboxes + fechas existentes).
- **Fondear** / **Fondear anualidad** en listado (según haya cuotas anuales pendientes): anualidades → abre modal (no el flujo HU3 directo).
- **Copy UX**: etiqueta **«Fondear anualidad»** en flujo modal; título del modal con **contrato** (no solo id).
- **Tests** ruta + acciones; **OpenSpec** reemplaza "out of scope — HU4".
- **Auditoría** del lote (patrón existente).

### Out of Scope

- Motor liquidación/archivo; export Excel (H5). **No** desmarcar cuotas ya fondeadas en v1 salvo spec explícita.

## Approach

`POST` bajo `src/app/api/negocios/[id]/` (nombre TBD) con payload de cuotas a marcar. Mismos **roles/ownership** que `fondear/route.ts`. Prisma `$transaction`: validar `EMITIDO`, aplicar filas, condición **primer fondeo** → update padre. Cliente: servicio + hook; página dispara **modal** si `hasAnnualPayments`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/negocios/[id]/…/route.ts` | New | Fondeo anual en transacción |
| `ActionCell.tsx`, `BusinessTableSection.tsx` | Modified | Fondear + anualidades → modal |
| `features/negocios/components/` | New | Modal |
| `business.service.ts`, `use-business-mutation.ts` | Modified | Nueva llamada |
| `audit-logger` / acción | Modified | Evento fondeo anual |
| `openspec/specs/negocios/spec.md` | Modified | Escenarios HU4 |

## Risks

| Risk | L | Mitigation |
|------|---|------------|
| `dateAnchored` negocio vs filas | M | Regla única en transacción |
| Concurrencia | L | `update` con precondición de estado |

## Rollback Plan

1. Quitar ruta y modal; volver a ocultar Fondear con anualidades. 2. Sin migración si solo API/UI.

## Dependencies

H1 (`AnnualPayment`), HU3 (`POST .../fondear` guard + campos).

## Success Criteria

- [ ] Modal persiste cuotas; primera pagada → `FONDEADO` + `business.dateAnchored`.
- [ ] `POST .../fondear` sigue con `_count.annualPayments > 0` → 400.
- [ ] Spec HU4 sin defer pendiente.
