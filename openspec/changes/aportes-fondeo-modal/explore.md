## Exploration: Chequeo automático y marcación manual de aportes en modal de fondeo

### Current State
- `AnnualPaymentStatus` enum only has `SIN_FONDEAR` and `FONDEADO` — no `EN_CARTERA` or `PAGO_ANTICIPADO`
- FundingModal has two visual states only: green CheckCircle2 for FONDEADO, checkbox for SIN_FONDEAR
- No per-row buttons, no labels, no confirm dialogs in FundingModal
- Role gating via `canFund` prop (AGENTE gets false = read-only) already covers Coach scenario partially
- Zero cron infrastructure in the repo
- No business-day utility exists

### Key Affected Files
- prisma/schema.prisma — add EN_CARTERA, PAGO_ANTICIPADO to enum
- prisma/ERD.md — mandatory update
- src/features/negocios/types/business-api.types.ts — update AnnualInstallmentStatusUi
- src/features/negocios/components/modals/FundingModal.tsx — per-row buttons, labels, confirm dialog
- src/app/api/negocios/[id]/fondear-aportes/ — new sibling routes for cartera and pago-anticipado
- src/features/auth/lib/audit-logger.ts — add PAYMENT_MARKED_CARTERA, PAYMENT_UNMARKED_CARTERA, PAYMENT_ANTICIPADO
- New: src/features/negocios/lib/business-days.ts
- New: src/app/api/cron/auto-check-aportes/route.ts

### Recommended Approach
Approach A: Extend enum + new PATCH endpoints (additive, low risk, matches existing patterns)

### Risks
1. Cron: Vercel Cron won't work if self-hosted on Digital Ocean — deployment decision needed
2. Colombian holidays: need holiday library or hardcoded list
3. Reversion semantics: "Quitar Cartera" → which status? SIN_FONDEAR or FONDEADO? User said "check pasa a verde" which implies FONDEADO — needs clarification
4. FundingModal complexity: consider AporteRow sub-component
