# Exploration: RF-02 (percentage input behavior)

## Current State

**PRD (`financieramente-configuracion-comisiones-prd.md` §RF-02):** Do not force empty input to `0`; allow clearing while editing; validate with clear messages on **blur** and on **save**.

**Shared `PercentageField` (`src/features/shared/ui/percentage-field.tsx`):**

- Controlled local `text` state; `value` prop is `number | undefined`.
- **onChange:** empty trimmed string → `onChange(undefined)` (no `'' → 0`).
- **onBlur:** empty → `onChange(undefined)`; invalid parse → `onChange(undefined)` and revert display to last valid `value` (or empty if was undefined).
- Tests cover empty display, clear + blur → `undefined`, paste normalization (`percentage-field.test.tsx`).

**Distribution commission UI (`CategoryPercentageRow`):** Uses `PercentageField` wired to RHF `field.onChange` / `onBlur` / `ref` — aligned with RF-02 for the **value path**.

**Form (`commission-rule-form.tsx`):**

- `useForm` uses default mode (validation effectively **on submit**, not on blur).
- **Total row** uses `Number(item?.percentage) || 0` for display only (empty → contributes 0 to “Total informativo”; does not write back to form state).
- **Agregar categoría** appends `{ idCategory: 0, percentage: 1 }` — new rows start at 1%, not empty (user can still clear the field).

**Zod (`commission-rule-schemas.ts`):** `percentageSchema` is `z.coerce.number().min(1).max(100)` — missing/invalid coerced values fail at **submit** with schema messages; no separate “blur” path in RHF.

**Gap vs PRD “mensajes claros en blur”:** `PercentageField` silently reverts invalid text on blur without `FormMessage` / toast; RHF does not `trigger()` field validation on blur for these fields.

**Cross-module:** `PercentageField` is only referenced from `category-percentage-row.tsx`. Other features are not yet on the shared component; PRD RF-01/RF-02 require **cross-module** consistency when new % inputs appear.

**Historical note:** Archived exploration `openspec/changes/archive/2026-04-12-rf-01-presentacion-porcentajes/exploration.md` documented old `'' → 0` on raw `Input`; current code has moved to `PercentageField`.

## Affected Areas

- `src/features/shared/ui/percentage-field.tsx` — core RF-02 behavior and blur handling
- `src/features/shared/ui/percentage-field.test.tsx` — unit coverage
- `src/features/distribution-commission/components/category-percentage-row.tsx` — integration with RHF
- `src/features/distribution-commission/components/commission-rule-form.tsx` — totals, append defaults, submit/invalid handler
- `src/features/distribution-commission/lib/commission-rule-schemas.ts` — submit-time validation
- Future: any module exposing the same % semantics (must reuse `PercentageField` or equivalent)

## Approaches

1. **Keep `PercentageField` + submit-only RHF validation**
   - Pros: Simple; matches current pattern; empty state works; tests exist
   - Cons: Weak “blur” messaging vs PRD; invalid intermediate typing may feel silent until submit
   - Effort: Low

2. **RHF `mode: 'onTouched'` or per-field `onBlur` → `trigger()`**
   - Pros: Zod errors surface on blur after touch; clearer UX
   - Cons: Must reconcile with `PercentageField` internal blur (order of handlers, double validation)
   - Effort: Medium

3. **Extend `PercentageField` with optional `onValidationError` / `aria-invalid` driven by parent**
   - Pros: Explicit invalid state without fighting internal revert logic
   - Cons: More API surface; duplication risk with Zod messages
   - Effort: Medium

## Recommendation

Treat RF-02 as **largely satisfied** for distribution commission **value handling** (`undefined` while empty, no forced zero in `PercentageField`). Next incremental improvement: **blur-aligned validation** (Approach 2 or 3) if product wants visible errors on blur, not only on save.

## Risks

- **Append default `percentage: 1`** may surprise users expecting an empty new row; optional change to `undefined` would need schema/empty-row handling for category id `0`.
- **`z.coerce`** on edge inputs can produce surprising coercion; worth explicit tests for `undefined` / missing `percentage` on a line.
- **Cross-module drift** if new % inputs skip `PercentageField`.

## Ready for Proposal

**Yes** — scope for a small proposal: “RF-02 blur messaging + RHF trigger” and/or “default new row percentage” and cross-module audit checklist.
