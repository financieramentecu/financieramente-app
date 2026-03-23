# Manual / E2E Checklist: Detalle Pre-liquidación (Liquidar/Rezagar)

**Justification**: The project has Playwright E2E (`e2e/pre-liquidacion.spec.ts`) for the file list and bulk pre-liquidar flow. The new detail page (`/dashboard/pre-liquidacion/[fileId]`) is not yet covered by automated E2E. Use this checklist for manual verification or as a reference when adding E2E tests in a follow-up.

## Preconditions

- User with role `ADMIN`, `ASISTENTE_GERENCIA_OPERATIVA`, or `ANALISTA_SOPORTE`.
- At least one file in pre-liquidación with SYNCHRONIZED records.

## Checklist

- [ ] **Navigate from file list to detail**: On pre-liquidación file list, click "Ver Detalle" for a file → navigates to `/dashboard/pre-liquidacion/[fileId]`.
- [ ] **Detail page loads**: Page shows filename (header), table of SYNCHRONIZED records, and action bar.
- [ ] **Column set by fileType**: For a VOLUNTARIA file, columns include Fecha Inicio, Fecha Fin; for POLIZA, columns include % Clawback, Es Clawback, Fecha Rezagado.
- [ ] **Select rows**: Check one or more row checkboxes; select-all toggles all visible rows; bulk action bar shows count and enables Liquidar/Rezagar when ≥ 1 selected.
- [ ] **Liquidar flow**: Click Liquidar → confirmation modal → confirm → selected records move to SETTLED; selection clears; table refetches.
- [ ] **Rezagar flow**: Click Rezagar → confirmation modal → confirm → selected records move to LAG with lag date; selection clears; table refetches.
- [ ] **File completes**: When all SYNCHRONIZED records of a file are liquidated, `fileCompleted: true` is returned (optional: toast or navigation back to list).
- [ ] **Ver Negocio**: Click "Ver Negocio" on a row → business detail modal opens (read-only).
- [ ] **Unauthorized role**: User with role other than ADMIN/ASISTENTE_GERENCIA_OPERATIVA/ANALISTA_SOPORTE cannot access the detail page or APIs (403).

## Optional E2E follow-up

Add a Playwright test in `e2e/pre-liquidacion.spec.ts` (or a new `e2e/pre-liquidacion-detalle.spec.ts`) that: logs in as allowed role, mocks GET registros, navigates to detail, selects rows, mocks POST liquidar, confirms, and asserts table update or redirect.
