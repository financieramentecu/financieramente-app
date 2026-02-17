# Research & Technical Decisions

## 1. Rounding Policy
- **Decision**: Standard Rounding to 3 decimals (Half-Up).
- **Rationale**: User explicitly requested 3-decimal precision to match Excel examples.
- **Alternatives**: Floor/Ceil (rejected as inaccurate for financial data), 2 decimals (insufficient for intermediate calculations).

## 2. Business Origin Mapping for Polizas
- **Decision**: Map `PROMOTOR_FRONT19_OMPEV` in "Plan de Compensación" column to `CARTERA` in `originCommission` field.
- **Rationale**: Essential to differentiate commission percentages (Propio vs Vortex/Asesoria vs Cartera).
- **Alternatives**: Hardcoded ID lookup (fragile), Fuzzy matching (unreliable).

## 3. Configuration Storage
- **Decision**: Rename `Discount` table to `CommissionConfiguration`. Add `discountPercentage` (12%) and `clawbackPercentage` (10%).
- **Rationale**: Centralized configuration allows adjusting tax/retention rates without code changes. Decoupling historical records via snapshots ensures auditability.
- **Alternatives**: Hardcoded constants (inflexible), Environment variables (require redeploy).

## 4. Clawback Tracking
- **Decision**: Dual-table approach: `ClawbackBalance` for current total reserve, `Clawback` for movement history (`ACUMULADO`, `DESCONTADO`).
- **Rationale**: Provides both high-performance balance checks and full audit trail of every modification. Allows negative balances to represent debt.
- **Alternatives**: Single table with sum aggregation (slow at scale), JSON field on User (hard to query/report).

## 5. File Processing UX
- **Decision**: Combined real-time progress bar + detailed post-import summary.
- **Rationale**: User needs immediate feedback on long-running batches and precise details on row-level failures (e.g., missing mandatory data).
- **Alternatives**: Async email report (too slow), Silent failure (bad UX).
