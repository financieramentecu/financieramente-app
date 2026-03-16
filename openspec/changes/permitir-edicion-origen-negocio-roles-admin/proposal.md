# Proposal: Enhanced Liquidations and Business Origin Editing

## Intent

Currently, the `Origen` field of a business is locked for editing, and liquidations (settlement process) lack sufficient detail and granularity. The goal is to:

1. Allow users with `Administrador` and `Asistente de Gerencia` roles to edit the business `Origen` field, provided that the business does not have any commission distributions in the `LIQUIDADO` state.
2. Enable liquidations to be processed at two levels of granularity: individually per record (distribution) or in bulk per file.
3. Enhance the detailed liquidation view to explicitly display complete information: contract number, client name, coach, amounts (business value, commissions), discount percentages, status in Spanish, and whether it was subject to a clawback.

This protects the integrity of processed liquidations while giving administrators necessary flexibility, and significantly improves the operational visibility of the settlement process.

## Scope

### In Scope

- **Business Origin Editing:**
  - Enable the `Origen` field (Frontend) for editing when the current user has the `ADMINISTRADOR` or `ASISTENTE_GERENCIA_OPERATIVA` role.
  - Update API route validation schema (`PUT /api/negocios/[id]`) to accept `idClientOrigin`.
  - Add backend validation to ensure the user has the appropriate role.
  - Add backend validation to block origin updates if any associated `ComissionDistribution` is in the `LIQUIDADO` state (returns exact error message).
- **Liquidation Granularity:**
  - Implement or update endpoints to support liquidating individual commission distribution records.
  - Ensure the existing "liquidate by file" process integrates seamlessly with the new individual record liquidations.
- **Detailed Liquidation View Enhancements:**
  - Update the Liquidations UI (tables/modals) to display: Contract Number, Client Name, Coach Name, Amounts (Base, Final Commission), Discount Percentages, Status (localized to Spanish), and a Clawback indicator.
  - Enhance backend queries/mappers to ensure all required fields are returned to the frontend efficiently.

### Out of Scope

- Modifying other currently locked business fields.
- Changing the calculation logic for commissions (we only block edits if already `LIQUIDADO`).
- Allowing non-administrative roles (e.g., `AGENTE`) to edit the origin field.

## Approach

**Business Origin Validation**

1. **Frontend (`ClientInfoSection`)**: Check user role (`ADMINISTRADOR` or `ASISTENTE_GERENCIA_OPERATIVA`). If true and in edit mode, enable the `clientOrigin` select field.
2. **Backend API (`PUT /api/negocios/[id]`)**: Validate role. Perform Prisma count query: `prisma.comissionDistribution.count({ where: { settlementCommission: { idBusiness: businessId }, status: 'LIQUIDADO' } })`. Block with specific 400 error message if `count > 0`.

**Granular Liquidation**

1. Define a new endpoint/action (e.g., `POST /api/liquidaciones/registro/[id]`) to change a single distribution's status to `LIQUIDADO`, utilizing existing transaction logic to ensure ledger consistency.
2. Ensure the UI for detailed file view includes action buttons for individual records, alongside the bulk file action.

**Detailed Liquidation View**

1. Update Prisma queries in the liquidation detail service to `include` relations for `business.client`, `business.user` (coach), discounts, and clawback status.
2. Map the technical statuses to Spanish (e.g., `PENDING` -> `Pendiente`, `LIQUIDADO` -> `Liquidado`).
3. Update the frontend table columns in the liquidation details component to render these new data points clearly.

## Affected Areas

| Area                                                                | Impact       | Description                                                                                                           |
| ------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------- |
| `src/features/negocios/lib/business-api.schemas.ts`                 | Modified     | Add `idClientOrigin` to `updateBusinessSchema`                                                                        |
| `src/app/api/negocios/[id]/route.ts`                                | Modified     | Add role and `LIQUIDADO` validations, process `idClientOrigin`                                                        |
| `src/features/negocios/components/sections/client-info-section.tsx` | Modified     | Conditionally enable `clientOrigin` select field                                                                      |
| `src/features/liquidaciones/...` (Backend services & routes)        | Modified/New | Add endpoint for granular liquidation and expand queries for detailed view                                            |
| `src/features/liquidaciones/components/...` (UI components)         | Modified     | Update data tables to include new columns (Contract, Coach, Status in ES, Clawback, etc.) and singular action buttons |

## Risks

| Risk                                                                  | Likelihood | Mitigation                                                                                                                             |
| --------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| UI does not properly display the 400 error message from the backend   | Low        | Ensure existing error handling propagates the API error message faithfully.                                                            |
| Performance hit on detailed liquidation queries due to deep relations | Medium     | Use targeted `select` statements in Prisma rather than broad `include` to fetch only necessary fields (Coach name, Client name, etc.). |
| Race conditions between single record and full file liquidation       | Low        | Wrap liquidation status changes inside strict database transactions with row locks if necessary.                                       |

## Rollback Plan

If issues arise:

- For Origin Edit: Revert the changes in `route.ts`, schema, and React components back to their locked state.
- For Liquidations: Disable the individual record liquidation buttons and revert the table columns to the previous simpler view.

## Dependencies

- User roles must be accurately provided by the authentication session (`currentUser.role.code`).

## Success Criteria

- [ ] A user with `ADMINISTRADOR` or `ASISTENTE_GERENCIA_OPERATIVA` role can successfully change the `Origen` of a business that has no `LIQUIDADO` commissions.
- [ ] The system accurately blocks origin changes on businesses with `LIQUIDADO` commissions, throwing the specified error.
- [ ] An admin can successfully liquidate a single commission record without liquidating the entire file.
- [ ] The detailed liquidation view displays the Contract, Client, Coach, Amounts, Discounts, Spanish Status, and Clawback indicator for all relevant records.
