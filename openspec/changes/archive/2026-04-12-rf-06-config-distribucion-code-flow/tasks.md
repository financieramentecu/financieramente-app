# Tasks: RF-06 config distribución by code

## Phase 1: Data and resolver (RF-07)

- [x] 1.1 Audit staging/prod for `product_configuration.code` nulls and duplicates; document runbook.
- [x] 1.2 Add migration SQL to backfill null `code` (reuse `buildProductConfigurationCode` logic or one-off script in `prisma/`).
- [x] 1.3 Update `prisma/schema.prisma`: `code String` NOT NULL + `@unique`; generate migration.
- [x] 1.4 Create `src/features/product-configuration/services/product-configuration.service.ts` with `getProductConfigurationByCode(code: string)` returning domain DTO or null (Prisma `findUnique` where `{ code }`).
- [x] 1.5 Add unit tests for service with mocked Prisma (`product-configuration/__tests__/services/...`).
- [x] 1.6 Harden migration `20260412190000_product_configuration_code_not_null_unique`: quoted `public.*` tables/columns; `UPDATE … FROM` as comma join + `WHERE` (avoid `42P01` invalid `pc` reference); `LEFT(..., 50)`; RUNBOOK: P3006/P1014, P3009 (`migrate resolve`), Neon `DIRECT_URL`.

## Phase 2: API by code

- [x] 2.1 Create `src/app/api/product-configurations/by-code/[code]/route.ts`: `GET`, `auth()`, delegate to service, `ApiResponse`, 404 when missing.
- [x] 2.2 Add route tests mirroring `src/app/api/product-configurations/__tests__/route.test.ts` patterns.
- [x] 2.3 Extend `src/features/product-configuration/lib/product-configuration-api.ts` with `getByCode(encodedCode)` calling the new endpoint.

## Phase 3: Navigation and entry UI (RF-06)

- [x] 3.1 Add **Config. distribución de comisiones** sub-item in `src/lib/navigation/menu-items.tsx` under Administración → `/dashboard/config-distribucion-comisiones`.
- [x] 3.2 Create `src/app/dashboard/config-distribucion-comisiones/page.tsx`: empty state, combobox/async search (reuse `GET /api/product-configurations` with search or by-code prefetch list per design decision).
- [x] 3.3 On select, `router.push` to `/dashboard/config-distribucion-comisiones/${encodeURIComponent(code)}/reglas`.

## Phase 4: Rules pages by code + basePath

- [x] 4.1 Create `src/app/dashboard/config-distribucion-comisiones/[code]/reglas/page.tsx`: decode `params.code`, fetch config by code (client via API 2.3), then reuse `useCommissionRules(id)` + layout copy from legacy `distribucion-comisiones/[id]/reglas/page.tsx`; header **Buscar nueva distribución** → entry search.
- [x] 4.2 Create `[code]/reglas/crear/page.tsx` and `[code]/reglas/editar/[ruleId]/page.tsx` passing `productConfigId` + `distributionBasePath` into `CommissionRuleForm`.
- [x] 4.3 Add `distributionBasePath` prop to `commission-rule-form.tsx` (default `/dashboard/distribucion-comisiones/${productConfigId}`); replace hardcoded `router.push` targets.
- [x] 4.4 Add `distributionBasePath` to `commission-rules-table.tsx`; fix `Link` hrefs for crear/editar; keep legacy callers passing id-based base path.

## Phase 5: RF-10 table actions

- [x] 5.1 Replace row `DropdownMenu` in `commission-rules-table.tsx` with visible **Edit** `Link` and **Assign** `Button` (product-approved label).
- [x] 5.2 RTL test: actions visible without opening menu; hrefs use `distributionBasePath`.

## Phase 6: Legacy verification and docs

- [ ] 6.1 Confirm `distribucion-comisiones/[id]/**` still works for direct URLs / bookmarks (manual or Playwright smoke); product list no longer links there.
- [x] 6.2 Update `src/app/api/AGENTS.md` with `GET /api/product-configurations/by-code/[code]`.
- [x] 6.3 `product-configurations-table.tsx`: single **Distribución de Comisión** → `/dashboard/config-distribucion-comisiones/{code}/reglas` (`encodeURIComponent`); if no `code`, link to entry `/dashboard/config-distribucion-comisiones`. Removed **Por código** and legacy id-based CTA from table.
