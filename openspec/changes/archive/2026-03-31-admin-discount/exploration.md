## Exploration: admin-discount (Dynamic Discount Management)

### Current State

- **CommissionConfiguration** (Prisma): Single table with `discountPercentage`, `clawbackPercentage`, `name`, `description`, `status` (ACTIVE/INACTIVE). One active row; process-batch uses it for snapshots; seed creates one DEFAULT (12% discount, 10% clawback).
- **Process-batch**: Fetches active config, builds `snapshots = { discountPercentage, clawbackPercentage }`; processors persist these on `SettlementCommission`. Pre-liquidación uses those values and writes `applied_discount_percentage` on `ComissionDistribution`.
- **Admin**: Panel at `/dashboard/admin` with modules (companies, products, currencies, periodicities, origins, categories, users). No "Descuentos" module. Pattern: AdminCard + page with table, CrudModal, optional DeleteConfirmModal.
- **Audit**: `AuditLog` with `AuditAction`; no discount-related actions yet.

### Affected Areas

- `prisma/schema.prisma` — New model `CommissionDiscount` (table `commission_discount`) or evolve CommissionConfiguration; constraint one ACTIVE per type.
- `prisma/seeds/discount.ts` — Create default CommissionDiscount rows by type or leave to admin.
- `src/features/load-file/services/process-batch.service.ts` — Resolve percentages by type from CommissionDiscount (IMPUESTO → discountPercentage, CLAWBACK → clawbackPercentage); fallback to defaults.
- `src/features/auth/lib/audit-logger.ts` — New actions DISCOUNT_CREATED, DISCOUNT_INACTIVATED.
- **New** `src/features/commission-discounts/` — Feature at **root** (not under admin): components, hooks, lib, types, __tests__.
- **New** `src/app/dashboard/admin/discounts/page.tsx` — UI entry under Administración.
- **New** `src/app/api/admin/discounts/` — GET list, POST create, POST [id]/inactivate.

### Approaches

1. **New table CommissionDiscount** — One row per discount; type IMPUESTO | CLAWBACK; at most one ACTIVE per type. Process-batch queries active by type. Feature at `src/features/commission-discounts/`.
   - Pros: Clear domain; history per type; naming aligns with spec.
   - Cons: Migration from current CommissionConfiguration (split or deprecate).
   - Effort: Medium.

2. **Evolve CommissionConfiguration** — Add `type` column; same one-active-per-type rule; rename table to `commission_discount` for clarity.
   - Pros: Reuses table.
   - Cons: Migration of existing row; name change still recommended.
   - Effort: Medium.

### Recommendation

New model **CommissionDiscount** (table `commission_discount`). Feature at **root**: `src/features/commission-discounts/`. UI/API under admin (dashboard/admin/discounts, api/admin/discounts). One active discount per type; create + inactivate only; audit for create/inactivate. See `openspec/specs/commission-discounts/spec.md` for naming, structure, and acceptance criteria.

### Risks

- Migration of existing CommissionConfiguration row (split into two CommissionDiscount rows or deprecate).
- Process-batch must fallback to defaults when no active discount for a type.
- Admin-only access for discounts routes and page.

### Ready for Proposal

Yes.
