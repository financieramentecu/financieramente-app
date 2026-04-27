# Design: RF-11 — Two-step onboarding (create A → commission distribution)

## Technical Approach

Add a **shared 2-step stepper** (“Configuration” / “Distribution”) and **post-create navigation** to the existing **code-first** distribution routes. **Completion** and **incomplete** list state come from a **derived** DB check (no new column in v1): at least one `ProductPercentageCommission` for the configuration has **≥1** `ProductPercentageCommissionCategory` row with saved distribution data. `createState.data.code` from `useProductConfigurationMutations` already exposes `code` after `POST` for `encodeURIComponent` and `router.push`.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Post-create redirect target | `/dashboard/config-distribucion-comisiones/{encodedCode}/reglas` | `/reglas/crear` only | List gives context + header; user can click **Nueva Distribución**. If product wants one less click, switch to `.../reglas/crear` in a small follow-up. |
| Completion signal | Derived query (category rows exist) | `onboardingCompletedAt` column | Matches proposal; avoids migration until needed; aligns with “percentages per category” semantics. |
| Stepper placement | Shared component + `[code]/layout.tsx` for step 2 | Duplicate stepper per page | Single layout under `config-distribucion-comisiones/[code]/` wraps `reglas`, `reglas/crear`, `reglas/editar/...` with step 2; create page imports same component with step 1. |
| Incomplete in list | Extend list payload or client fetch | N+1 per row | Prefer **batch** or **extra field** from existing list service: one query pattern listing configs with a boolean `distributionSetupIncomplete` computed via SQL/subquery or map after fetch (document if list is already paged). |

## Data Flow

```
Create form POST → ApiResponse<ProductConfiguration> → createState.success
    → router.push(`/dashboard/config-distribucion-comisiones/${encodeURIComponent(code)}/reglas`)

List GET → service enriches each row with incomplete flag
    → badge when incomplete

[code]/reglas/* → layout renders stepper (step 2)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/product-configuration/components/configuration-distribution-stepper.tsx` | Create | Presentational stepper: `currentStep`, labels, a11y (`aria-current`). |
| `src/app/dashboard/configuraciones-producto/crear/page.tsx` (or create client parent) | Modify | Render stepper above form; step 1. |
| `src/features/product-configuration/components/product-configuration-create-client.tsx` | Modify | On success: `router.push` to distribution `reglas` with `code` from `createState.data`; keep toast. |
| `src/app/dashboard/config-distribucion-comisiones/[code]/layout.tsx` | Create | Client or server wrapper: `DashboardLayout` + stepper step 2; `children` for nested routes. |
| `src/app/dashboard/config-distribucion-comisiones/[code]/reglas/page.tsx` | Modify | Remove duplicate outer layout if moved to `[code]/layout` (avoid double layout). |
| `src/features/product-configuration/services/product-configuration.service.ts` (or distribution service) | Modify | `isDistributionSetupComplete(idProductConfiguration): Promise<boolean>` via Prisma count/join on categories. |
| List API + mapper / table | Modify | Expose incomplete flag; show badge in `product-configurations-table.tsx`. |

**Note:** Introducing `[code]/layout.tsx` requires moving `DashboardLayout` + stepper from child pages into the layout and leaving pages as content-only—verify each `[code]` page to prevent double `DashboardLayout`.

## Interfaces / Contracts

```ts
// Stepper
interface ConfigurationDistributionStepperProps {
	readonly currentStep: 1 | 2
	readonly className?: string
}

// Service (product-configuration or distribution-commission)
export async function isDistributionSetupComplete(
	idProductConfiguration: number
): Promise<boolean>
```

List DTO: add optional `readonly distributionSetupIncomplete?: boolean` (or `complete`) on row type used by table.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `isDistributionSetupComplete` | Prisma mock or test DB: config with/without category rows |
| Unit | Stepper | Renders step 1 vs 2, `aria-current` |
| Integration | Create client redirect | Mock router + mutation success with `code` → expect path |

## Migration / Rollout

No migration for v1 (derived completion). Optional later: `onboardingCompletedAt` if product needs explicit override.

## Open Questions

- [ ] Confirm redirect to **`/reglas`** vs **`/reglas/crear`** for first-time onboarding.
- [ ] List API: single query vs post-fetch map for incomplete flag at scale.
- [ ] Refactor `[code]` pages to avoid **double `DashboardLayout`** when layout is added—may be one task.
