# Design: Fondeo directo con selección de fecha (numAportes = 0)

## Technical Approach

Extend the existing direct-fondeo path so that when a business has NO annual rows AND `numAportes = 0`, the user picks a funding date via a modal (reusing `FundedDatePickerDialog`) instead of the plain AlertDialog. The date-only string travels to `POST /fondear`, which anchors `dateAnchored` at noon Bogotá UTC via `dateOnlyToBogotaNoonUtc()`. `numAportes = 1` keeps the current AlertDialog + server `new Date()` behavior. Reuses spec `sdd/fondeo-fecha-sin-aportes/spec`.

## Codebase Findings (verified before design)

| Assumption from spec/task | Reality in code | Impact |
|---|---|---|
| ANALISTA_SOPORTE needs to be added to `canFundPayments` | ALREADY included (`roles.ts` L106-110) | NO change to roles.ts. Spec's "previously no funding action" claim is inaccurate at the permission layer. |
| `AuditAction.BUSINESS_FUNDED` may not exist | ALREADY exists and used (`fondear/route.ts` L135) | NO enum change; only enrich `details`. |
| UI can branch on `numAportes` (0 vs 1) | List DTO `Business` carries only `hasPayments`, NOT `numAportes` | MUST thread `numAportes` (already on `BusinessEntity`) through the list mapper. |
| Direct fondeo lives in MisNegociosPage | Owner is `negocios-page-client.tsx` (AlertDialog + handlers); `MisNegociosPage` only forwards `onFondearBusiness` | Modal + branch logic go in `negocios-page-client.tsx`. |

## Architecture Decisions

### Decision: New component vs extend AlertDialog
**Choice**: New `FundDirectFundingModal.tsx` wrapping `FundedDatePickerDialog`.
**Alternatives**: Extend the inline AlertDialog with a conditional date input.
**Rationale**: Follows the proven `FundFirstPaymentDialog` pattern (SRP). Keeps `numAportes = 1` AlertDialog untouched, avoids a dual-mode component.

### Decision: Expose numAportes on the list DTO
**Choice**: Add `numAportes: number | null` to `Business` type and map it in `mapBusinessToTableRow`.
**Alternatives**: Extra API call on click; infer from `hasPayments`.
**Rationale**: `hasPayments=false` cannot distinguish 0 from 1. `numAportes` already exists on `BusinessEntity`; threading it is a one-line, zero-cost change. Interface Segregation preserved (single scalar).

### Decision: Backend date parsing + validation
**Choice**: Optional `fundedDate` (YYYY-MM-DD) in body; validate format + reject future (> today Bogotá via `todayBogota()`); fallback `new Date()` when absent.
**Rationale**: Backward compatible (numAportes=1 sends no body). Reuses existing Bogotá helpers, no new date logic.

## Data Flow

    ActionCell "Fondear" ─→ onFondearBusiness(business)
        │  negocios-page-client: handleFondearBusiness
        ├─ hasPayments ───────────→ annual flow (unchanged)
        ├─ numAportes===0 ────────→ open FundDirectFundingModal
        │        pick date ─→ fondearBusiness(id, fundedDate)
        └─ numAportes===1 ────────→ AlertDialog (unchanged, no date)
                 │
        businessService.fondear(id, fundedDate?) ─→ POST /fondear { fundedDate? }
                 │
        route: validate → dateOnlyToBogotaNoonUtc | new Date()
             → update status+dateAnchored → logAuditEvent(BUSINESS_FUNDED)
                 │
        onSuccess → refetch() + refetchStats()

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/negocios/components/modals/FundDirectFundingModal.tsx` | Create | Wraps `FundedDatePickerDialog`; owns loading/error; calls `fondearBusiness(id, date)`. |
| `src/features/negocios/types/business.types.ts` | Modify | Add `numAportes: number \| null`. |
| `src/features/negocios/lib/map-business-to-table-row.ts` | Modify | Map `numAportes: b.numAportes`. |
| `src/app/dashboard/negocios/negocios-page-client.tsx` | Modify | Branch numAportes 0→modal / 1→AlertDialog; render `FundDirectFundingModal`. |
| `src/features/negocios/hooks/use-business-mutation.ts` | Modify | `fondearBusiness(id, fundedDate?)`. |
| `src/features/negocios/services/business.service.ts` | Modify | `fondear(id, fundedDate?)` → POST JSON body when provided. |
| `src/app/api/negocios/[id]/fondear/route.ts` | Modify | Parse+validate `fundedDate`; anchor via `dateOnlyToBogotaNoonUtc`; enrich audit `details`. |
| `src/features/negocios/__tests__/fixtures/mock-business.ts` | Modify | Add `numAportes` to fixture. |

## Interfaces / Contracts

```typescript
// POST /api/negocios/[id]/fondear — body (optional)
interface FondearDirectRequest { fundedDate?: string } // 'YYYY-MM-DD'
// 400 on invalid format or future date; 403 canFundPayments false; 404 missing; 400 if any AnnualPayment exists
```

Validation (backend): regex `^\d{4}-\d{2}-\d{2}$`; reject `dateOnlyToBogotaNoonUtc(fundedDate) > todayBogota()`-equivalent noon compare.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | date parse/validate (format, future rejection, fallback) | Vitest, inject `now` |
| Unit | mapper threads `numAportes` | Vitest on `mapBusinessToTableRow` |
| Integration (route) | fundedDate→noon UTC; missing→today; invalid/future→400; audit `details` contains id+contract+date | Existing `fondear` route test harness |
| Integration (UI) | numAportes=0 opens modal; =1 AlertDialog; cancel = no POST; success refetch | Testing Library on `negocios-page-client` |

## Migration / Rollout

No data migration. Backward compatible: no-body POST preserves current behavior for numAportes=1.

## Open Questions

- [ ] Confirm business rule: is a future `fundedDate` always invalid, or allowed for scheduled fondeo? Design assumes reject-future per spec.
