# Proposal: Commission Distribution Modal

## Intent

Users reviewing the pre-liquidación detail page (`/dashboard/pre-liquidacion/[fileId]`) need to inspect the per-user commission distribution breakdown for each settlement record. No such view exists today — the table shows flat records with no drill-down. This feature adds a "Detalle de Distribución" action button per row that opens a modal with the full `ComissionDistribution` data (category, product, origin, user, gross/net commission, discount, clawback, **final commission** (`value_commission_final` displayed as "Comisión final")).

## Scope

### In Scope
- New GET API endpoint: `/api/pre-liquidacion/distribucion/[settlementCommissionId]`
- New service function: `obtenerDistribucionComision(id)` in `pre-liquidacion.service.ts`
- New types: `DistribucionComision`, `ItemDistribucionComision`, `RespuestaDistribucionComision` in `types/types.ts`
- New hook: `use-distribucion-comision.ts` using `AsyncState<T>`
- New modal component: `ModalDetalleDistribucion.tsx` (Modal size="lg", header + distribution table)
- Table update: add `onVerDistribucion` prop + "Detalle de Distribución" button to `RegistrosLiquidacionTable`
- Page update: add `selectedCommissionId` + `modalDistribucionOpen` state; wire handler

### Out of Scope
- Editing or modifying distribution records
- Showing distribution data inline in the table (no payload bloat)
- Changes to the existing pre-settled or registros endpoints
- No Prisma schema migrations required (model already exists)

## Approach

Follow the **ModalVerNegocio pattern** (Approach A from exploration): lazy fetch by ID when the modal opens. New dedicated endpoint → service → hook → modal. The UI uses `Modal` from `src/features/shared/ui/modal.tsx` with `size="lg"` displaying a header section (category, product, origin, user) and a rows table (one row per `ComissionDistribution`).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/pre-liquidacion/types/types.ts` | Modified | Add 3 new types for distribution response |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modified | Add `obtenerDistribucionComision()` with deep Prisma includes |
| `src/app/api/pre-liquidacion/distribucion/[settlementCommissionId]/route.ts` | New | GET handler, roles: ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE |
| `src/features/pre-liquidacion/hooks/use-distribucion-comision.ts` | New | Fetch hook using AsyncState |
| `src/features/pre-liquidacion/components/ModalDetalleDistribucion.tsx` | New | Modal component |
| `src/features/pre-liquidacion/components/RegistrosLiquidacionTable.tsx` | Modified | Add button + `onVerDistribucion` prop |
| `src/app/dashboard/pre-liquidacion/[fileId]/page.tsx` | Modified | Add state + wire handler |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SYNCHRONIZED records have zero `ComissionDistribution` rows | High | Show empty-state message in modal; always render button but handle empty array |
| 4-level deep join chain produces null traversals | Medium | Use optional chaining throughout; validate in service before returning |
| `porcentajePortfolio` vs `porcentajeDistribucion` (CARTERA logic) | Medium | Conditionally display the correct % field based on category `typeCategory` |
| `Business` or user may be null on some PRE-SETTLED records | Low | Null-guard header fields; display "—" when not available |

## Rollback Plan

All changes are additive (new files + small additions to existing files). Rollback = revert the branch. No migrations, no schema changes, no modifications to existing endpoints or data flows.

## Dependencies

- None external. `ComissionDistribution` model and all related Prisma models already exist.

## Success Criteria

- [ ] "Detalle de Distribución" button visible on each row of `RegistrosLiquidacionTable`
- [ ] Clicking the button opens `ModalDetalleDistribucion` with correct data for that `settlementCommissionId`
- [ ] Modal displays header (category, product, origin, user) and distribution rows table
- [ ] Empty state displayed gracefully when no `ComissionDistribution` rows exist (SYNCHRONIZED records)
- [ ] Clawback row shown only when present
- [ ] Correct percentage displayed (porcentajeDistribucion vs porcentajePortfolio per typeCategory)
- [ ] TypeScript strict mode passes; no `any` types
- [ ] Unit tests for hook and modal component
