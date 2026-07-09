# Delta for negocios

## MODIFIED Requirements

### Requirement: Confirmación previa para fondeo directo

Cuando el negocio no tiene anualidades, el sistema MUST solicitar confirmación explícita antes de ejecutar el fondeo. Cuando `numAportes = 0`, la confirmación MUST ser un modal "Confirmar Fondeo" con selector de fecha (default: hoy, Bogotá), visible SOLO para ADMIN, ANALISTA_SOPORTE y ASISTENTE_GERENCIA_OPERATIVA. Cuando `numAportes = 1`, la confirmación SHALL mantener el AlertDialog simple sin selector de fecha.

(Previously: siempre AlertDialog simple sin fecha, para cualquier `numAportes` sin anualidades; fondeo anclado a `new Date()` del servidor.)

#### Scenario: Modal con fecha para numAportes = 0

- GIVEN negocio `EMITIDO`, `numAportes = 0`, usuario autorizado
- WHEN hace clic en "Fondear"
- THEN el modal "Confirmar Fondeo" MUST mostrarse con selector de fecha inicializado en hoy (Bogotá)

#### Scenario: Confirmar con fecha seleccionada

- GIVEN modal abierto para negocio con `numAportes = 0`
- WHEN el usuario elige fecha y confirma
- THEN el sistema SHALL enviar `fundedDate` (YYYY-MM-DD) al backend y ejecutar el fondeo con esa fecha

#### Scenario: Cancelar fondeo directo

- GIVEN modal o AlertDialog de fondeo directo abierto
- WHEN el usuario cancela o cierra
- THEN el sistema SHALL NOT ejecutar el fondeo

#### Scenario: numAportes = 1 sin cambios

- GIVEN negocio `EMITIDO`, `numAportes = 1`
- WHEN el usuario confirma fondeo
- THEN el sistema SHALL ejecutar el fondeo vía AlertDialog simple, sin selector de fecha

### Requirement: Fondeo action visibility for EMITIDO businesses

| Condition | Label |
|-----------|--------|
| `EMITIDO`, `numAportes = 0`, ADMIN/ANALISTA_SOPORTE/ASISTENTE_GERENCIA_OPERATIVA | **Fondear** (opens date-picker modal) |
| `EMITIDO`, `numAportes = 1`, authorized | **Fondear** (direct, no modal) |
| `EMITIDO`/`FONDEADO`, `numAportes ≥ 2` + ≥1 `SIN_FONDEAR`, authorized | **Fondear** (opens modal) |
| AGENTE (Coach) | view-only, no funding action |

(Previously: `numAportes ∈ {0,1}` fondeaba directo sin modal en ambos casos; ANALISTA_SOPORTE no tenía ninguna acción de fondeo.)

#### Scenario: numAportes = 0 con modal de fecha

- GIVEN `EMITIDO`, `numAportes = 0`, ADMIN, ANALISTA_SOPORTE o ASISTENTE_GERENCIA_OPERATIVA
- WHEN the list renders
- THEN **"Fondear"** MUST appear and clicking it MUST open the date-picker modal

#### Scenario: numAportes = 1 directo (sin cambios)

- GIVEN `EMITIDO`, `numAportes = 1`, authorized viewer
- WHEN the list renders
- THEN **"Fondear"** MUST appear and clicking it MUST NOT open a modal

#### Scenario: numAportes ≥ 2 con modal (sin cambios)

- GIVEN `EMITIDO`/`FONDEADO`, `numAportes ≥ 2`, ≥1 `SIN_FONDEAR`, authorized
- WHEN the list renders
- THEN **"Fondear"** MUST appear and clicking it SHALL open FundingModal

#### Scenario: AGENTE (Coach) sin acción (sin cambios)

- GIVEN any eligible business and role AGENTE/Coach
- WHEN the list renders
- THEN neither direct fondeo nor modal fondeo SHALL appear

#### Scenario: ANALISTA_SOPORTE ahora autorizado (numAportes = 0)

- GIVEN `EMITIDO`, `numAportes = 0`, rol ANALISTA_SOPORTE
- WHEN the list renders
- THEN **"Fondear"** MUST appear and clicking it MUST open the date-picker modal

### Requirement: FONDEADO transition on funding confirmation

| Path | Rule |
|------|------|
| No annual rows | Direct: `FONDEADO` + `dateAnchored` (atomic). |
| `numAportes = 0` | `dateAnchored` MUST derive from request `fundedDate` (YYYY-MM-DD) via `dateOnlyToBogotaNoonUtc()`; if absent, fallback to today (Bogotá). |
| Annual rows | Updates installments; first batch while `EMITIDO` sets parent `FONDEADO` + `dateAnchored`. |
| Parent already FONDEADO | Later batches update rows only; parent `dateAnchored` MUST update to latest funding date. |
| **POST** `/fondear` | MUST fail if any `AnnualPayment` exists. |
| Invalid/future `fundedDate` | MUST reject with 400. |
| Wrong status/method | MUST reject (e.g. VENTA_EFECTUADA, direct when ineligible) with 400/404 as applicable. |

(Previously: `dateAnchored` for direct fondeo without annual rows always used server's `new Date()`; no request body date accepted; no explicit date validation.)

#### Scenario: Direct con fecha provista

- GIVEN `EMITIDO`, `numAportes = 0`, request body `{ fundedDate: "2026-06-15" }`
- WHEN direct fondear completes
- THEN `status` SHALL be `FONDEADO` and `dateAnchored` SHALL equal noon Bogotá UTC for `2026-06-15`

#### Scenario: Direct sin fecha — fallback a hoy

- GIVEN `EMITIDO`, `numAportes = 0`, request body sin `fundedDate`
- WHEN direct fondear completes
- THEN `dateAnchored` SHALL equal today's date at noon Bogotá UTC

#### Scenario: Fecha inválida o futura rechazada

- GIVEN request body con `fundedDate` inválida o posterior a hoy
- WHEN direct fondear se solicita
- THEN the API MUST return 400 Bad Request and no state change

#### Scenario: Negocio inexistente

- GIVEN `id` de negocio inexistente
- WHEN direct fondear se solicita
- THEN the API MUST return 404 and no state change

#### Scenario: Sin permiso

- GIVEN usuario sin rol autorizado (`canFundPayments` false)
- WHEN direct fondear se solicita
- THEN the API MUST return 403 and no state change

#### Scenario: AuditLog en fondeo directo con fecha

- GIVEN direct fondeo exitoso con `numAportes = 0`
- WHEN la transacción se confirma
- THEN an AuditLog entry MUST be created with action `BUSINESS_FUNDED` (or equivalent), `userId`, `email`, `ipAddress`, `userAgent`, and a human-readable `details` string including business id, contract, and the selected `fundedDate`

#### Scenario: POST directo bloqueado con anualidades (sin cambios)

- GIVEN `EMITIDO` and ≥1 `AnnualPayment`
- WHEN direct **POST** `/fondear` runs
- THEN the request MUST be rejected; no state change
