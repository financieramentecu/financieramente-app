# Proposal: RF-01 Percentage presentation and behavior

## Intent

Implement **PRD RF-01 / RF-05** (`PRDs/financieramente-configuracion-comisiones-prd.md` §6.1): app-locale formatting, no client round/truncate of server precision, `%` as trailing adornment, char-masked input with normalized paste, a11y (numeric value only), **1–100** per field, category sum **≤ 100%**, cross-module consistency. Today: mapper `.toFixed(2)`, `''→0` on rows, `es-CO` + 2 decimals in pre-liquidación.

## Scope

### In Scope

- Mapper: drop `.toFixed(2)`; keep full Prisma `Decimal` precision in domain (within DB scale).
- Shared percent format utils + documented app-locale contract (until `next-intl`).
- `PercentageField` in `src/features/shared/`: adornment, mask, paste, trailing-zero deletion; wire to RHF + Zod on submit.
- Read-only % in `distribution-commission` (table, totals) via shared formatter (integer padding to 4 decimals **in display only**).
- Zod: RF-05 (min 1, max 100, sum ≤ 100 per rule); data audit / backfill if legacy violates rules.
- **Cross-module:** `pre-liquidacion/format-utils` + `liquidaciones/historico-liquidaciones` use shared formatter.
- Optional Prisma widen `Decimal(5,4)` → **(8,6)** if product locks six-decimal persistence.

### Out of Scope

- `hasPortfolio` full stack (RF-03/04); MAPA §F motor; full i18n beyond % locale.

## Approach

Shared `formatPercent*` + `PercentageField`; mapper yields full precision; UI formats with `Intl` + app locale. Single import path for distribution, pre-liquidación, liquidaciones.

## Affected Areas

| Area | Impact | Note |
|------|--------|------|
| `distribution-commission/mapper`, `schemas`, `category-percentage-row`, `commission-rules-table`, `commission-rule-form` | Modified | Core RF-01/02/05 |
| `src/features/shared/` | New/Modified | Field + utils |
| `pre-liquidacion/lib/format-utils`, `liquidaciones/.../historico-liquidaciones` | Modified | Cross-module |
| `prisma/schema` (optional), API routes | Modified/Review | Precision |

## Risks

| Risk | L | Mitigation |
|------|---|------------|
| Legacy data vs new validation | H | Audit; phased enforce |
| Input regressions | M | Unit + E2E rule form |
| Decimal migration side effects | M | Staging; down migration |

## Rollback Plan

Revert PR; if DB migrated, run down migration and redeploy prior artifact.

## Dependencies

- Product: **6** vs **4** DB decimals.
- Agreed **locale** source (constant → future user setting).

## Success Criteria

- [ ] No mapper `.toFixed(2)`; display matches precision policy.
- [ ] % adornment right; no `''→0` before validation; paste normalized.
- [ ] Zod: 1–100 + sum ≤ 100 (or documented waiver).
- [ ] Pre-liquidación + historico use shared formatter.
- [ ] Tests: mapper, schema, formatter, one UI path for rule edit.

## Amendments (UX / producto — post-implementación)

Documentado en **`exploration.md`** § *Plan UX* y **`tasks.md`** Fase 6.

- **Admin UI:** errores visibles (destructivo + icono), labels no rojos, separadores `divide-y` entre categorías, feedback si suma > 100 %.
- **Activo:** edición solo desde **lista** de reglas; formulario de edición **no** incluye el switch; `update` conserva `initialData.active`.
- **Página editar regla:** sin títulos duplicados respecto al header del layout (`DashboardLayout`).
