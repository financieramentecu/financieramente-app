# Tasks: PPC `hasPortfolio` and portfolio percentages (RF-03 / RF-04)

## Phase 1: Schema and domain types

- [x] 1.1 Add `hasPortfolio Boolean @default(false)` to `ProductPercentageCommission` in `prisma/schema.prisma` and add migration SQL under `prisma/migrations/`.
- [x] 1.2 Run `npx prisma generate` and apply migration locally.
- [x] 1.3 Extend `src/features/distribution-commission/types/commission-rule.types.ts`: `hasPortfolio` on `CommissionRule`; `porcentajePortfolio?` on `CommissionRuleCategory`; `portfolioPercentage` on create/update category inputs.

## Phase 2: Validation and mapping

- [x] 2.1 Extend `commission-rule-schemas.ts`: root `hasPortfolio`; line `portfolioPercentage` optional; `superRefine` for portfolio range **[1,100]** and sum **≤ 100** when `hasPortfolio`; api transform `/100` like `percentage`. **Test first:** add failing cases in `commission-rule-schemas.test.ts`, then implement.
- [x] 2.2 Update `commission-rule.mapper.ts`: include `hasPortfolio`; map `porcentajePortfolio` with same fraction→0–100 as distribution; extend Prisma category type. **Test first:** `commission-rule.mapper.test.ts` round-trip.

## Phase 3: API routes

- [x] 3.1 `src/app/api/product-configurations/[id]/distribution-commission/route.ts` (POST): persist `hasPortfolio` on `create`; `createMany` set `porcentajePortfolio` from body when flag true (fraction), else omit/null per design.
- [x] 3.2 `.../distribution-commission/[ruleId]/route.ts` (PUT): in transaction, `findMany` categories **before** `deleteMany`; build `Map<idCategory, porcentajePortfolio>`; `update` PPC with `hasPortfolio`; `createMany` with `porcentajeDistribucion` + `porcentajePortfolio` from body if `hasPortfolio` else from map (new lines → null).
- [x] 3.3 Ensure GET (single + list) returns mapped domain with `hasPortfolio` and category `porcentajePortfolio` via existing mapper path.

## Phase 4: UI

- [x] 4.1 `commission-rule-form.tsx`: `Switch`/`Checkbox` for `hasPortfolio`; default `false`; `useWatch` totals for distribution + portfolio sums; disable submit when invalid; load/save `portfolioPercentage` on lines.
- [x] 4.2 `category-percentage-row.tsx`: second `PercentageField` for portfolio when `hasPortfolio`; blur `trigger` for portfolio path (RF-02 parity).
- [x] 4.3 `commission-rules-table.tsx`: show portfolio column or values only when `rule.hasPortfolio` (per design).
- [x] 4.4 Update `commission-rule-api.ts` / `use-commission-rule-mutations.ts` only if payload types need wiring.

## Phase 5: Tests and verification

- [x] 5.1 Route test: PUT with `hasPortfolio` false after true + prior portfolio data — assert recreated rows keep `porcentaje_portfolio` (mock Prisma or integration). Cover POST with flag true + both percents.
- [x] 5.2 RTL: `commission-rule-form.validation.test.tsx` or row test — visible portfolio field when flag on; hidden when off; blur/save messages per delta spec scenarios.
- [x] 5.3 Run `npm run test:unit` for touched paths and `npm run type-check`.

## Phase 6: Polish

- [x] 6.1 ~~Add short helper text under `hasPortfolio`~~ **Actualización:** se eliminó el texto auxiliar bajo el switch (solo queda etiqueta «Porcentajes de cartera» + `aria-label` del switch).
- [x] 6.2 Update `src/app/api/AGENTS.md` commission-rules row if request/response shape is documented there.

## Phase 7: Ajustes posteriores al apply (UX, datos, listado)

- [x] 7.1 **`prisma/seeds/product-percentage.ts`:** fracciones de `porcentajeDistribucion` por PPC que sumen **1.0** (100 % en UI); corregido uso erróneo de `1.0` en GENERAL que mostraba 100 % + líneas extra.
- [x] 7.2 **`formatPercentDisplay`** (`src/features/shared/lib/format-percent.ts`): lectura sin ceros decimales finales innecesarios; hasta 6 decimales cuando aportan; no-finito → `0%`. Afecta tabla, totales del formulario y otros consumidores (p. ej. pre-liquidación vía `formatPct`).
- [x] 7.3 **`commission-rules-table.tsx`:** layout de badges (wrap, `gap`, `shrink-0`, texto multilínea); mismo estilo **verde oscuro / texto blanco** para chips de distribución y cartera; columna Cartera alineada visualmente con categorías.
- [x] 7.4 **Listado reglas** (`reglas/page.tsx` + tabla): un solo buscador — se quitó el `Input` duplicado encima de la tabla; `CommissionRulesTable` expone `onSearchChange` / `searchPlaceholder` y el `DataTable` usa `onGlobalSearch` → `setSearch` del hook (debounce API sigue en `useCommissionRules`).
