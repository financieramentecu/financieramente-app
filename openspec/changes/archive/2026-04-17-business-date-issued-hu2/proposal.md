# Proposal: Registro de contrato y `date_issued` (PRD HU2)

## Intent

Persist **fecha de emisión** cuando el negocio pasa a **`EMITIDO`** al registrar contrato. Hoy `EMITIDO` ya se deriva del contrato; falta **`date_issued`** en modelo y API para trazabilidad (H6/K3) y reporting futuro.

## Scope

### In Scope

- Campo Prisma `dateIssued` → columna `date_issued` (nullable `DateTime`).
- Set **una sola vez** en la primera transición a `EMITIDO`: creación con contrato **o** `PUT` desde `VENTA_EFECTUADA` con contrato válido.
- Mapper `BusinessEntity` + tipos UI con `dateIssued` serializado ISO.
- Tests unitarios/integration en create, `PUT /api/negocios/[id]`, fixtures.

### Out of Scope

- Cambiar reglas de origen (H7), estados `FONDEADO`/`LIQUIDADO`, deprecación `COMISIONANDO`.
- Columnas nuevas en listado/DataTable (opcional follow-up H6).
- Backfill masivo automatizado excepto script/migración SQL documentada si producto lo pide.

## Approach

Migración Prisma; en `createBusiness` si `determineBusinessStatus` → `EMITIDO`, set `dateIssued: new Date()`. En `PUT`, si `newStatus === EMITIDO` y `existingBusiness.status === VENTA_EFECTUADA`, set `dateIssued` solo si aún `null`. No actualizar `dateIssued` al editar número de contrato ya en `EMITIDO`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | `dateIssued` en `Business` |
| `src/features/negocios/actions/create-business.ts` | Modified | Persist `dateIssued` al crear emitido |
| `src/app/api/negocios/[id]/route.ts` | Modified | Set en primera emisión vía PUT |
| `business-entity.mapper.ts`, `business-entity.types.ts` | Modified | Exponer fecha |
| `src/features/negocios/__tests__/**` | Modified | Fixtures y rutas |

**Modules:** `negocios` feature, Prisma migration.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Históricos `EMITIDO` sin fecha | Med | Migración opcional: backfill desde `updated_at`/`created_at`; documentar |
| Confusión con `updatedAt` | Low | Contrato solo en mapper como `dateIssued`; doc en spec |

## Rollback Plan

Revert migration (`prisma migrate resolve` + rollback SQL restore); revert commits; campo ignorado si lectura vieja sin columna — deploy solo tras migración aplicada en todos los entornos.

## Dependencies

Ninguna externa. Spec delta `openspec/specs/negocios` en fase siguiente (sdd-spec).

## Success Criteria

- [ ] Migración aplicable sin pérdida de datos; `date_issued` nullable.
- [ ] Crear negocio con contrato → fila con `dateIssued` no nulo y `status` `EMITIDO`.
- [ ] `VENTA_EFECTUADA` → primer PUT con contrato → `dateIssued` set; segundo cambio solo contrato no altera `dateIssued`.
- [ ] GET negocio devuelve `dateIssued` en payload entidad.
- [ ] Tests verdes en paquete negocios afectado.
