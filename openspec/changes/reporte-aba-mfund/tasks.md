## 1. Catalog, flags, navigation, REPORT_CODES

- [x] 1.1 Add `REPORT_CODES.ABA_MFUND: 'ABA_MFUND'` in `src/features/report-permissions/types/report-permissions.types.ts` so `knownReportCodes()` / `mergeKnownReportCodes()` include it automatically (ADMIN bypass). Do not depend on `leads-analytics`.
- [x] 1.2 Update tests that freeze ADMIN catalog as `['PRODUCCION_REAL']` so they expect `Object.values(REPORT_CODES)` (both `PRODUCCION_REAL` and `ABA_MFUND`): `report-permissions-helpers.test.ts`, `can-view-report.test.ts` (`getAuthorizedReportCodes`), `use-authorized-report-codes.test.ts`. Keep `PRODUCCION_REAL` present.
- [x] 1.3 Extend `prisma/seeds/report-permissions.ts` to upsert `ReportDefinition` `{ code: 'ABA_MFUND', name: 'ABA-MFUND', routePath: '/dashboard/reportes/aba-mfund', status: true }`. Keep existing `PRODUCCION_REAL` upsert unchanged. No Prisma schema or `prisma/ERD.md` changes.
- [x] 1.4 Seed `CategoryReportPermission` (`status: true`) for `ABA_MFUND` on categories named exactly **Performance Leader** and **Business Leader**, each independently: if one category is missing, log and continue with the other (no early `return` that skips the second). Restructure so this seed is not skipped by the existing Producción Real Performance Leader early return. Do not change Performance Leader → `PRODUCCION_REAL` default enablement.
- [x] 1.5 Register Flagsmith flag `reportes_aba_mfund`: add to `ALL_FEATURE_FLAGS` and set `FALLBACK_FLAGS.reportes_aba_mfund = true`. Page-level only (APIs and nav stay permission-gated, clone Producción Real).
- [x] 1.6 Add Reportes sub-item **ABA-MFUND** in `menu-items.tsx` → `/dashboard/reportes/aba-mfund` with `reportCode: 'ABA_MFUND'`. Do not change `buildReportesMenuItem` algorithm.
- [x] 1.7 Add breadcrumb segment `'aba-mfund': 'ABA-MFUND'` in `breadcrumb-utils.ts` and cover it in the existing breadcrumb test.

## 2. Feature scaffold (types, schemas, ui-copy, WHERE inclusion)

- [x] 2.1 Create sibling feature `src/features/reports/aba-mfund/` with `components/`, `hooks/`, `lib/`, `services/`, `types/`, `mappers/`, `__tests__/`, and `index.ts`. Do not extend `produccion-real` with a mode flag. Do not import `leads-analytics`.
- [x] 2.2 Add domain types: `AbaMfundFilters` (`dateFrom`, `dateTo`, `userIds`, `statuses`), KPI DTO (`abaTotal`, `fondeado`, `emitido`, `ticketPromedio`), ranking DTO, detail row/page/cursor. Copy `MFUND_EXCLUSION` `{ COMPANY_NAME: 'SKANDIA', PRODUCT_NAME: 'MFUND' }` and `COP_CURRENCY_ID = 1` locally — do not extract a shared `reports/lib` module and do not import `buildMfundExclusionWhere`.
- [x] 2.3 Add constants `ABA_MFUND_RANKING_TAKE = 6`, ranking embed cap `500` businesses per agent, and `ABA_MFUND_EXPORT_MAX_ROWS = 5000`.
- [x] 2.4 Add Spanish copy only in `lib/ui-copy.ts` (`ABA_MFUND_UI`): page title **ABA-MFUND**, filter labels, KPI names, ranking title **ABA por Agente**, Excel button, `ERROR_DATE_RANGE`, empty-hierarchy toast. Status filter labels: Spanish names for every `BUSINESS_STATUS` value from negocios (include `CANCELADO` / `LIQUIDADO`; do not reuse the dashboard donut map).
- [x] 2.5 Add Zod schemas in `lib/aba-mfund-schemas.ts`: `dateFrom`/`dateTo` (`YYYY-MM-DD`), `userIds` (comma-separated GET / array POST), `statuses` (comma-separated GET / array POST; empty = all). Detail also `cursor` + `limit` (1–100, default 50). No `trmRate`, `currencyMode`, `companyIds`, or `contributionTypes`.
- [x] 2.6 Implement `buildAbaMfundInclusionWhere()` as a **positive** SKANDIA + MFUND predicate on `productPercentageCommission.productConfiguration.product`. Never call or edit `buildMfundExclusionWhere`.
- [x] 2.7 Implement `buildAbaMfundWhere(filters)` that always ANDs: inclusion helper, `idCurrency = 1`, `createdAt` via `parseBogotaInclusiveUtcRange(dateFrom, dateTo)`, `idUser: { in: userIds }`, and `status: { in: statuses }` **only when** `statuses.length > 0`.
- [x] 2.8 Add `build-aba-mfund-where.test.ts`: inclusion is SKANDIA + MFUND (assert `'SKANDIA'` and `'MFUND'`); always `idCurrency = 1`; empty `statuses` omits status predicate (includes `CANCELADO`); non-empty applies `status.in`; dates use Bogotá range helpers (never raw `new Date('YYYY-MM-DD')`).
- [x] 2.9 Add default filters + draft/apply reducer (`SET_DATE_*`, `SET_STATUSES`, `APPLY`, `CLEAR`): defaults = current Bogotá month via `currentBogotaMonthDateStrings`, Jerarquía **Toda**, Estado **Todos** (empty statuses). Invalid range (`dateFrom > dateTo`) blocks apply with `ABA_MFUND_UI.ERROR_DATE_RANGE`.

