# Tasks: H5 — Reporte Excel (negocios)

## Phase 1: Foundation

- [x] 1.1 Add `@date-fns/tz` to `package.json`; install deps.
- [x] 1.2 Implement `src/features/negocios/lib/bogota-date-range.ts` (`YYYY-MM-DD` pair → UTC bounds, civil days `America/Bogotá`).
- [x] 1.3 Implement `src/features/negocios/lib/build-business-list-where.ts` (visibility, `status`, `search`, optional `dateAnchored` non-null when range applies).
- [x] 1.4 Extend `business-api.schemas.ts`: list `dateFrom`/`dateTo`; `negociosExportBodySchema`; wire `toBusinessListFilterInput`.
- [x] 1.5 Add `EXPORT_MAX_ROWS` in `src/features/negocios/lib/export-limits.ts` (document cap for 413).

## Phase 2: Export data shaping

- [x] 2.1 Implement `business-export-include.ts` (includes + `annualPayments` order).
- [x] 2.2 Implement `resolve-leader-chain-export.ts` (memoized upline chain).
- [x] 2.3 Implement `map-business-to-export-row.ts` + header order aligned with SheetJS (`negociosExportColumnHeaders`).

## Phase 3: API routes and client

- [x] 3.1 Refactor `src/app/api/negocios/route.ts` to `buildBusinessListWhere` + parsed query dates.
- [x] 3.2 Implement `src/app/api/negocios/export/route.ts` (POST, roles, 404/413, xlsx blob).
- [x] 3.3 Add `exportReport` to `src/features/negocios/services/business.service.ts`.

## Phase 4: UI wiring

- [x] 4.1 Implement `src/features/negocios/hooks/use-business-export.ts`.
- [x] 4.2 Extend `BusinessListParams`, `useBusinesses`, `negocios-page-client.tsx` for filters + export payload.
- [x] 4.3 Update `MisNegociosPage` / `BusinessTableSection`: funding date range + Exportar Excel (roles H5).

## Phase 5: Testing (shipped)

- [x] 5.1 Unit tests `bogota-date-range.ts`.
- [x] 5.2 Unit tests `build-business-list-where.ts`.
- [x] 5.3 Unit tests `map-business-to-export-row.ts`.
- [x] 5.4 Integration `export/__tests__/route.test.ts`: 403 for `AGENTE`.
- [x] 5.5 `list-export-filter-parity.test.ts`: GET query vs POST body → same `BusinessListFilterInput` / `where`.

## Phase 6: Residual verification & closure (optional)

- [x] 6.1 Integration test: `POST /api/negocios/export` returns **200**, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, non-empty body (mock `auth`, Prisma `count`/`findMany` as needed).
- [x] 6.2 Integration test: `count` **>** `EXPORT_MAX_ROWS` → **413** (mock Prisma `count`; assert no silent 200).
- [x] 6.3 E2E smoke `e2e/negocios-export.spec.ts` (+ `auth` bypass por `x-test-user-email`): botón Exportar Excel visible solo ADMIN; AGENTE sin botón. Paridad lista vs export por ids sigue opcional en staging.
- [x] 6.4 Inventario PII §4.5 documentado en `design.md` para stakeholders/legal; **sin** ajuste de columnas en código hasta sign-off explícito (PRD lista mínima TBD).
- [x] 6.5 On archive: sync delta from `openspec/changes/h5-reporte-excel-negocios/specs/negocios/spec.md` into `openspec/specs/negocios/spec.md` per team process.
