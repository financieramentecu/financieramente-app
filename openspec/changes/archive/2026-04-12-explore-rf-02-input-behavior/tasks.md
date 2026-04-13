# Tasks: RF-02 blur validation and form alignment

## Phase 1: Tests first (TDD)

- [x] 1.1 `commission-rule-schemas.test.ts`: add failing cases for line with `percentage: undefined` / missing key — `categoryPercentageSchema` / `createCommissionRuleSchema` MUST fail with clear message (delta spec: empty after blur / save).
- [x] 1.2 New RTL test file (e.g. `category-percentage-row.test.tsx` or `commission-rule-form.test.tsx`): **RED** — render form with `Form` + one row (valid `idCategory`, clear `%`, blur) — expect `FormMessage` / destructive text (spec: validation on blur).

## Phase 2: Core wiring

- [x] 2.1 `category-percentage-row.tsx`: `useFormContext` → `trigger`; on percentage `PercentageField`, call `field.onBlur(e)` then `queueMicrotask(() => void trigger(\`categories.${index}.percentage\`))` (match `design.md`).
- [x] 2.2 Same file: ensure `name` / `FieldPath` matches RHF + Zod path; no global `useForm` `mode` change in `commission-rule-form.tsx` unless a regression appears.

## Phase 3: GREEN + regression

- [x] 3.1 Run RTL from 1.2 — **GREEN** after 2.1; add case: valid value in [1,100] after error → message clears (spec: valid after blur).
- [x] 3.2 RTL or extend: blur with `0` or `101` → inline error (spec: out-of-range after blur).
- [x] 3.3 Manual or RTL: submit with sum > 100 still shows sum handling (`handleInvalidSubmit` toast) and blocks save (spec: save still enforces).

## Phase 4: A11y (conditional)

- [x] 4.1 Quick check: focused `%` input has `aria-invalid` when error exists; if `FormControl`/`Slot` only hits wrapper `div`, update `percentage-field.tsx` to forward `aria-invalid` (and related) from `...rest` onto `<input>` (`design.md` open question).

## Phase 5: Traceability / audit

- [x] 5.1 Add short comment or `openspec` note: other editable `%` fields SHOULD reuse `PercentageField` (proposal cross-module audit).
