# Design: Commission Distribution Modal

## Technical Approach

Add a lazy-fetch drill-down modal to `RegistrosLiquidacionTable` following the established `ModalVerNegocio` pattern: new API route → service function → hook → modal component. All seven file touches are additive (five new files, two prop additions). No Prisma schema changes, no data migrations, no modifications to existing endpoints.

## Architecture Decisions

| Decision | Choice | Alternatives Rejected | Rationale |
|----------|--------|-----------------------|-----------|
| Data loading strategy | Lazy fetch on modal open (by `idSettlementCommission`) | Inline in list payload | Keeps list payload lean; mirrors `ModalVerNegocio` exactly; data only needed on explicit click |
| Modal UI primitive | `Modal` from `shared/ui/modal.tsx` with `size="xl"`, and `DialogContent` with `className="max-w-4xl"` for large display | Raw Dialog primitives (`shared/ui/dialog.tsx`) | Reuse over re-implementation; `max-w-4xl` ensures the distribution table is comfortably readable at large viewport widths |
| Hook trigger | `useEffect` + `useCallback` on `idSettlementCommissionId` change (same as `useComisionesPreliquidadas`) | Manual trigger / `useCallback` only | Consistent with all existing feature hooks; auto-fetches when ID changes, de-dupes with `useCallback` |
| Type location | `src/features/pre-liquidacion/types/types.ts` | Separate file | All pre-liquidacion domain types live here; keeps imports consistent |
| Prisma query in service | Single `comissionDistribution.findMany` with all includes | Multiple queries / N+1 | One query; deep include is linear; avoids N+1 on category/product/origin/user chain |

## Data Flow

```
RegistrosLiquidacionTable
  [user clicks "Detalle de Distribución" on row r]
        │
        ▼ onVerDistribucion(r.idSettlementCommission)
DetallePreLiquidacionPage
  setSelectedCommissionId(id)
  setModalDistribucionOpen(true)
        │
        ▼ props: idSettlementCommission, open=true
ModalDetalleDistribucion
        │
        ▼ useDistribucionComision(idSettlementCommission)
        │   fetch GET /api/pre-liquidacion/distribucion/[id]
        │
        ▼ API Route (auth + role check)
        │   obtenerDistribucionComision(id) ← pre-liquidacion.service.ts
        │   prisma.comissionDistribution.findMany({ where: { idSettlementCommission: id }, include: { ... } })
        │
        ▼ DistribucionComision (typed response)
        │
  ModalDetalleDistribucion renders:
    • status === 'loading'  → centered Loader2 spinner (lucide-react, animate-spin)
    • status === 'error'    → error message
    • status === 'success'  →
        Header section (categoría, producto, origen, asesor)
        Distribution rows table (bruta, %, descuento, comisión final, % clawback aplicado, clawback)
        Note: "% Clawback aplicado" renders value_clawback_percentage (stored as decimal 0–1) as {(value_clawback_percentage * 100).toFixed(2)}%
        Empty state when distribuciones.length === 0
    • DialogContent className includes max-w-4xl (large modal)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/pre-liquidacion/types/types.ts` | Modify | Add `ItemDistribucionComision`, `DistribucionComision`, `RespuestaDistribucionComision` |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modify | Add `obtenerDistribucionComision(id: number)` with 4-level Prisma include |
| `src/app/api/pre-liquidacion/distribucion/[settlementCommissionId]/route.ts` | Create | GET handler: auth → role check → parse id → call service → return `ApiResponse<RespuestaDistribucionComision>` |
| `src/features/pre-liquidacion/hooks/use-distribucion-comision.ts` | Create | `useDistribucionComision(id: number \| null)` using `AsyncState<DistribucionComision>` |
| `src/features/pre-liquidacion/components/ModalDetalleDistribucion.tsx` | Create | `'use client'` component; consumes hook; renders: centered `Loader2` spinner (lucide-react, `animate-spin`) when `status === 'loading'`; error message when `status === 'error'`; header + table (including "Comisión final" column for `value_commission_final` and "% Clawback aplicado" column for `value_clawback_percentage` rendered as `{(value_clawback_percentage * 100).toFixed(2)}%` — raw value is a decimal in the 0–1 range and must be multiplied by 100 for display) when `status === 'success'`; `DialogContent` uses `className="max-w-4xl"` for large modal size |
| `src/features/pre-liquidacion/components/RegistrosLiquidacionTable.tsx` | Modify | Add `onVerDistribucion: (id: number) => void` prop; render "Detalle de Distribución" `Button` in actions `<td>` alongside "Ver negocio" |
| `src/app/dashboard/pre-liquidacion/[fileId]/page.tsx` | Modify | Add `selectedCommissionId` + `modalDistribucionOpen` state; `handleVerDistribucion`; render `<ModalDetalleDistribucion>` |

