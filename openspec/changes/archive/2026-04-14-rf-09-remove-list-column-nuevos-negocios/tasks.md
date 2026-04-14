# Tasks: Remove "New Business Distribution" list column (RF-09)

## Phase 1: Spec and Contract Alignment

- [x] 1.1 Update `openspec/specs/product-configuration/spec.md`: remove **Active Distribution Display** and add RF-09 requirement text from delta.
- [x] 1.2 Verify `openspec/changes/rf-09-remove-list-column-nuevos-negocios/specs/product-configuration/spec.md` remains the source delta for archive sync.

## Phase 2: TDD — Table behavior (RED → GREEN → REFACTOR)

- [x] 2.1 **RED** Add RTL assertion in `src/features/product-configuration/__tests__/components/product-configurations-table.test.tsx` that header **Distribución para nuevos negocios** is absent.
- [x] 2.2 **GREEN** Remove the `newBusinessesDistributionDescription` `ColumnDef` from `src/features/product-configuration/components/product-configurations-table.tsx`.
- [x] 2.3 **REFACTOR** Keep table readability (column order, spacing, and CTA `Distribución de Comisión` behavior unchanged).
- [x] 2.4 Run focused test file: `npx vitest run --config vitest.unit.config.ts src/features/product-configuration/__tests__/components/product-configurations-table.test.tsx`.

## Phase 3: TDD — Domain cleanup (RED → GREEN → REFACTOR)

- [x] 3.1 **RED** Add mapper expectation in `src/features/product-configuration/__tests__/mappers/product-configuration.mapper.test.ts` that mapped object no longer exposes `newBusinessesDistributionDescription`.
- [x] 3.2 **GREEN** Remove `newBusinessesDistributionDescription` from `src/features/product-configuration/types/product-configuration.types.ts`.
- [x] 3.3 **GREEN** Remove `activeDistribution` and `newBusinessesDistributionDescription` mapping logic from `src/features/product-configuration/mappers/product-configuration.mapper.ts`.
- [x] 3.4 **GREEN** Update fixture shape in `src/features/product-configuration/__tests__/fixtures/mock-product-configuration.ts` to match the new domain type.
- [x] 3.5 **REFACTOR** Remove obsolete comments tied to active-description display logic.
- [x] 3.6 Run focused mapper tests: `npx vitest run --config vitest.unit.config.ts src/features/product-configuration/__tests__/mappers/product-configuration.mapper.test.ts`.

## Phase 4: Integration Verification

- [x] 4.1 Run combined focused suite for touched tests (table + mapper + fixture dependents) under `src/features/product-configuration/__tests__/`.
- [x] 4.2 Smoke-check both entry points that reuse `ProductConfigurationsTableSection`: `/dashboard/configuraciones-producto` and `/dashboard/distribucion-comisiones` (column absent, CTA still visible).

## Phase 5: Final Validation and Documentation

- [x] 5.1 Run `npm run test:unit` and ensure zero regressions.
- [x] 5.2 Update change notes in `openspec/changes/rf-09-remove-list-column-nuevos-negocios/` if scope deviates during apply.
- [x] 5.3 Confirm success criteria from proposal: no list column, tests green, main spec aligned with RF-09.
