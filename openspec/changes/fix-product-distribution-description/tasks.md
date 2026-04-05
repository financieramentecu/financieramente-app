## 1. API Modifications

- [x] 1.1 Update `productConfigurationInclude` in `src/app/api/product-configurations/route.ts` to include `productPercentageCommissions` (plural).
- [x] 1.2 Update `productConfigurationInclude` in `src/app/api/product-configurations/[id]/route.ts` to include `productPercentageCommissions` (plural).
- [x] 1.3 Add logic to the `POST` route in `src/app/api/product-configurations/[id]/distribution-commission/route.ts` to check if an active distribution already exists before allowing a new one.
- [x] 1.4 Add logic to the `PATCH` route in `src/app/api/product-configurations/[id]/distribution-commission/[ruleId]/route.ts` to block activation if another distribution is already active.

## 2. Mapper and Data Transformation

- [x] 2.1 Update `PrismaProductConfigurationWithIncludes` in `src/features/product-configuration/mappers/product-configuration.mapper.ts` to include `productPercentageCommissions`.
- [x] 2.2 Update `prismaProductConfigToProductConfig` to find the active distribution in the `productPercentageCommissions` array and assign its description to `newBusinessesDistributionDescription`.

## 3. UI Feedback and Validation

- [x] 3.1 Review `src/features/product-configuration/components/product-configurations-table.tsx` to ensure it uses the updated `newBusinessesDistributionDescription` field.
- [x] 3.2 Add logic to `src/app/dashboard/distribucion-comisiones/[id]/reglas/page.tsx` to intercept the "Nueva Distribución" action and show a warning if an active rule exists.
- [x] 3.3 Update `src/features/distribution-commission/components/commission-rules-table.tsx` to include a validation check in `handleToggleActive` that prevents activating a rule if another is already active.

## 4. Verification

- [x] 4.1 Verify that the "Distribución para nuevos negocios" column correctly shows the active distribution's description in the administration view.
- [ ] 4.2 Manually test the creation of a new distribution when one is already active to confirm the UI block.
- [ ] 4.3 Manually test the activation of a distribution when another one is already active to confirm the UI block and message accuracy.
- [ ] 4.4 Verify backend validation using Curl/Postman to ensure the constraint is enforced at the API level.
