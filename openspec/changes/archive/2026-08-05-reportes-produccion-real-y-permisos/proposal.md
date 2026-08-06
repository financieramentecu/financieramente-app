# Proposal: Reportes — Permisos por categoría + Producción Real

## Why

Leadership needs a dedicated **Producción Real** report (filters, hierarchy, KPIs, Regular vs Única, detail table, Excel) that excludes MFUND and applies currency rules. Menus like “Reportes” currently gate by static role flags, so admins cannot configure which **user categories** see which reports. Without category-level visibility (COM-80), the new report (COM-81) cannot be rolled out safely to Performance Leaders and later roles.

## What Changes

- **Admin — Permisos de Reportes (COM-80):** new Administración section to assign, per report, which `Category` values can see it (checkboxes + “Todas”, validation, toast, default empty for unconfigured reports).
- **Persist report visibility:** catalog of reports (stable codes) + per-category enablement; seed default enabling **Producción Real** for **Performance Leader**; audit all permission mutations.
- **Navigation:** menu group **Reportes** and sub-item **Producción Real** visible only when the user’s category has that report enabled (server-enforced; ADMIN bypass for administration and typically full report access).
- **Report — Producción Real (COM-81):** page under `/dashboard/reportes/produccion-real` with filters (date = Fecha de Creación, default current month; Tipo de Aporte; Compañía including SKANDIA; Moneda modes), reusable hierarchy tree, four KPIs, Regular vs Única bars, detail table, multi-sheet Excel export.
- **Business rules:** global MFUND exclusion (SKANDIA + MFUND); Único KPI also excludes 2ª+ Anualidad; TRM auto when Moneda = Todas; COP-only / foreign-only native modes otherwise.
- **Architecture:** new feature folders (`report-permissions`, `reports` / `produccion-real`); Prisma only in services; soft delete; `AsyncState` hooks; Bogotá date helpers; ERD update if schema changes.

### Out of Scope

- Rebuilding the production dashboard itself (reuse hierarchy/filter/TRM patterns only).
- Additional reports beyond **Producción Real** (catalog must allow future reports without redesign).
- Replacing role-based `RolePermissions.reportes` for legacy stub routes (`/reportes/negocio`, `/reportes/personales`) beyond making visibility consistent with the new model where those stubs remain.
- Changing MFUND business-create rules or commission math outside this report’s aggregation.

### Rollback Plan

- Feature flags / nav: remove Reportes sub-item and Admin card; deactivate permission rows (`status = false`).
- Schema: migration is additive; rollback = soft-deactivate permissions + hide UI; full schema drop only if never used in prod.
- Report APIs/UI: delete or unmount pages/routes; no change to `Business` data.

## Capabilities

### New Capabilities

- `report-permissions`: Admin UI + APIs to configure which user categories can see each report; persisted catalog + assignments; seed defaults; server-side authorization helper used by nav and report APIs.
- `produccion-real-report`: Producción Real report UI, filters, hierarchy-scoped KPIs/comparison/table, currency modes, MFUND/2ª+ rules, and Excel export (Resumen KPI, Regular vs Única, Detalle).

### Modified Capabilities

- `navigation`: **Reportes** group and **Producción Real** sub-item visibility driven by category report permissions (not only static `RolePermissions.reportes`); Administración gains **Permisos de Reportes** entry.
- `admin`: new Administración module card/section for report visibility configuration.

## Impact

| Area | Impact |
|------|--------|
| `prisma/schema.prisma`, seeds, `prisma/ERD.md` | New models for report catalog + category permissions; seed Performance Leader → Producción Real |
| `src/features/report-permissions/` | New feature: services, actions/routes, Admin UI, authz helpers |
| `src/features/reports/` (or `produccion-real`) | New feature: report page, services, hooks, Excel mapper |
| `src/app/dashboard/admin/report-permissions/` | New Admin page |
| `src/app/dashboard/reportes/produccion-real/` | New report page |
| `src/app/api/report-permissions/`, `src/app/api/reports/produccion-real/` | New HTTP APIs (delegate to services) |
| `src/lib/navigation/menu-items.tsx`, `menu-builder.ts` | Stable report codes + category-gated visibility |
| `src/features/auth/lib/audit-logger.ts` | New `AuditAction` values for permission CRUD and report export |
| Reuse | Hierarchy tree from `production-dashboard`; TRM proxy pattern; `xlsx-js-style` Excel; Bogotá date helpers |

### Affected modules/packages

- Admin UI, auth/audit, navigation, production-dashboard (reuse only), negocios domain rules (MFUND helper), Prisma schema/seeds.
