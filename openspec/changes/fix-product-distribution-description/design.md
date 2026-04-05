## Context
The product configuration administration table displays a column "Distribución para nuevos negocios" that shows the description of the commission distribution. Currently, it only shows the description of the distribution specifically linked via `idProductPercentageCommissionNewBusinesses`. This linked distribution may be inactive while another one is active, leading to incorrect display data.
Additionally, the system allows multiple distributions to be marked as active for the same product configuration, which causes ambiguity in the settlement engine.

## Goals / Non-Goals
**Goals:**
- Ensure the table always shows the description of the currently active commission distribution for each product configuration.
- Prevent the creation of a new distribution if one is already active.
- Prevent the activation of an inactive distribution if another is already active.
- Implement both frontend (UI blocks) and backend (API validation) constraints.

**Non-Goals:**
- Allowing multiple active distributions (even with warnings).
- Changing the settlement engine itself (this fix focuses on the configuration layer).

## Decisions

### 1. Active Distribution Display
- **Include All Distributions in API**: Instead of just fetching the `productPercentageCommissionNewBusinesses` relation, we will fetch the `productPercentageCommissions` (plural) relation in the Prisma include.
- **Dynamic Selection in Mapper**: The `prismaProductConfigToProductConfig` mapper will iterate through the `productPercentageCommissions` array to find the one with `active: true`. It will then use this distribution's description for the `newBusinessesDistributionDescription` field.

### 2. Guardrails for Uniqueness (Frontend)
- **Creation Guard**: In `CommissionRulesPage`, we will check if any existing rule is active. If so, "Nueva Distribución" will show an `AlertDialog` instead of navigating.
- **Activation Guard**: In `CommissionRulesTable`, when toggling a rule to active, we will check if another rule is already active. If so, we will show an `AlertDialog` blocking the action.

### 3. Backend Validation (API)
- **POST Route**: The `POST` endpoint will check for any existing active distribution for the given `productConfigId` before creating a new one (as new ones are active by default).
- **PATCH Route**: The `PATCH` endpoint will verify that no other distribution is active before setting `active: true`.

## Risks / Trade-offs
- **Race conditions**: While unlikely in this admin context, the backend validation ensures that concurrent requests don't violate the constraint.
- **Data Cleanup**: If existing products already have multiple active distributions, the UI might show the first one found until the user manually deactivates the others.
