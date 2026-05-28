# Archive Report — Gráfica de dona "Origen del cliente"

**Change**: `origen-cliente-donut`
**Status**: ARCHIVED
**Archived at**: 2026-05-28
**Branch**: `feat/table-dashboard` → `develop`

---

## Summary

New donut chart for the Production Dashboard showing the distribution of `Business` records grouped by `ClientOrigin × Currency`. Each origin gets a stable hue; each currency within that origin gets a luminosity variant (solid for USD, light for COP). The chart respects the global hierarchy selection and all dashboard filters with full parity to existing charts.

---

## Files Created

| File | Type |
|---|---|
| `src/features/production-dashboard/types/production-kpi.types.ts` | Modified — added `OriginDonutQueryParams`, `OriginDonutRaw`, `OriginDonutSlice` |
| `src/features/production-dashboard/lib/origin-donut-colors.ts` | New |
| `src/features/production-dashboard/lib/origin-donut-aggregate.ts` | New |
| `src/features/production-dashboard/services/origin-donut.service.ts` | New |
| `src/app/api/production-dashboard/by-origin/route.ts` | New |
| `src/features/production-dashboard/hooks/use-origin-donut.ts` | New |
| `src/features/production-dashboard/components/OriginDonutTooltip.tsx` | New |
| `src/features/production-dashboard/components/OriginDonutLegend.tsx` | New |
| `src/features/production-dashboard/components/OriginDonutChart.tsx` | New |
| `src/features/production-dashboard/components/OriginDonutPanel.tsx` | New |
| `src/features/production-dashboard/components/DashboardShell.tsx` | Modified — inserted panel between UsdKpiPanel and MsBarChartPanel |
| `src/features/production-dashboard/__tests__/lib/origin-donut-colors.test.ts` | New — 14 tests |
| `src/features/production-dashboard/__tests__/lib/origin-donut-aggregate.test.ts` | New — 11 tests |
| `src/features/production-dashboard/__tests__/services/origin-donut.service.test.ts` | New — 10 tests |
| `src/features/production-dashboard/__tests__/services/by-origin.route.test.ts` | New — 8 tests |
| `src/features/production-dashboard/__tests__/hooks/use-origin-donut.test.ts` | New — 9 tests |
| `src/features/production-dashboard/__tests__/components/OriginDonutChart.test.tsx` | New — 7 tests |
| `src/features/production-dashboard/__tests__/components/OriginDonutTooltip.test.tsx` | New — 12 tests |

---

## Test Results

- **New tests**: 73
- **Total suite**: 2458 passing, 0 failures, 3 skipped (pre-existing)
- **Type check**: zero errors

---

## Key Design Decisions

1. **Prisma query**: `groupBy(['idClientOrigin', 'idCurrency'])` with `_count: { idBusiness: true }` and `_sum: { value: true }`, parallel join to `ClientOrigin` and `Currency` tables
2. **ClientOrigin status**: fetched WITHOUT `status` filter — deactivated origins with historical negocios still surface
3. **Color palette**: deterministic hue-per-origin (sorted by `originId`), luminosity-per-currency (solid = USD, light = COP)
4. **Tooltip — USD segment**: shows `$ X.XXX USD` only. No COP line.
5. **Tooltip — COP segment**: shows `$ X.XXX USD` (÷ TRM) as primary + `≈ $ X.XXX.XXX COP` as reference. Hidden if TRM unavailable.
6. **Legend**: separate item per origin+currency, format `"[OriginName] [CurrencySymbol] · XX.X%"`, sorted descending by percentage
7. **Position**: `OriginDonutPanel` inserted between `UsdKpiPanel` and `MsBarChartPanel` in `DashboardShell`
8. **Delivery**: single branch to `develop`, `size:exception` accepted (73 lines across 18 files)

---

## Deviations from Original Spec

| Deviation | Reason |
|---|---|
| Tooltip shows monetary `totalValue` (via `_sum`) in addition to count | User requested during implementation |
| USD segments omit COP conversion line | User refined: "lo que son en moneda extranjera no debe mostrar COP" |
| COP segments show USD equivalent (÷ TRM) as primary, COP as reference | User refined: "todo tiene que estar en USD, pero el COP es para saber el equivalente" |
| `currencySymbol` added to `OriginDonutRaw` (beyond original interface) | Required for legend format; additive, no breaking change |
| Legend renders below chart (not to the side) | Avoids layout overflow on narrow screens |
