# Proposal: RF-02 blur validation and form alignment

## Intent

Close the gap between PRD **RF-02** (clear validation on **blur** and **save**, no forced `'' → 0`) and current behavior: `PercentageField` already allows `undefined` while editing, but invalid blur reverts silently and React Hook Form validates mainly on submit. Optionally align “add row” defaults with product expectation.

## Scope

### In Scope

- Surface **Zod** (or equivalent) field errors after **blur** on `categories.*.percentage` in commission rule form, without breaking empty-in-progress state.
- Document or implement **handler order** so `PercentageField` blur and RHF `trigger` stay consistent (no double-submit or lost focus issues).
- Add **tests**: blur → visible `FormMessage`; missing percentage on a line → error on save; edge cases for `undefined` / `z.coerce`.
- Short **audit note** in proposal follow-up or tasks: other % inputs should use `PercentageField` (per `commission-distribution-ui` cross-module requirement).

### Out of Scope

- RF-01 visual-only tweaks beyond what blur validation needs.
- New modules or refactors outside distribution commission + shared `PercentageField`.
- Changing liquidation / `hasPortfolio` (RF-03 / MAPA §F).
- Replacing `z.coerce` globally.

## Approach

Prefer **RHF `onBlur` wrapper** on the percentage `FormField` that calls `await trigger(\`categories.${index}.percentage\`)` after `field.onBlur`, **or** `mode: 'onTouched'` on the form if it does not regress description/other fields. If internal `PercentageField` blur clears invalid text before trigger, ensure the **committed** RHF value still allows Zod to emit the right message (may require syncing invalid string state or triggering before revert—design detail for **sdd-design**).

Optional: change **append** default from `percentage: 1` to `undefined` only if category placeholder and Zod allow partial rows until submit (product decision).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/shared/ui/percentage-field.tsx` | Modified | May need `onBlur` ordering hook or prop to cooperate with RHF |
| `src/features/distribution-commission/components/category-percentage-row.tsx` | Modified | Wire blur + trigger |
| `src/features/distribution-commission/components/commission-rule-form.tsx` | Modified | Form mode / defaults for new rows |
| `src/features/distribution-commission/lib/commission-rule-schemas.ts` | Maybe | Tests / optional `.optional()` for draft rows |
| `src/features/shared/ui/percentage-field.test.tsx` | Modified | New cases if API changes |
| `openspec/specs/commission-distribution-ui/spec.md` | Modified | Delta: RF-02 blur scenarios |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Blur vs revert race hides Zod errors | Med | Prototype order in design; integration test |
| `onTouched` noise on description | Low | Scope triggers to percentage fields only |
| `idCategory: 0` + empty % confuses users | Med | Keep or change append default per product |

## Rollback Plan

Revert the PR that touches RHF/`PercentageField`; restore prior `commission-rule-form` and `category-percentage-row`. No migration. Git revert single merge commit.

## Dependencies

- Product call on **append default** (`1` vs `undefined`).
- Existing spec `openspec/specs/commission-distribution-ui/spec.md` (extend with RF-02).

## Success Criteria

- [ ] After leaving a percentage field with invalid or empty value (when line is required), user sees a **clear** inline error matching Zod, on blur or on attempted save per agreed rule.
- [ ] Clearing the field still stores **`undefined`**, not `0`, until user commits a number.
- [ ] Unit/integration tests cover blur and submit paths.
- [ ] No regression on sum ≤ 100 and RF-01 display for saved values.
