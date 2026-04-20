# Design: RF-02 blur validation and form alignment

## Technical Approach

Keep **`PercentageField`** behavior for value semantics (empty → `undefined`, no `'' → 0`). Add **post-blur Zod validation** for `categories.*.percentage` via React Hook Form **`trigger`**, scoped to that path only—**no** global `mode: 'onTouched'` on the form (avoids extra validation noise on `description`).

`PercentageField` already ends `handleBlur` with `onBlur?.(e)` after `onChange`, so **`field.onBlur` runs when RHF value matches the committed blur**. RHF may apply `onChange` before `onBlur` in the same tick; schedule **`trigger`** on a **microtask** (`queueMicrotask`) after `field.onBlur()` so resolver reads updated values reliably.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Where to trigger validation | `CategoryPercentageRow` percentage `FormField` | `mode: 'onTouched'` on `useForm` | Targets only `%` fields; description stays submit/touched-on-demand |
| Async ordering | `field.onBlur()` then `queueMicrotask(() => trigger(name))` | `setTimeout(0)`; trigger inline | Microtask is minimal delay; standard fix for RHF sync batching |
| Change `PercentageField` | **Avoid** for MVP | New `onAfterCommit` API | Current `onBlur` ordering already matches needs |
| Invalid parse on blur | Keep existing revert + `onChange(undefined)` | Keep invalid text visible | Zod on `undefined` yields required/range error; `FormMessage` shows |
| Append default | **Unchanged** (`percentage: 1`) until product decides | `undefined` + relaxed schema | Avoid schema/row-placeholder churn in this change |

## Data Flow

```
User blurs % input
  → PercentageField handleBlur (commit onChange: number | undefined)
  → field.onBlur()  [RHF: touched]
  → queueMicrotask → trigger(`categories.i.percentage`)
       → zodResolver runs category line + superRefine sum
  → formState.errors updated
  → FormMessage renders under row
```

Submit path unchanged: full schema on `handleSubmit`; `handleInvalidSubmit` keeps sum toast.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `category-percentage-row.tsx` | Modify | `useFormContext` → `trigger`; extend percentage `render` with `fieldState` if needed; compose `onBlur` on `PercentageField` |
| `commission-rule-form.tsx` | None (expected) | Parent already provides `Form` / provider |
| `percentage-field.tsx` | Modify only if a11y gap | If `Slot` lands `aria-invalid` on wrapper, forward to `<input>` via existing `...rest` |
| `percentage-field.test.tsx` | Optional | No API change if no PercentageField edits |
| `commission-rule-form` tests or RTL test | Add | Blur empty `%` with valid category → message; blur valid → no error |
| `commission-rule-schemas.test.ts` | Add | `undefined` / missing `percentage` safeParse expectations |

## Interfaces / Contracts

- `CategoryPercentageRow` must render **inside** `<Form>` (`FormProvider`). Already true in `CommissionRuleForm`.
- Blur contract: `PercentageField` continues to call **`onBlur` after** internal value commit (no reorder).

```ts
// Pseudocode inside percentage FormField render
onBlur={(e) => {
  field.onBlur()
  queueMicrotask(() => {
    void trigger(`categories.${index}.percentage` as const)
  })
}}
```

Use `FieldPath<CommissionRuleFormData>` or string template consistent with existing `name` prop.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Schema + `undefined` | `commission-rule-schemas.test.ts` |
| Component | Blur → `FormMessage` | RTL: render form with one row, blur empty %, assert destructive text |
| Regression | Sum > 100 | Existing flow + submit invalid handler |

## Migration / Rollout

No migration required. Feature is UI validation only.

## Open Questions

- [ ] Product: default **append** row still `percentage: 1` vs `undefined` (deferred).
- [ ] Confirm `Slot` + `PercentageField` root **`div`** still exposes **`aria-invalid`** on the focusable input in accessibility tree; adjust `PercentageField` if audit fails.
