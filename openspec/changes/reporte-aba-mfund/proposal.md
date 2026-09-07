# Proposal: Reportes — ABA-MFUND

## Why

Leadership needs a dedicated **ABA-MFUND** sales analytics report (filters, hierarchy, COP KPIs, agent ranking, detail table, Excel) that includes only SKANDIA + MFUND businesses. Producción Real already exists but **excludes** that combination, so leaders cannot analyze ABA volume, funded vs issued mix, or top agents without a separate report gated to Administrador, Performance Leader, and Business Leader.

## What Changes

- **Report — ABA-MFUND:** new Reportes page at `/dashboard/reportes/aba-mfund` titled **ABA-MFUND**, catalog code `ABA_MFUND`, forked from the Producción Real pattern without changing that report’s MFUND exclusion.
- **Access:** page, APIs, and **Reportes** sub-item visible only with `UserRole.ADMIN` bypass **or** an enabled `CategoryReportPermission` for the user’s category. Seed default enablement for category names exactly **Performance Leader** and **Business Leader**. HU “Administrador” means `UserRole.ADMIN`, not a category.
- **Default filters:** universe is **only** Compañía = SKANDIA **and** Producto = MFUND (everything else is excluded). **Desde** / **Hasta** = current Bogotá month on **Fecha de creación**. **Jerarquía** = **Toda**. **Estado** = **Todos**.
- **KPIs (COP only):** **ABA Total** = sum of business value of filtered rows; **Fondeado** = sum where status is Fondeado (`FONDEADO`); **Emitido** = sum where status is Emitido (`EMITIDO`); **Ticket promedio ABA** = ABA Total / count of businesses (0 when count is 0).
- **Ranking heatmap “ABA por Agente”:** Top 6 agents by sales volume descending (tie-break: agent name, then `idUser`). Clicking an agent expands a row with related businesses: Producto, Contrato, Valor, Estado, **Ir a negocio**. Agente = `Business.idUser` (owner), not commission beneficiary.
- **Detail table:** Fecha de creación, Cliente (Nombre Apellido, sin guion), Periodicidad, Estado, Valor del Negocio (COP), Fecha de emisión, Fecha de Fondeo (`dateAnchored`). Excel export of **all** filtered detail rows (max 5000), audited as `REPORT_EXPORTED`.
- **Gating:** Flagsmith flag `reportes_aba_mfund` with fallback `true` (same pattern as Producción Real). Reuse `HierarchySelectionProvider` and viewer-scope intersection (non-admin **Toda** = visible subtree).

### Product decisions (locked)

- Clone/fork Producción Real; **do not** relax or change MFUND exclusion in that report.
- APIs: `GET` kpis, `GET` detail, `GET` ranking, `POST` export.
- Currency: COP only; no TRM. Defensive filter `idCurrency = 1`.
- Estado **Todos** = no status filter (includes `CANCELADO` unless the user filters). **ABA Total** includes all statuses present after filters.
- Ranking UI MAY follow production-dashboard `HeatmapTablePanel` expand-row (no Radix Accordion required).
- This branch has **no** `leads-analytics` feature; do not depend on it.

### Out of Scope

- Changing Producción Real requirements, filters, KPIs, MFUND exclusion, or Excel sheets.
- TRM / multi-currency modes, Tipo de Aporte, or Compañía/Producto pickers beyond the fixed SKANDIA + MFUND universe.
- Ranking beyond Top 6, agent = commission beneficiary, or new hierarchy widgets (reuse existing provider/scope).
- New Admin screens (catalog + seed only; existing **Permisos de Reportes** already configures categories).
- `leads-analytics` or any module not present on this branch.
- Changing business-create rules, commission math, or `Business` persisted data.

### Rollback Plan

- Feature flag / nav: disable `reportes_aba_mfund` or hide the **ABA-MFUND** sub-item; deactivate `CategoryReportPermission` rows (`status = false`) for `ABA_MFUND`.
- Catalog: additive seed; rollback = soft-deactivate catalog/permission rows + unmount page/routes.
- Report APIs/UI: delete or unmount `/dashboard/reportes/aba-mfund` and related APIs; no change to `Business` data.

## Capabilities

### New Capabilities

- `aba-mfund-report`: ABA-MFUND report UI, default SKANDIA+MFUND universe, date/hierarchy/status filters, COP KPIs, Top 6 agent ranking with expand-row businesses, detail table, and Excel export of filtered rows.

### Modified Capabilities

- `report-permissions`: catalog MUST include report code `ABA_MFUND` (display name **ABA-MFUND**); seed MUST enable categories named exactly **Performance Leader** and **Business Leader** for that code (ADMIN bypass unchanged).
- `navigation`: **Reportes** group MUST include sub-item **ABA-MFUND** linking to `/dashboard/reportes/aba-mfund`, visible only when report code `ABA_MFUND` is enabled for the user’s category (or administrator bypass).

## Impact

| Area | Impact |
|------|--------|
| `prisma/seeds/` (catalog + `CategoryReportPermission`) | Add `ABA_MFUND` / **ABA-MFUND**; seed Performance Leader + Business Leader. Schema unchanged unless catalog seed pattern requires it. |
| `src/features/reports/` (or sibling of `produccion-real`) | New report feature: page, filters, KPIs, ranking, detail, Excel mapper, services, hooks |
| `src/app/dashboard/reportes/aba-mfund/` | New report page |
| `src/app/api/reports/aba-mfund/` | New HTTP APIs: GET kpis, GET detail, GET ranking, POST export (delegate to services) |
| `src/lib/navigation/menu-items.tsx`, `menu-builder.ts` | New Reportes sub-item gated by `ABA_MFUND` |
| `src/features/shared/` feature-flag types + Flagsmith fallback | New flag `reportes_aba_mfund` (fallback true) |
| `src/features/auth/lib/audit-logger.ts` | Export audited as `REPORT_EXPORTED` (reuse existing action if already defined) |
| `produccion-real-report` | **Reuse only** — copy filter/hierarchy/Excel patterns; **do not** change that spec or MFUND exclusion |
| Reuse | `HierarchySelectionProvider` + viewer scope; production-dashboard heatmap expand-row; Bogotá date helpers; `xlsx-js-style` |

### Affected modules/packages

- Navigation, report-permissions catalog/seeds, reports feature (new ABA-MFUND), auth/audit, Flagsmith flag registry.
- production-dashboard and produccion-real: **reuse only**, no requirement changes.
- negocios `Business` reads (owner `idUser`, `dateAnchored`, status, COP value); no writes.
