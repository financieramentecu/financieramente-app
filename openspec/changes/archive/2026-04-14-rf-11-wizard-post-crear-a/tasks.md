# Tasks: RF-11 — Two-step onboarding (create A → commission distribution)

## Phase 1: Service & types

- [x] 1.1 Add `isDistributionSetupComplete(idProductConfiguration: number)` in `src/features/product-configuration/services/product-configuration.service.ts` using Prisma: true iff ≥1 `ProductPercentageCommissionCategory` exists for any PPC under that configuration.
- [x] 1.2 Add `distributionSetupIncomplete: boolean` (or derive from `complete`) on the list row type in `src/features/product-configuration/types/product-configuration.types.ts` and mapper output used by the list.

## Phase 2: List API & data loading

- [x] 2.1 Extend the product-configuration **list** service used by `GET /api/product-configurations` (`src/app/api/product-configurations/route.ts` + service layer) to compute **batch** incomplete flags for all IDs in the page (single query or efficient `IN` subquery—avoid N+1).
- [x] 2.2 Map the flag through `prismaProductConfigToProductConfig` or a dedicated list mapper in `src/features/product-configuration/mappers/product-configuration.mapper.ts`.
- [x] 2.3 Update `src/features/product-configuration/lib/product-configuration-api.ts` types if the client expects the new field.

## Phase 3: Stepper component & create flow

- [x] 3.1 Create `src/features/product-configuration/components/configuration-distribution-stepper.tsx` with `currentStep: 1 | 2`, Spanish labels, `aria-current` on the active step, “Paso X de 2” text.
- [x] 3.2 Render the stepper with **step 1** on `src/features/product-configuration/components/product-configuration-create-client.tsx` (or the parent page under `src/app/dashboard/configuraciones-producto/crear/page.tsx`).
- [x] 3.3 In `product-configuration-create-client.tsx`, after a successful create, navigate to **paso 2** (distribución): `router.replace(\`/dashboard/config-distribucion-comisiones/${encodeURIComponent(code)}/reglas/crear\`)`. Implementation uses the value **returned** by `createProductConfiguration` in `handleSubmit` (not only `useEffect` on `createState`) so redirect is reliable; success uses `response.data != null` in the mutation hook.

## Phase 4: `[code]` layout & dedupe `DashboardLayout`

- [x] 4.1 Add `src/app/dashboard/config-distribucion-comisiones/[code]/layout.tsx`: wrap `children` with `DashboardLayout` + stepper **step 2** + shared header slot if needed.
- [x] 4.2 Update `src/app/dashboard/config-distribucion-comisiones/[code]/reglas/page.tsx`: remove outer `DashboardLayout` (and duplicate titles if lifted), leave rules body only.
- [x] 4.3 Update `src/app/dashboard/config-distribucion-comisiones/[code]/reglas/crear/page.tsx` and `.../reglas/editar/[ruleId]/page.tsx` the same way so **no double** `DashboardLayout`.
- [x] 4.4 Set `currentPage` (or equivalent) on the layout to match existing menu context for “Config. distribución de comisiones”.

**Note (as implemented):** Stepper **paso 2** appears on the **crear distribución** page (and loading states there), not on every `[code]` child; layout is `DashboardLayout` only without embedding the stepper globally.

## Phase 5: List UI & tests

- [x] 5.1 In `src/features/product-configuration/components/product-configurations-table.tsx`, show a badge (or label) when `distributionSetupIncomplete` is true; no indicator when false.
- [x] 5.2 Unit test: `isDistributionSetupComplete` — returns false with no category rows, true with at least one (mock Prisma or integration DB).
- [x] 5.3 Unit/component test: stepper renders step 1 vs 2 and exposes `aria-current` on the active step.
- [x] 5.4 Integration or unit test: after successful create, navigation target includes `/config-distribucion-comisiones/` + encoded `code` + `/reglas/crear` (mock `useRouter` / mutation); see `product-configuration-create-client.test.tsx`.

## Phase 6: Specs & changelog (optional)

- [x] 6.1 Sync delta spec into `openspec/specs/product-configuration/spec.md` when archiving the change; delta + tasks updated in-repo; root `CHANGELOG.md` updated for RF-11 follow-ups under `[1.0.0-beta.5]`.

## Phase 7: Follow-up fixes & UX (applied post–RF-11 core)

- [x] 7.1 **Seeded PPC vs create:** Creating `ProductConfiguration` already inserts an active `ProductPercentageCommission` without categories. The “crear distribución” screen must **update** that row (PUT) when a placeholder exists, not POST a second rule (API rejects duplicate active). Implemented: `findActiveRulePendingDistribution`, `useDistributionWizardFormMode`, wired on `config-distribucion-comisiones/[code]/reglas/crear` and `distribucion-comisiones/[id]/reglas/crear`.
- [x] 7.2 **By-code resolution with encoded characters:** Dynamic segment may stay percent-encoded (`C%2BS-…`). Normalize with `normalizeProductConfigurationCodeParam` (`decodeURIComponent`) in `use-product-configuration-by-code.ts` and `GET /api/product-configurations/by-code/[code]`.
- [x] 7.3 **Breadcrumbs:** `buildBreadcrumbsFromPathname` decodes segment labels, builds `href` with per-segment `encodeURIComponent` after decode, adds labels for `config-distribucion-comisiones`, `configuraciones-producto`, `reglas`.
- [x] 7.4 **List API tests:** Prisma mock extended with `productPercentageCommissionCategory.findMany` where list enrichment requires it.
- [x] 7.5 **UX:** Centered stepper (`configuration-distribution-stepper.tsx`); **Agregar Categoría** as outline action button (`commission-rule-form.tsx`).
- [x] 7.6 **Table column:** “Distribución” column shows pending vs configured + **Continuar configuración** link to `…/reglas/crear` when incomplete.
