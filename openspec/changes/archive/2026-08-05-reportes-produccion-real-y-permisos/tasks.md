## 1. Schema, seeds, and audit foundation

- [x] 1.1 Add Prisma models `ReportDefinition` and `CategoryReportPermission` per `design.md` (unique `[idReport, idCategory]`, soft-delete via `status`, relations on `Category`)
- [x] 1.2 Create migration and update `prisma/ERD.md` (enums/relations/fields + note under índices if needed)
- [x] 1.3 Add seed for report `PRODUCCION_REAL` (name **Producción Real**, route `/dashboard/reportes/produccion-real`) and enable **Performance Leader** category
- [x] 1.4 Wire seed into `prisma/seed.ts` pipeline
- [x] 1.5 Add audit actions (e.g. `REPORT_PERMISSION_UPDATED`, `REPORT_EXPORTED`) to `audit-logger.ts`

## 2. Report permissions feature (COM-80 backend)

- [x] 2.1 Create `src/features/report-permissions/` scaffold (`types/`, `lib/` Zod schemas, `services/`, `hooks/`, `__tests__/`)
- [x] 2.2 Implement service: list catalog + permission matrix; replace permissions for a report (upsert enable, soft-disable removed); never physical delete
- [x] 2.3 Implement `canViewReport(user, reportCode)` with ADMIN bypass and active category permission only
- [x] 2.4 Add `GET/PUT /api/report-permissions` (admin-only): validate with Zod, delegate to service, audit on PUT, no Prisma in route
- [x] 2.5 Add `GET /api/reports/me` returning authorized report codes for the session user (for nav)

## 3. Report permissions Admin UI (COM-80)

- [x] 3.1 Add Admin hub card + sidebar sub-item **Permisos de Reportes** → `/dashboard/admin/report-permissions`
- [x] 3.2 Build page: report selector, category checkboxes, **Todas** cascade, empty state **Sin categorías habilitadas**
- [x] 3.3 Hook with `AsyncState`; **Guardar** blocks zero categories with warning **Debe seleccionar al menos una categoría**; success toast **Permisos actualizados correctamente**
- [x] 3.4 Unit tests for Todas toggle, empty-save guard, and matrix mapping

## 4. Navigation gating

- [x] 4.1 Extend `MenuItem` with optional `reportCode`; add **Producción Real** under Reportes
- [x] 4.2 Update `menu-builder` (and Sidebar session wiring) to show Reportes / sub-items from authorized codes via `/api/reports/me` (or session enrichment)
- [x] 4.3 Hide unimplemented legacy Reportes stubs for non-authorized users (avoid dead 404 links); keep Administración entry for permissions

## 5. Producción Real domain services (COM-81)

- [x] 5.1 Create `src/features/reports/produccion-real/` scaffold (types, lib, services, hooks, components, mappers, `__tests__/`)
- [x] 5.2 Implement shared Prisma WHERE builder: createdAt Bogotá range, contribution types, companies, currency mode, hierarchy userIds ∩ scope, global MFUND exclusion (SKANDIA+MFUND)
- [x] 5.3 Implement KPI service: Producción Real, Regular, Único (exclude 2ª+ Anualidad), Fondeado + conversion %
- [x] 5.4 Implement detail list service (columns per spec); format dates with `formatDateBogota`
- [x] 5.5 Implement currency conversion helper reusing classifier + TRM (Todas → USD; FOREIGN/COP native)
- [x] 5.6 Add API routes `GET .../kpis`, `GET .../detail` with `canViewReport('PRODUCCION_REAL')` then service delegation

## 6. Producción Real UI

- [x] 6.1 Page `/dashboard/reportes/produccion-real` with auth gate
- [x] 6.2 Filter bar (draft/apply/clear): defaults current Bogotá month, Tipo Todas, Compañía Todas (incl. SKANDIA), Moneda Todas TRM auto; Limpiar / Aplicar / Descargar Excel
- [x] 6.3 Reuse dashboard hierarchy tree panel/context (search + checkbox cascade); empty selection → zero KPIs / empty table
- [x] 6.4 KPI cards + Regular vs Única proportional bars + continuous-scroll detail table
- [x] 6.5 Hooks using `AsyncState` for catalogs, KPIs, detail, TRM, export

## 7. Excel export

- [x] 7.1 Mapper/builder for sheets **Resumen KPI**, **Regular vs Única**, **Detalle** (`xlsx-js-style`)
- [x] 7.2 `POST /api/reports/produccion-real/export`: same filters as screen, authz, audit `REPORT_EXPORTED`, empty/oversize handling
- [x] 7.3 Wire **Descargar Excel** button to export hook

## 8. Tests and quality gates

- [x] 8.1 Unit tests: MFUND exclusion, currency modes, KPI formulas (incl. Único 2ª+ exclusion, Fondeado %), WHERE builder, `canViewReport`
- [x] 8.2 Unit/component tests: Admin permissions UI behaviors (CA1–CA6); filter defaults; hierarchy selection affecting aggregates (mock APIs)
- [x] 8.3 Integration tests: permissions PUT/GET; report APIs 403 without permission; 200 with Performance Leader seed; export sheets present
- [x] 8.4 Run `npm run type-check && npm run lint` and targeted unit/integration suites for touched features

## 9. Architecture compliance

- [x] 9.1 Invoke architecture-enforcer on new `src/features/report-permissions` and `src/features/reports` code
- [x] 9.2 Confirm no Prisma in route handlers; soft delete only; Spanish UI strings only; English identifiers
