# Proposal: Aportes Fondeo Modal — Cartera & Pago Anticipado States

## Intent
Today all aportes are created as FONDEADO with projected dates; the modal only paints them green/gray based on month comparison and has no real lifecycle. Analistas need to mark aportes as EN_CARTERA (overdue/not collected) and PAGO_ANTICIPADO (paid early), with visible state, audit trail, and revertibility. Coaches/Agentes must see status read-only.

## Scope

### In Scope
- Add `EN_CARTERA` and `PAGO_ANTICIPADO` values to `AnnualPaymentStatus` enum.
- Add `portfolioDate` and `earlyPaymentDate` nullable fields on the annual payment model.
- New API routes to mark/unmark cartera and mark pago anticipado per aporte index.
- Update `FundingModal` to render 4 visual states (FONDEADO past, FONDEADO current/future, EN_CARTERA, PAGO_ANTICIPADO) with conditional action buttons.
- Role-based gating: Analista de Soporte + Administrador can mutate; Coach/Agente read-only.
- Confirmation dialog before each mutation.
- AuditLog entries for every state change.
- Update `prisma/ERD.md`.

### Out of Scope
- Cron jobs / automatic state transitions.
- Bulk operations across multiple aportes.
- Notifications/emails to clients.
- Historical migration of existing aportes (all remain FONDEADO).
- Changing how aportes are initially created/projected.

## Capabilities

### New Capabilities
- None (this extends an existing capability rather than introducing a new one).

### Modified Capabilities
- `negocios-aportes-fondeo`: aporte lifecycle gains EN_CARTERA and PAGO_ANTICIPADO states with role-gated transitions, persisted dates, and audit logging. Visual rules in the funding modal expand from 2 to 4 states.

## Approach
1. Schema: extend `AnnualPaymentStatus` enum, add two nullable date fields; migrate.
2. Services: add transition functions in `src/features/negocios/services/` (markCartera, unmarkCartera, markPagoAnticipado) — Prisma only here.
3. API: new route handlers under `src/app/api/negocios/[id]/aportes/[index]/cartera/route.ts` and `.../pago-anticipado/route.ts`; delegate to services; never call Prisma directly.
4. Audit: new `AuditAction` values (`APORTE_CARTERA_MARKED`, `APORTE_CARTERA_UNMARKED`, `APORTE_PAGO_ANTICIPADO_MARKED`) wired via `logAuditEvent`.
5. UI: refactor `FundingModal` to a state-derivation function `getAporteVisualState(aporte, now, role)` returning `{ variant, buttons, rowHighlight, label }`. Reuse `ConfirmDialog` shared component.
6. Types: extend `business-api.types.ts` with new status union + date fields.

## Affected Areas
| Area | Impact | Description |
|---|---|---|
| `prisma/schema.prisma` | Modified | Enum + 2 fields on annual payment model |
| `prisma/ERD.md` | Modified | Enum block + entity fields |
| `src/features/negocios/services/` | Modified | New transition service functions |
| `src/features/negocios/types/business-api.types.ts` | Modified | Status union + dates |
| `src/features/negocios/components/modals/FundingModal.tsx` | Modified | 4-state rendering + role gating |
| `src/app/api/negocios/[id]/aportes/[index]/cartera/route.ts` | New | POST/DELETE for cartera |
| `src/app/api/negocios/[id]/aportes/[index]/pago-anticipado/route.ts` | New | POST for pago anticipado |
| `src/features/auth/lib/audit-logger.ts` | Modified | 3 new AuditAction values |

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Existing FONDEADO rows missing new dates | High | Fields are nullable; visual logic treats null as N/A |
| Role check bypass via API | Med | Centralize role guard in route handlers, mirror UI gate server-side |
| Confusing UX between "past month green" and PAGO_ANTICIPADO green | Med | PAGO_ANTICIPADO shows explicit label with date |
| Double-mutation races (two analistas) | Low | Service updates by `where: { id, status: { in: [...allowed] } }` to enforce valid transition |

## Rollback Plan
- Revert migration: drop `portfolioDate`, `earlyPaymentDate`, remove enum values (no rows should reference them on rollback since feature is additive).
- Revert app code via git; existing FONDEADO behavior is unchanged.
- AuditLog rows remain for forensics.

## Dependencies
- None external. Uses existing `logAuditEvent`, session/role infra, and shared `ConfirmDialog`.

## Success Criteria
- [ ] Analista can mark/unmark EN_CARTERA and mark PAGO_ANTICIPADO from the modal with confirmation.
- [ ] Coach/Agente sees correct visual state but no action buttons.
- [ ] Each mutation produces an AuditLog entry with user, IP, UA, details.
- [ ] EN_CARTERA row is highlighted red and only shows "Quitar Cartera".
- [ ] PAGO_ANTICIPADO row shows green label with `earlyPaymentDate`, no buttons.
- [ ] `prisma/ERD.md` reflects new enum values and fields.
- [ ] No Prisma calls in route handlers (services-only).
