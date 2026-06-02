# Proposal: Negocios por Estado Donut Chart

## Intent

Add a third donut chart to the production dashboard that shows the distribution of active businesses by status (`VENTA_EFECTUADA`, `EMITIDO`, `FONDEADO`). Users currently see origin and company breakdowns but lack visibility into where commission contracts sit in the active lifecycle — needed to spot bottlenecks (e.g., many `EMITIDO` waiting to be `FONDEADO`).

## Scope

### In Scope
- New API route `GET /api/production-dashboard/by-status` returning aggregated counts.
- New feature service `getBusinessesByStatusAggregate` using `prisma.business.groupBy(['status'])`.
- New domain hook `useStatusDonut` returning `AsyncState<StatusDonutData>`.
- New presentational component `StatusDonut` (Recharts pie) with fixed status colors.
- Update `DashboardShell` grid to 3 responsive columns (`md:grid-cols-2 xl:grid-cols-3`).
- Honor existing dashboard filters (date range, agent, company, status panel filter).
- Vitest unit tests for aggregate lib, service mapper, hook state machine.

### Out of Scope
- Showing `CANCELADO` or `LIQUIDADO` statuses.
- Currency dimension breakdown (status has no currency split — single ring).
- Drill-down/click interactions on slices.
- Status transition timeline or history view.
- Persisting user chart preferences.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `production-dashboard`: add a third donut visualization (by status) alongside existing origin and company donuts.

## Approach

Mirror the existing `company-donut` pattern (services + lib + hook + component) to keep the feature internally consistent. The service runs a single `groupBy` query filtered by `status IN (VENTA_EFECTUADA, EMITIDO, FONDEADO)` plus existing dashboard filters; the lib computes percentages and assigns fixed colors per status; the hook owns async state; the component is a pure Recharts pie with legend and tooltip `"63 (45%)"`. Update the dashboard grid to a 3-column responsive layout.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/production-dashboard/by-status/route.ts` | New | GET endpoint, validates filters, delegates to service. |
| `src/features/production-dashboard/services/by-status.service.ts` | New | Prisma `groupBy` aggregation. |
| `src/features/production-dashboard/lib/by-status-aggregate.ts` | New | Pure percentage + color mapping. |
| `src/features/production-dashboard/hooks/use-status-donut.ts` | New | `AsyncState`-based fetch hook. |
| `src/features/production-dashboard/components/StatusDonut.tsx` | New | Recharts presentational component. |
| `src/features/production-dashboard/components/DashboardShell.tsx` | Modified | Grid layout to 3 columns; mount `StatusDonut`. |
| `src/features/production-dashboard/types/` | Modified | Add `StatusDonutData`, `StatusSlice` types. |
| `src/features/production-dashboard/__tests__/` | New | Tests for lib/service/hook. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `Business.status` is nullable (`VarChar(20)?`) — null rows skew counts. | Med | Filter `status: { in: [...] }` at the service layer; null rows excluded naturally. |
| Status panel filter shows single 100% slice when applied. | Low | Accepted — coherent with sibling KPIs; empty state covers no-match case. |
| 3-column layout cramped on mid-range screens. | Med | Use `md:grid-cols-2 xl:grid-cols-3` so mid screens wrap to 2 rows. |
| String comparisons against enum-like values without DB enum. | Low | Centralize allowed statuses in `lib/by-status-aggregate.ts` constant. |

## Rollback Plan

Revert `DashboardShell` grid + remove the `StatusDonut` import; delete the new feature files and API route. No DB migrations, no schema changes — purely additive.

## Dependencies

- Existing `production-dashboard` feature scaffold and filter context.
- Recharts (already used by sibling donuts).

## Success Criteria

- [ ] Third donut renders to the right of company donut on `xl` screens; wraps cleanly on smaller screens.
- [ ] Counts match a manual `groupBy` query over the same filter set.
- [ ] Each slice uses the agreed fixed color and tooltip format `"<count> (<pct>%)"`.
- [ ] Empty state renders when no businesses match the filters.
- [ ] All new unit tests pass under `npm run test:unit`.