## 3. Services (KPI, ranking, detail, export, scope reuse)

- [x] 3.1 Reuse `intersectUserIdsWithViewerScope` from `produccion-real/services/produccion-real-scope.service.ts` in ABA-MFUND route helpers. Do not fork BFS / checkbox cascade. Empty `userIds` after intersect short-circuits services (zeros / empty / export 404) with no Prisma leak.
- [x] 3.2 Add pure `computeTicketPromedio(sum, count)` (`sum / count` if count > 0 else `0`) with unit tests (including the 1_000_000 / 4 → 250_000 case and count = 0).
- [x] 3.3 Implement `getAbaMfundKpis` using the shared WHERE: `abaTotal` = `sum(value)` + `count(*)` of all statuses after filters; `fondeado` = same WHERE + `status = FONDEADO`; `emitido` = same WHERE + `status = EMITIDO`; `ticketPromedio` via the helper. Empty `userIds` → all zeros, no Prisma. COP only; no TRM.
- [x] 3.4 Extract `sortRankingAgents` + `takeRanking(agents, 6)`: sort `totalValue` DESC, then `agentName` ASC, then `idUser` ASC; take `ABA_MFUND_RANKING_TAKE`. Unit tests: take 6, tie-break name then `idUser`, fewer than 6, empty.
- [x] 3.5 Implement `getAbaMfundRanking`: `groupBy: ['idUser']`, `_sum.value`, `_count.idBusiness`, same shared WHERE; load `User.name` / `lastName`; in-memory sort + take 6. Agent grain = `Business.idUser` (owner), never commission beneficiary. Embed up to 500 businesses per agent mapped to `CellBusinessRowView`, sorted `createdAt DESC, idBusiness DESC`. No fifth ranking-businesses route.
- [x] 3.6 Implement detail mapper (`mappers/`): columns Fecha de creación, Cliente (`Nombre - Apellido` with hyphen, not space-joined), Periodicidad (`buyPeriodicity.name`), Estado, Valor del Negocio (COP), Fecha de emisión (`dateIssued`), Fecha de Fondeo (`dateAnchored`). Display dates with `formatDateBogota`. COP money formatter: clone locally or import `formatReportMoney(..., 'COP')` only if it does not pull TRM types into the UI.
- [x] 3.7 Implement `getAbaMfundDetail`: cursor keyset `(createdAt DESC, idBusiness DESC)`, `take: limit+1`, encode/decode cursor like Producción Real. Do not add `isActive` as an extra filter. Same shared WHERE as KPIs.
- [x] 3.8 Implement Excel builder with `xlsx-js-style`: **one sheet** whose columns match the HU detail table (not Producción Real’s three-sheet workbook). Filename `aba_mfund_<iso-timestamp>.xlsx`.
- [x] 3.9 Implement `exportAbaMfundExcel`: cap `ABA_MFUND_EXPORT_MAX_ROWS` (5000) → oversize error (HTTP 413 at route); empty result or empty hierarchy → empty error (HTTP 404). Same WHERE as detail. No new `AuditAction` enum value.

## 4. API routes

- [x] 4.1 Clone `produccion-real-route-helpers.ts` → `aba-mfund-route-helpers.ts`: auth, 401/403/404 Spanish errors, `canViewReport(..., REPORT_CODES.ABA_MFUND)`, Zod parse, `intersectUserIdsWithViewerScope`. APIs MUST NOT check `reportes_aba_mfund`. No Prisma in helpers or routes.
- [x] 4.2 Add `GET /api/reports/aba-mfund/kpis` → `getAbaMfundKpis`; response `ApiResponse<T>`.
- [x] 4.3 Add `GET /api/reports/aba-mfund/detail` → `getAbaMfundDetail`; response `ApiResponse<T>`.
- [x] 4.4 Add `GET /api/reports/aba-mfund/ranking` → `getAbaMfundRanking`; response `ApiResponse<T>` with Top 6 + embedded businesses.
- [x] 4.5 Add `POST /api/reports/aba-mfund/export` → `exportAbaMfundExcel`; binary xlsx; on success `logAuditEvent` with `AuditAction.REPORT_EXPORTED` and details `Exportación de reporte ABA_MFUND: N fila(s), dateFrom–dateTo`, plus `userId`, `email`, `ipAddress`, `userAgent`. Map empty → 404, oversize → 413. Do not audit a successful export when permission is denied.

