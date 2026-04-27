# Tasks: Refactorización de KPIs de Negocio del Coach

## Phase 1: Backend contract — list params & WHERE

- [x] 1.1 Extend `BusinessListParams` with `createdFrom` / `createdTo` (`business-api.types.ts`).
- [x] 1.2 Add Zod fields + paired-date `superRefine` for `createdFrom`/`createdTo` (`business-api.schemas.ts`).
- [x] 1.3 Support `createdAtRange` in `buildBusinessListWhere` → `createdAt` gte/lte (`build-business-list-where.ts`).
- [x] 1.4 Map query params to `createdAtRange` via `parseBogotaInclusiveUtcRange` (`to-business-list-filter-input.ts`).
- [x] 1.5 Parse and forward `createdFrom`/`createdTo` on `GET /api/negocios` (`route.ts`).

## Phase 2: Stats API — `createdAt` on all three KPIs

- [x] 2.1 When `dateFrom` + `dateTo` are both set, build `createdAtFilter` with Bogotá-inclusive UTC range and pass it into **all three** `calculateAggregateForStatus` calls (Ventas Efectuadas, Emitido, Fondeados); omit range if incomplete (`stats/route.ts`).

## Phase 3: Services & hooks

- [x] 3.1 `businessService.getStats({ dateFrom, dateTo })` → query string + `cache: 'no-store'` (`business.service.ts`).
- [x] 3.2 `useBusinessStats`: pass `dateFrom`/`dateTo` and include them in SWR/fetch deps (`use-business-stats.ts`).
- [x] 3.3 `useBusinesses`: `hasFullCreatedDateRange`; send `createdFrom`/`createdTo` only when both set (`use-businesses.ts`).

## Phase 4: Coach vs admin — page wiring

- [x] 4.1 Coach: default date range month-start → today; map UI range to stats `dateFrom`/`dateTo` and list `createdFrom`/`createdTo`; admin: empty default dates; `isFundDateRangeActive` when both fund dates set (`negocios-page-client.tsx`).
- [x] 4.2 Propagate `fundDateRangeActive` into table section (`MisNegociosPage.tsx`).

## Phase 5: KPI UI (Data-Dense, `colorScheme`)

- [x] 5.1 `CoachKpiCard`: `colorScheme: 'orange' | 'emerald' | 'indigo'` (border, header, title); `formatCurrency` safe for non-finite (`CoachKpiCard.tsx`).
- [x] 5.2 `StatsOverview`: three cards only (no Clawback), each with matching `colorScheme` (`StatsOverview.tsx`).

## Phase 6: Table — labels, estado, acciones

- [x] 6.1 Date column header: «Creación» (Coach) vs «Fondeo» (admin) (`BusinessTableSection.tsx`).
- [x] 6.2 When `fundDateRangeActive`, disable status `Select` and pin semantics per design (`BusinessTableSection.tsx`).
- [x] 6.3 Hide cancel action for `AGENTE` where applicable (`BusinessTableSection.tsx`).

## Phase 7: Navigation — no duplicate Coach dashboard

- [x] 7.1 Replace `/dashboard/agente` page with redirect to `/dashboard/negocios` (`agente/page.tsx`).
- [x] 7.2 Remove redundant «Mi Dashboard» / agent duplicate entry from `AGENTE_MENU_ITEMS` (`menu-items.tsx`).

## Phase 8: Export — timezone

- [x] 8.1 Build export date bounds with `parseBogotaInclusiveUtcRange` (avoid off-by-one day vs raw `YYYY-MM-DD` parsing) (`export/route.ts`).

## Phase 9: Verification & tests

- [x] 9.1 Unit: `stats/__tests__/route.test.ts` — no `createdAt` on `where` without full range; with `dateFrom`+`dateTo`, all three `groupBy` calls include same `createdAt` filter; agent scoping on `idUser`.
- [x] 9.2 Unit: extend `build-business-list-where.test.ts` with `createdAtRange` → expects `createdAt` gte/lte in `AND` (aligns with spec list filter).
- [x] 9.3 Unit (optional): `map-business-to-export-row.test.ts` — assert Bogotá-calendar display for export date labels if `fmtDate` / header path needs explicit regression cover.
- [ ] 9.4 Optional: component/integration spot-check — Coach loads with default month range; admin list without default fund dates (`negocios-page-client` behavior per spec).
