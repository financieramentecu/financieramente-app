# Tasks: Ajustes en Creación de Negocio, Excel y Fondeo

## Phase 1: Backend & Excel Logic (Data/API)

- [x] 1.1 Update `src/features/negocios/lib/map-business-to-export-row.ts`: Modify `negociosExportColumnHeaders` and `businessesToExportRows` to accept `dateFrom` and `dateTo`. Remove `Mes`, `Año`, `Es anualidad` columns. Add `Celular`. Conditionally prepend `Fecha inicial fondeo` and `Fecha final fondeo`.
- [x] 1.2 Update `src/app/api/negocios/export/route.ts`: Extract `dateFrom` and `dateTo` from the validated body and pass them to the mapper functions.
- [x] 1.3 Update `src/app/api/negocios/[id]/fondear-anualidades/route.ts`: Extract the `dateAnchored: now` update for the parent business out of the `if (parentWasEmitido)` block so it executes unconditionally for every funded installment.

## Phase 2: UI Form Component Restructuring

- [x] 2.1 Update `src/features/negocios/components/sections/business-info-section.tsx`: Add inputs for `contract`, `company`, `product`, and `terms`. Organize the exact visual order: contrato, compañia, producto, periodicidad, plazo, moneda, valor, agente. Update `BusinessInfoSectionProps` to include required catalogs and `contractDisabled` logic.
- [x] 2.2 Update `src/features/negocios/components/sections/client-info-section.tsx`: Remove the `contract` input and its related dependencies from the client section.
- [x] 2.3 Delete `src/features/negocios/components/sections/product-info-section.tsx`: Remove the file and component completely.

## Phase 3: UI Form Wiring (Create & Edit)

- [x] 3.1 Update `src/features/negocios/components/create-business-form.tsx`: Remove `ProductInfoSection` rendering. Pass all required catalogs, disabled flags, and event handlers to the unified `BusinessInfoSection`.
- [x] 3.2 Update `src/features/negocios/components/edit-business-form.tsx`: Replicate the same wiring changes as the create form for the edit view.

## Phase 4: Testing & Verification

- [x] 4.1 Update `src/features/negocios/lib/__tests__/map-business-to-export-row.test.ts`: Adjust unit tests to expect the new columns (with and without date filters) and verify the removal of old columns.
- [x] 4.2 Verify integration: Run `npm run test:unit` and `npm run type-check` to ensure no typing regressions from the prop movements.
