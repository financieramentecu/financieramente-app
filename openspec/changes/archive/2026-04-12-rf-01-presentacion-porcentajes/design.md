# Design: RF-01 Percentage presentation and behavior

## Technical Approach

Implement shared **percent formatting** and a **masked `PercentageField`** under `src/features/shared/`, keep **domain model** as `number` on **0–100 scale** (current `CommissionRuleCategory.porcentajeDistribucion`), and fix the **mapper** to derive that value from Prisma `Decimal` **without** `.toFixed(2)`. **Display** applies PRD rules (locale, padding, adornment); **persistence** stays **fraction 0–1** in DB via existing Zod `/100` transform before Prisma writes. Align **pre-liquidación** and **liquidaciones** read-only % with the same formatter.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Domain numeric type | Keep `number` (0–100) in forms/API JSON to client | `string` or `Decimal` in domain | Smaller change; Zod/RHF already number-based |
| Mapper precision | `Decimal.mul(100)` then `toNumber()` or string with fixed scale from DB | `.toFixed(2)` / raw `* 100` | Avoid float drift; respect DB scale without arbitrary 2dp |
| Locale | `getAppLocale()` → `'es-CO'` constant in `src/features/shared/lib/app-locale.ts` | `next-intl` now | No i18n package in repo; swap implementation later |
| Input implementation | `PercentageField`: `type="text"`, inputMode `decimal`, internal filter + `onPaste` normalizer | Keep `type="number"` | PRD: char mask, trailing zero delete, % adornment outside |
| Sum / min validation | Zod `superRefine` on `categories` array | Validate only in UI | Single source of truth with API schemas |
| DB widening | **Phase 2** optional migration `Decimal(5,4)` → `(8,6)` | Do in same PR | De-risk; mapper + UI work with current scale first |

## Data Flow

```
Prisma Decimal (fraction) ──mapper×100──► domain number (0–100) ──form state──► Zod ──÷100──► API/Prisma (fraction)
                                              │
                                              └──► formatPercentDisplay (read-only / after load)
```

`PercentageField` ↔ RHF: `value` = `number | undefined` (`undefined` = empty, not `0`). Component maps props to string for editing; on blur commits parsed number or `undefined`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/shared/lib/app-locale.ts` | Create | `getAppLocale(): string` |
| `src/features/shared/lib/format-percent.ts` | Create | `formatPercentDisplay`, `normalizePercentPaste` (locale-aware) |
| `src/features/shared/ui/percentage-field.tsx` | Create | Adornment `%`, mask, paste, a11y (`aria-valuenow` / label) |
| `distribution-commission/mappers/commission-rule.mapper.ts` | Modify | Remove `.toFixed(2)`; use Decimal-safe ×100 |
| `distribution-commission/lib/commission-rule-schemas.ts` | Modify | `.min(1)`, sum ≤100 `superRefine` |
| `distribution-commission/components/category-percentage-row.tsx` | Modify | Use `PercentageField` |
| `distribution-commission/components/commission-rules-table.tsx` | Modify | `formatPercentDisplay` for badges |
| `distribution-commission/components/commission-rule-form.tsx` | Modify | Total line uses shared formatter |
| `pre-liquidacion/lib/format-utils.ts` | Modify | `formatPct` delegates to `formatPercentDisplay` (contract: arg = fraction 0–1 vs 0–100 — **normalize in wrapper**) |
| `liquidaciones/.../historico-liquidaciones.tsx` | Modify | Use shared formatter |
| `prisma/schema.prisma` | Optional later | Decimal scale per product decision |

**Note:** `formatPct` today expects **fraction** (`value * 100` inside). Wrapper keeps public signature: `formatPct(fraction)` → calls `formatPercentDisplay(fraction * 100, locale)` so call sites unchanged.

## Interfaces / Contracts

- `formatPercentDisplay(percent0to100: number, locale?: string): string` — read-only; applies integer 4dp padding per PRD in display layer.
- `PercentageFieldProps`: extends input a11y; `value: number | undefined`; `onChange: (v: number | undefined) => void`; optional `maxFractionDigitsInput: 4`.
- API body unchanged: categories[].percentage as **0–100** in validated schema before transform to fraction for Prisma.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | Mapper ×100 without precision loss | Vitest with Decimal fixtures |
| Unit | Zod min/sum | Vitest edge cases (0, 101, sum 100.0001) |
| Unit | `formatPercentDisplay`, paste normalizer | Vitest locale + inputs |
| Component | `PercentageField` | RTL: type, paste, clear |
| E2E | Create/edit rule | Playwright optional smoke |

## Migration / Rollout

1. Ship code + Zod stricter rules.  
2. If production data fails validation: run SQL audit; temporarily feature-flag strict sum or backfill.  
3. Optional Prisma migration in follow-up after product signs 6dp.

## Open Questions

- [ ] Product: confirm **6** vs **4** DB decimals timeline.  
- [ ] Legacy rows with sum >100 or % &lt;1: block save vs admin-only migration?