## 5. UI (page, shell, filters, KPIs, ranking heatmap, detail table, export)

- [x] 5.1 Add `src/app/dashboard/reportes/aba-mfund/page.tsx`: `auth()` → `isFeatureEnabledServer('reportes_aba_mfund')` (fallback `true`, else redirect `feature_disabled`) → `canViewReport(REPORT_CODES.ABA_MFUND)` (else `no_permissions`) → `DashboardLayout` + `AbaMfundShell`.
- [x] 5.2 Add `AbaMfundFilterProvider` (draft vs applied) and `AbaMfundShell` with provider order `HierarchySelectionProvider` → `AbaMfundFilterProvider` → content. Left card: reuse `HierarchyTreePanel` (default **Toda**). Do not add Compañía / Producto / TRM / Tipo de Aporte / Moneda controls. Do not call `useTrm`.
- [x] 5.3 Add filter bar: Desde / Hasta (`MonthRangePicker` + Bogotá month defaults), Estado (`MultiSelectFilter`, empty = **Todos**), Limpiar, Aplicar, Descargar Excel (green). Draft changes do not query until Aplicar. Empty hierarchy → zeros / empty table / export blocked with toast, no API leak.
- [x] 5.4 Add KPI row (COP): **ABA Total**, **Fondeado**, **Emitido**, **Ticket promedio ABA**.
- [x] 5.5 Add `AbaMfundRankingPanel` titled **ABA por Agente**: Top 6 table with heatmap-style expand-row (chevron, extra `<tr colSpan>`), render embedded businesses via `HeatmapCellBusinessRow` (Producto, Contrato, Valor, Estado, **Ir a negocio**). Multiple agents may stay expanded. Do **not** import `HeatmapTablePanel`.
- [x] 5.6 Add detail table with cursor infinite scroll like Producción Real and the seven HU columns (Cliente = `Nombre - Apellido`).
- [x] 5.7 Add client fetchers in `lib/aba-mfund-api.ts` and hooks using `AsyncState<T>` only: `useAbaMfundKpis`, `useAbaMfundDetail`, `useAbaMfundRanking`, `useAbaMfundExport`. Empty hierarchy short-circuits without fetch.
- [x] 5.8 Wire **Descargar Excel** to `useAbaMfundExport` using currently applied filters + hierarchy. Block export on empty hierarchy (toast) and surface 404/413 errors.

## 6. Tests

- [x] 6.1 Extend `can-view-report.test.ts` (and related helpers/hook tests) for `ABA_MFUND` allow/deny: ADMIN bypass, Performance Leader / Business Leader with permission, unauthorized category denied. ADMIN `knownReportCodes` includes `ABA_MFUND`.
- [x] 6.2 Extend `flagsmith-server.test.ts` so missing remote `reportes_aba_mfund` falls back to `true`.
- [x] 6.3 Extend `menu-builder-reportes.test.ts`: show **ABA-MFUND** iff `ABA_MFUND` is authorized; hide when not; keep **Producción Real** independently visible when only `PRODUCCION_REAL` is authorized; ADMIN authorized-codes list can include both.
- [x] 6.4 Add `src/app/api/reports/aba-mfund/__tests__/route.integration.test.ts`: 401/403; kpis/detail/ranking/export happy path; export 404 empty / 413 oversize; audit `REPORT_EXPORTED` on success; APIs do not require the feature flag.
- [x] 6.5 Add unit/component tests for filter defaults (Bogotá month, Toda, Todos), draft-vs-apply, Limpiar, empty hierarchy zeros, ranking expand-row (chevron + `HeatmapCellBusinessRow` columns), and Cliente `Nombre - Apellido`.
- [x] 6.6 Confirm Producción Real MFUND exclusion is untouched: existing `build-produccion-real-where.test.ts` still passes; ABA-MFUND tests never import `buildMfundExclusionWhere`.

## 7. Quality gates + architecture-enforcer

- [x] 7.1 Invoke architecture-enforcer on new `src/features/reports/aba-mfund/` code (feature folders, Zod, services vs routes, colocated tests, English identifiers, Spanish UI only in `ui-copy.ts`).
- [x] 7.2 Verify constraints: no Prisma in route handlers; no `prisma.*.delete()`; no `prisma/schema.prisma` or `prisma/ERD.md` edits; no `buildMfundExclusionWhere` edits; no `HeatmapTablePanel` import; no `leads-analytics` dependency; hooks use `AsyncState<T>`; audit reuses `REPORT_EXPORTED`.
- [x] 7.3 Run `npm run type-check && npm run lint` and targeted unit/integration suites for `aba-mfund`, `report-permissions`, `menu-builder-reportes`, and `flagsmith-server`.
