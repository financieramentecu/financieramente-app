# Proposal: Admin Discount (Dynamic Discount Management)

## Intent

Administrators need to change the Impuesto and Clawback percentages used in commission settlements without technical intervention and keep full traceability of which discount was applied in each distribution. Today a single `CommissionConfiguration` row holds both values and is not manageable from the UI. This change introduces a dedicated CommissionDiscount model, one active discount per type, and an admin UI for create/list/inactivate with audit.

## Scope

### In Scope

- New Prisma model **CommissionDiscount** (table `commission_discount`): name, type (IMPUESTO | CLAWBACK), percentage (0.01–100), description, status (ACTIVE/INACTIVE), timestamps; optional createdBy/updatedBy.
- Constraint: at most one ACTIVE discount per type (application check or partial unique index).
- New root-level feature **commission-discounts** at `src/features/commission-discounts/` (components, hooks, lib, types, __tests__), following the same structure as `distribution-commission` and `categories`.
- Admin entry: "Descuentos" under Administración — page `app/dashboard/admin/discounts/`, API `app/api/admin/discounts/` (GET list, POST create, POST [id]/inactivate).
- Process-batch (load-file): resolve active CommissionDiscount by type (IMPUESTO → discountPercentage, CLAWBACK → clawbackPercentage); fallback to 0.12 / 0.1 when none active.
- Audit: new actions DISCOUNT_CREATED, DISCOUNT_INACTIVATED; log user, timestamp, and payload in details.
- Migration path for existing CommissionConfiguration (migrate or deprecate; CommissionDiscount becomes source of truth).

### Out of Scope

- Editing or reactivating an inactive discount (inactive records remain read-only for historical integrity).
- Changing how pre-liquidación computes totals (it continues to use snapshot percentages from SettlementCommission; only the source of those snapshots changes).
- Moving other admin modules out of `admin/` (only commission-discounts is a root feature; admin remains the UI entry).

## Approach

Introduce a new table and domain feature. Add Prisma model `CommissionDiscount` with type enum and one-active-per-type rule. Build the commission-discounts feature at the root of `features/` with Zod schemas, hooks, and components; expose list/create/inactivate via existing admin API and dashboard patterns. Update process-batch to query active CommissionDiscount by type and build the same snapshot shape for processors (no change to processor contracts). Extend AuditLog with discount actions. Migrate or deprecate CommissionConfiguration so CommissionDiscount is the single source of truth for settlement percentages.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | New | Add model CommissionDiscount; optional migration/deprecation of CommissionConfiguration. |
| `prisma/migrations/` | New | Migration for commission_discount table (and optional data migration). |
| `prisma/seeds/discount.ts` | Modified | Seed default CommissionDiscount rows by type or leave to admin. |
| `src/features/commission-discounts/` | New | Full feature: components, hooks, lib, types, __tests__. |
| `src/features/load-file/services/process-batch.service.ts` | Modified | Resolve percentages from CommissionDiscount by type; fallback defaults. |
| `src/features/auth/lib/audit-logger.ts` | Modified | Add DISCOUNT_CREATED, DISCOUNT_INACTIVATED. |
| `src/app/dashboard/admin/page.tsx` | Modified | Add "Descuentos" card linking to discounts page. |
| `src/app/dashboard/admin/discounts/` | New | Page and client components for Descuentos. |
| `src/app/api/admin/discounts/` | New | GET list, POST create, POST [id]/inactivate. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration of existing CommissionConfiguration leaves gaps (e.g. no active discount for a type) | Medium | Seed or migration creates one ACTIVE per type from current config; process-batch fallback to 0.12 / 0.1. |
| Process-batch regressions when switching from CommissionConfiguration | Low | Keep same snapshot shape; add/run existing process-batch tests with CommissionDiscount. |
| Unauthorized access to discount management | Low | Reuse admin route protection and role checks used by other admin modules. |

## Rollback Plan

- **Code**: Revert commits for commission-discounts feature, API routes, dashboard page, and process-batch changes; remove CommissionDiscount from schema and apply a down migration that drops `commission_discount` (and restores reliance on CommissionConfiguration if it was kept).
- **Data**: If CommissionConfiguration was retained, no data rollback needed beyond dropping the new table. If it was removed, restore from backup or re-seed CommissionConfiguration from the last known values before the change.
- **Feature flag**: Not required; rollback is via deploy revert and migration down.

## Dependencies

- Existing admin auth and layout (DashboardLayout, admin route protection).
- Prisma and existing load-file process-batch tests (to validate snapshot behavior after switch).
- Optional: decision on whether to migrate existing CommissionConfiguration row into two CommissionDiscount rows or only deprecate and seed new rows.

## Success Criteria

- [ ] CommissionDiscount model exists; at most one ACTIVE per type is enforced.
- [ ] Admin can create a discount (name, type, percentage 0.01–100, description, status); validation prevents a second ACTIVE for the same type.
- [ ] Admin can list discounts with required columns and inactivate an active one (with confirmation and audit log).
- [ ] Process-batch uses active CommissionDiscount by type for snapshots and falls back to 0.12 / 0.1 when none active.
- [ ] Audit log records DISCOUNT_CREATED and DISCOUNT_INACTIVATED with user, timestamp, and payload.
- [ ] Existing process-batch and pre-liquidación behavior preserved (same snapshot shape and calculation logic).
