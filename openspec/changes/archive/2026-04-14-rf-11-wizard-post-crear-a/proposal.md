# Proposal: RF-11 — Two-step onboarding (create A → commission distribution)

## Intent

Deliver **PRD RF-11 / MAPA M16**: a **2-step** journey—**(1) Configuration** and **(2) Commission distribution** (category percentages in existing rules)—with a **visible stepper**, **incomplete** state until done, **resumption**, and **no blocking** of other flows. Today create returns to the list with no guided handoff.

## Scope

### In Scope

- Shared **2-step stepper** on create (`/configuraciones-producto/crear`) and code-first distribution (`config-distribucion-comisiones/...`): “Step X of 2”, `aria-current`, theme tokens.
- **Redirect** after successful `POST /api/product-configurations` to the **distribution** path for the new `code` (exact route in design).
- **Incomplete** indicator on list (and/or agreed surface); **Continue later** from step 2 optional.
- **Completion**: lock in **design/spec** either **derived** (e.g. ≥1 saved rule with valid category lines) or **DB flag** (`onboardingCompletedAt` / boolean + migration).
- **Tests**: redirect, stepper visibility, incomplete/complete logic.

### Out of Scope

- Changes to RF-01–RF-05 math/validation inside rule forms; **legacy** `[id]` distribution URLs (remain valid); product-catalog wizards (M10).

## Approach

Reuse current **create** and **distribution-by-code** UIs; add one **shared** stepper component. **Services** own incomplete/complete checks; routes stay thin. Post-create navigation uses **URL-encoded `code`**.

## Affected Areas

| Area | Impact | Note |
|------|--------|------|
| `src/features/product-configuration/` | Modified | Redirect, stepper, list badge |
| Commission distribution layout/pages | Modified | Step 2 stepper |
| `prisma` + services | Maybe | If explicit flag |
| `openspec/specs/product-configuration` | Delta | RF-11 |

## Risks

| Risk | L/M/H | Mitigation |
|------|-------|------------|
| Ambiguous “complete” | M | Spec + tests; optional DB flag |
| Redirect regressions | M | Integration test create → URL |

## Rollback Plan

Revert commits; restore list redirect. If column added: follow-up migration to drop.

## Dependencies

Non-null **`code`**; existing **code-first** routes.

## Success Criteria

- [ ] Stepper: step 1 on create, step 2 on distribution; a11y for current step.
- [ ] Create success navigates to distribution for that `code`.
- [ ] Incomplete setups visible until completion rule satisfied.
- [ ] Automated tests for redirect and completion logic.
