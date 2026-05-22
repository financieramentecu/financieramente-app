# Design: Aportes Fondeo Modal — Cartera & Pago Anticipado

## Technical Approach
Extend the Payment model + AnnualPaymentStatus enum with two new states and two nullable dates. Add three transition endpoints under `src/app/api/negocios/[id]/aportes/[index]/...` that delegate ALL Prisma work to a new `payment-state.service.ts` in `src/features/negocios/services/`. The FundingModal is refactored: a pure `getAporteVisualState(aporte, now, role)` derives variant+buttons; an extracted `AporteRow` component renders the row; a shared `ConfirmActionDialog` gates every mutation; a `useAporteTransitions` hook (AsyncState<T>) handles fetch + optimistic re-render. Server-side role guard mirrors UI gating using `canFundPayments()`.

## Architecture Decisions

| # | Decision | Choice | Rejected | Rationale |
|---|---|---|---|---|
| 1 | State source | DB enum + 2 nullable date columns | Single `state JSON` field | Enums are query-indexable; ERD-friendly; type-safe in Prisma client |
| 2 | Transition guard | Service uses `where: { idAnnualPayment, status: { in: allowedFrom } }` then checks `count` | Read-then-write in a tx | One-roundtrip atomic guard; naturally returns 409 when no row matches |
| 3 | Endpoint shape | `PATCH .../cartera` (mark), `DELETE .../cartera` (unmark), `POST .../pago-anticipado` | Single `PATCH .../state` with body discriminator | Spec lists 3 distinct actions; separate routes give cleaner audit + role gates |
| 4 | UI state derivation | Pure function `getAporteVisualState` in `lib/aporte-visual-state.ts` | Inline ternaries in JSX | Unit-testable, single source of truth for the 4-variant matrix |
| 5 | Confirmation UX | New shared `ConfirmActionDialog` (AlertDialog wrapper) | Reuse window.confirm or per-button modals | Spec mandates confirm for all 3 actions; one reusable component |
| 6 | Hook shape | `useAporteTransitions` returning `AsyncState<PaymentDto>` + `markCartera/unmarkCartera/markPagoAnticipado` | 3 separate hooks | Cohesive, one in-flight state per row |
| 7 | Role gating | Server: `canFundPayments(session.user.role)` in each route; UI: same helper in modal | Inline role allow-list | Already centralized in `src/features/auth/lib/roles.ts` |
| 8 | Audit actions | 3 new enum values: `APORTE_CARTERA_MARKED`, `APORTE_CARTERA_UNMARKED`, `APORTE_PAGO_ANTICIPADO_MARKED` | Reuse generic `PAYMENT_UPDATED` | Spec requires distinct, queryable audit signals |

## Data Flow

```
AporteRow (click) ──→ ConfirmActionDialog ──confirm──→ useAporteTransitions
     │                                                       │
     │                                                       ▼
     │                                              fetch PATCH/DELETE/POST
     │                                                       │
     │                                                       ▼
     │                                              route handler
     │                                                (role guard)
     │                                                       │
     │                                                       ▼
     │                                              payment-state.service
     │                                          (atomic Prisma update w/ where-status)
     │                                                       │
     │                                                       ▼
     │                                              logAuditEvent (fire-and-forget)
     ▼                                                       │
re-render via      ◀─────── updated PaymentDto ◀─────────────┘
getAporteVisualState
```

## File Changes

| File | Action | Description |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `EN_CARTERA`,`PAGO_ANTICIPADO` to enum; add `portfolioDate DateTime? @map("cartera_date")`, `earlyPaymentDate DateTime? @map("pago_anticipado_date")` on Payment |
| `prisma/migrations/<ts>_aportes_cartera_anticipado/` | New | Generated migration |
| `prisma/ERD.md` | Modify | Enum block + Payment entity fields |
| `src/features/negocios/services/payment-state.service.ts` | New | `markCartera/unmarkCartera/markPagoAnticipado(businessId, index, actor)` |
| `src/features/negocios/types/business-api.types.ts` | Modify | Extend `AnnualPaymentStatus` union + add `portfolioDate`, `earlyPaymentDate` to `PaymentInstallmentDto` |
| `src/app/api/negocios/[id]/aportes/[index]/cartera/route.ts` | New | PATCH + DELETE handlers |
| `src/app/api/negocios/[id]/aportes/[index]/pago-anticipado/route.ts` | New | POST handler |
| `src/features/auth/lib/audit-logger.ts` | Modify | 3 new `AuditAction` values |
| `src/features/negocios/lib/aporte-visual-state.ts` | New | Pure `getAporteVisualState` |
| `src/features/negocios/hooks/use-aporte-transitions.ts` | New | AsyncState hook |
| `src/features/negocios/components/modals/FundingModal.tsx` | Modify | Use AporteRow + hook + canFundPayments |
| `src/features/negocios/components/modals/AporteRow.tsx` | New | Per-aporte row + buttons |
| `src/features/shared/ui/confirm-action-dialog.tsx` | New | AlertDialog wrapper |
| `__tests__/` colocated | New | Unit tests for visual-state, hook, service |

## Interfaces

```ts
// payment-state.service.ts
type Actor = { userId: number; email: string; ip: string; ua: string }
type TransitionResult = { ok: true; payment: PaymentDto } | { ok: false; code: 'NOT_FOUND' | 'CONFLICT' }

export async function markCartera(businessId: number, index: number, actor: Actor): Promise<TransitionResult>
export async function unmarkCartera(businessId: number, index: number, actor: Actor): Promise<TransitionResult>
export async function markPagoAnticipado(businessId: number, index: number, actor: Actor): Promise<TransitionResult>

// aporte-visual-state.ts
export type AporteVariant = 'FONDEADO_PAST' | 'FONDEADO_CURRENT' | 'EN_CARTERA' | 'PAGO_ANTICIPADO'
export type AporteVisualState = {
  variant: AporteVariant
  rowClass: string
  label: string | null
  buttons: Array<'MARK_CARTERA' | 'UNMARK_CARTERA' | 'MARK_ANTICIPADO'>
}
```

API contract: `{ success: true, payment }` on 2xx; `409 { error: 'INVALID_TRANSITION' }`; `403` for unauthorized role; `404` when index/business not found.

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit | `getAporteVisualState` 4 variants × 2 roles | Vitest table-driven |
| Unit | `payment-state.service` happy + conflict | Vitest + prisma mock |
| Unit | `useAporteTransitions` | renderHook + mock fetch |
| Integration | route handlers (role 403, 409, audit call) | Vitest, mock service + audit-logger |
| Component | FundingModal renders correct variant per status | RTL |

## Migration / Rollout
Additive Prisma migration; nullable dates; no backfill (all existing rows stay FONDEADO with null dates). Deploy schema + code together. Rollback: revert migration (no production rows will reference new enum values until feature ships).

## Open Questions
None — proposal + spec fully resolve scope.
