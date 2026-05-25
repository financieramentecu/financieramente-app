# Design: Cartera → Cartera Pagado Terminal Transition

## Technical Approach

Mirror the existing `markPagoAnticipado` pattern: dedicated POST endpoint, dedicated service function, dedicated feature-specific confirmation dialog with controlled date input. The state machine gains a new terminal node `CARTERA_PAGADO` reachable only from `EN_CARTERA`. The transition records `portfolioPaymentDate` (user-selectable, defaulting to today) and is forward-only (no revert path). All layers (Prisma, service, route, hook, modal, visual state) are extended additively — no breaking changes to existing flows.

## Architecture Decisions

| Decision | Choice | Alternatives Rejected | Rationale |
|----------|--------|----------------------|-----------|
| State semantics | New terminal enum `CARTERA_PAGADO` | Reuse `PAGO_ANTICIPADO`; boolean flag on EN_CARTERA | Enum keeps state machine explicit; analytics differentiates cartera-paid vs early-paid; matches existing pattern. |
| Date source | Client-selected date posted in body | Server-side `new Date()` | Cartera payments are often recorded after the fact; user must be able to set the real payment date. |
| Modal architecture | New feature-local `ConfirmCarteraPagadoDialog` | Extend shared `ConfirmActionDialog` with children/slot | Shared dialog stays minimal and reusable; date+styling is domain-specific to cartera pagado. |
| Hook contract | Extend `callEndpoint` with optional `body` param | New parallel dispatcher | Single dispatcher keeps loading state consistent; body is opt-in. |
| Route shape | `POST /api/negocios/[id]/aportes/[index]/cartera-pagado` | Reuse PATCH on existing `/cartera` route | Forward terminal transition deserves its own resource; preserves legacy PATCH/DELETE semantics; Zod body validation cleanly isolated. |
| Legacy `DELETE /cartera` | Keep as recovery fallback | Remove now | Out of scope per proposal; removed in follow-up after deprecation window. |
| Modal state in FundingModal | Separate `pendingCarteraPagado` state | Reuse `pendingConfirm` and branch on action | Different shape (no shared dialog), different lifecycle (date input). Avoids conditional dialog rendering bug surface. |

## Data Flow

