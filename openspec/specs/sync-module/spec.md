# Spec: sync-module

## Purpose

Define behavioral requirements for the file synchronization module (`HistorialCargasTab` and related load-file feature components).

---

## Requirements

### Requirement: Preliquidar Button per File Card

The system MUST display a "Preliquidar" button on each file card in `HistorialCargasTab` when the following conditions are ALL true: `sincronizados > 0` AND `estado === 'LOAD'` AND the authenticated user's role has `liquidaciones.preliquidacion: true`.

The button MUST be hidden (not just disabled) for roles that lack the permission.

The system MUST disable the button and show a loading indicator while the API call is in flight to prevent duplicate submissions.

#### Scenario: Authorized user sees button on eligible card

- GIVEN a user with role ADMIN or ASISTENTE_GERENCIA_OPERATIVA is on `/dashboard/carga-archivos` Historial tab
- WHEN a file card has `sincronizados > 0` and `estado === 'LOAD'`
- THEN the "Preliquidar" button is visible on that card

#### Scenario: Unauthorized role does not see button

- GIVEN a user whose role does NOT have `liquidaciones.preliquidacion: true`
- WHEN viewing any file card in the Historial tab
- THEN no "Preliquidar" button is rendered

#### Scenario: Card ineligible — no synchronized records

- GIVEN a file card where `sincronizados === 0` or `estado !== 'LOAD'`
- WHEN an authorized user views it
- THEN the "Preliquidar" button is NOT shown

---

### Requirement: Confirmation Dialog Before Preliquidar

The system MUST show a confirmation dialog before invoking the preliquidation API.

#### Scenario: User confirms and API succeeds

- GIVEN the "Preliquidar" button is clicked on an eligible card
- WHEN the user confirms the dialog
- THEN `POST /api/pre-liquidacion/procesar` is called with `fileImportId` (number) and current `mes`
- AND on success, the file history list is refreshed and a success toast is shown

#### Scenario: User cancels dialog

- GIVEN the "Preliquidar" button is clicked
- WHEN the user dismisses the confirmation dialog
- THEN no API call is made and the card state is unchanged

#### Scenario: API returns error

- GIVEN the user confirms preliquidation
- WHEN the API call returns a non-2xx response
- THEN an error toast is shown and the button is re-enabled

---

### Requirement: CargaHistorial Type Extension

The `CargaHistorial` interface MUST include `fileType: 'POLIZA' | 'VOLUNTARIA'` and `idFileImport: number`.

The mapping in `use-file-history.ts` MUST populate both fields from the API response (they are already present in `FileImportHistory`).

#### Scenario: Fields correctly mapped

- GIVEN the API returns a history item with `fileType` and `idFileImport`
- WHEN `use-file-history.ts` maps the response
- THEN the resulting `CargaHistorial` object contains correct `fileType` and numeric `idFileImport`

---

### Requirement: Preliquidar API Helper

The `load-file-api.ts` module MUST expose a `preliquidar(fileImportId: number, mes: string)` function that calls `POST /api/pre-liquidacion/procesar`.

#### Scenario: Helper invokes correct endpoint

- GIVEN `preliquidar(42, '2026-03')` is called
- WHEN the request is sent
- THEN `POST /api/pre-liquidacion/procesar` receives `{ fileImportId: 42, mes: '2026-03' }`