## Interfaces / Contracts

```typescript
// types/types.ts additions

/** One ComissionDistribution row mapped for display */
export interface ItemDistribucionComision {
  readonly idComissionDistribution: number
  categoria: string
  porcentajeDistribucion: number   // porcentajePortfolio when typeCategory === 'CARTERA'
  comisionBruta: number            // valueComission
  comisionNeta: number             // valueComissionFinal
  readonly value_commission_final: number  // final settled commission amount
  readonly value_clawback_percentage: number  // clawback percentage applied to this record
  totalDescuento: number
  porcentajeDescuento: number      // appliedDiscountPercentage
  clawback: {
    valor: number                  // clawback.valueClawback
    porcentaje: number             // clawback.porcentajeApplied
    estado: string                 // clawback.state
    fechaAplicacion: string | null // clawback.appliedDate
  } | null
}

/** Header context + distribution rows for a settlement commission */
export interface DistribucionComision {
  idSettlementCommission: number
  categoria: string | null          // from first distribution row's category
  producto: string | null
  origen: string | null
  nombreAsesor: string | null       // business.user name + lastName
  distribuciones: ItemDistribucionComision[]
}

/** API response shape */
export interface RespuestaDistribucionComision {
  distribucion: DistribucionComision
}
```

```typescript
// Prisma include structure in service
prisma.comissionDistribution.findMany({
  where: { idSettlementCommission: id },
  include: {
    productPercentageCommissionCategory: {
      include: {
        category: true,
        productPercentageCommission: {
          include: {
            productConfiguration: {
              include: {
                product: true,
                clientOrigin: true,
              },
            },
          },
        },
      },
    },
    settlementCommission: {
      include: {
        business: {
          include: {
            user: { select: { name: true, lastName: true } },
          },
        },
      },
    },
    clawback: true,
  },
})
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — hook | `useDistribucionComision`: idle → loading → success/error state transitions | Vitest + `renderHook`; mock `global.fetch`; test null id skips fetch |
| Unit — modal | `ModalDetalleDistribucion`: renders loading, error, empty-state, and full data variants | Vitest + Testing Library; mock hook return values |
| Unit — table | `RegistrosLiquidacionTable`: "Detalle de Distribución" button calls `onVerDistribucion` with correct id | Extend existing table tests; use `fireEvent.click` |
| Integration — API route | `GET /api/pre-liquidacion/distribucion/[id]`: auth guard, role guard, 404 on missing record, 200 with correct shape | Vitest + mock `auth()` + mock service |

Tests colocated: `src/features/pre-liquidacion/__tests__/` and `src/app/api/pre-liquidacion/distribucion/[settlementCommissionId]/__tests__/route.test.ts`.

## Migration / Rollout

No migration required. All changes are additive: new files and two small prop additions to existing components. The `ComissionDistribution` model and all related Prisma models are already in the schema and populated during `procesarPreLiquidacion`. Rollback = revert the branch.

## Open Questions

- [x] Modal size resolved: use `size="xl"` with `DialogContent className="max-w-4xl"`. The table now has 6+ columns (bruta, %, descuento, comisión final, % clawback aplicado, clawback) — `max-w-4xl` ensures comfortable readability. Decision confirmed.
- [ ] Should the "Detalle de Distribución" button be visible for ALL rows (including SYNCHRONIZED records with empty distributions) or only for PRE-SETTLED? The proposal says "always show button, handle empty state" — this design follows that, but consider hiding it for non-PRE-SETTLED rows to reduce confusion.