```
AporteRow (UNMARK_CARTERA click)
    │
    ▼
FundingModal.handleRequestAction
    │  (action=UNMARK_CARTERA branches)
    ▼
setPendingCarteraPagado({ index })
    │
    ▼
ConfirmCarteraPagadoDialog (date input, green)
    │  user picks date, clicks Confirmar
    ▼
useAporteTransitions.markCarteraPagado(businessId, index, date)
    │
    ▼
POST /api/negocios/[id]/aportes/[index]/cartera-pagado  { paymentDate }
    │
    ▼
markCarteraPagado service
    │  updateMany WHERE status=EN_CARTERA → CARTERA_PAGADO + portfolioPaymentDate
    │  logAuditEvent(APORTE_CARTERA_PAGADO)
    ▼
PaymentInstallmentDto → handleTransitionSuccess → row re-renders green terminal
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `CARTERA_PAGADO` to `AnnualPaymentStatus`; add `portfolioPaymentDate DateTime?` to `Payment` |
| `prisma/migrations/<ts>_cartera_pagado/migration.sql` | Create | Enum value + nullable column |
| `prisma/ERD.md` | Modify | Update enum block + Payment fields |
| `src/features/negocios/services/payment-state.service.ts` | Modify | Add `markCarteraPagado(businessId, index, actor, paymentDate)`; update `toDto` to include `portfolioPaymentDate` |
| `src/features/negocios/types/business-api.types.ts` | Modify | `AnnualInstallmentStatusUi` adds `'CARTERA_PAGADO'`; `PaymentInstallmentDto` adds `portfolioPaymentDate: string \| null` |
| `src/features/negocios/lib/aporte-visual-state.ts` | Modify | Add `CARTERA_PAGADO` variant (green, no buttons, label with payment date) |
| `src/features/negocios/components/modals/AporteRow.tsx` | Modify | Render new variant (no buttons) |
| `src/features/negocios/components/modals/FundingModal.tsx` | Modify | New `pendingCarteraPagado` state; UNMARK_CARTERA opens new dialog; wire `markCarteraPagado` |
| `src/features/negocios/components/modals/ConfirmCarteraPagadoDialog.tsx` | Create | Feature-specific dialog with date input + green styling |
| `src/features/negocios/hooks/use-aporte-transitions.ts` | Modify | Add `markCarteraPagado(businessId, index, date)`; extend `callEndpoint` with optional JSON body |
| `src/app/api/negocios/[id]/aportes/[index]/cartera-pagado/route.ts` | Create | POST handler with Zod body validation |
| `src/features/auth/lib/audit-logger.ts` | Modify | Add `APORTE_CARTERA_PAGADO` to `AuditAction` |
| `src/features/negocios/__tests__/*` | Create/Modify | Service, hook, dialog, route tests |

## Interfaces / Contracts

### Service signature

```ts
export async function markCarteraPagado(
  businessId: number,
  index: number,
  actor: Actor,
  paymentDate: Date,
): Promise<TransitionResult>
// updateMany WHERE status=EN_CARTERA → status=CARTERA_PAGADO, portfolioPaymentDate=paymentDate
// audit: APORTE_CARTERA_PAGADO
```

### API route body (Zod)

```ts
const bodySchema = z.object({
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
})
// POST → { data: PaymentInstallmentDto }
// 401/403/400/404/409/500 per ApiResponse<T> contract
```

### Hook signature

```ts
markCarteraPagado: (
  businessId: number,
  index: number,
  paymentDate: string, // YYYY-MM-DD
) => Promise<ApiResponse<PaymentInstallmentDto>>
```

### Dialog props

```ts
interface ConfirmCarteraPagadoDialogProps {
  open: boolean
  index: number
  onConfirm: (paymentDate: string) => void // YYYY-MM-DD
  onCancel: () => void
}
// Default date = today (toISOString().slice(0,10))
// Copy: "La cartera cambiará a pagado, ya no se va poder registrarlo como cartera."
// Confirm: "Confirmar pago"; Cancel: "Cancelar"; Green border + bg, CheckCircle2 icon.
```

### Visual state addition

```ts
// AporteVariant adds 'CARTERA_PAGADO'
// Returns: { variant: 'CARTERA_PAGADO', rowClass: 'bg-green-50 border-green-300',
//            label: `Cartera pagada: ${formatDate(portfolioPaymentDate)}`, buttons: [] }
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit (service) | markCarteraPagado: success EN_CARTERA→CARTERA_PAGADO; CONFLICT on non-EN_CARTERA; NOT_FOUND; audit call | Vitest + Prisma mock |
| Unit (visual state) | CARTERA_PAGADO variant returns green class, no buttons, formatted date label | Vitest pure function |
| Unit (hook) | markCarteraPagado posts body; updates AsyncState; handles error JSON | Vitest + mocked fetch |
| Unit (dialog) | Date defaults to today; onConfirm called with selected date; cancel closes | Testing Library |
| Integration (route) | 401/403/400/404/409/200 paths; Zod rejects bad date | Vitest + mocked auth + service |
| Manual | Full flow in FundingModal; PAGO_ANTICIPADO and existing cartera flows untouched | Browser |

## Migration / Rollout

Two-step Prisma migration (single file): `ALTER TYPE "AnnualPaymentStatus" ADD VALUE 'CARTERA_PAGADO';` followed by `ALTER TABLE "payments" ADD COLUMN "portfolio_payment_date" TIMESTAMP(3);`. Backwards compatible — existing rows untouched, new column nullable. Run `npx prisma migrate dev --name cartera_pagado_transition` then `npx prisma generate`. No data backfill required.

## Open Questions

- None blocking. Legacy `DELETE /cartera` retention period to be decided in a follow-up change.
