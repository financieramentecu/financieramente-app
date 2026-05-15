# Business Comprobantes Specification

## Purpose

Defines the behavior for uploading, persisting, listing, and viewing payment-proof images (comprobantes) per Negocio, backed by Digital Ocean Spaces. Also defines the unified Business row-action column that consolidates existing duplicate implementations.

---

## Requirements

### Requirement: BusinessSupport Model

The `BusinessSupport` table MUST exist with fields: `id` (UUID PK), `idNegocio` (FK → Business, NOT NULL), `url` (String, NOT NULL), `fileName` (String, NOT NULL), `uploadedBy` (FK → User, NOT NULL), `createdAt` (DateTime, auto), `status` (Boolean, default true).

Soft delete MUST be performed by setting `status = false`. `prisma.businessSupport.delete()` MUST NOT be called anywhere.

#### Scenario: Record created on successful upload

- GIVEN a valid presign + PUT + persist flow completes
- WHEN the persist endpoint saves the record
- THEN a `BusinessSupport` row exists with `status = true` and all required fields populated

#### Scenario: Soft delete

- GIVEN a `BusinessSupport` record with `status = true`
- WHEN a deactivate request is processed
- THEN `status` is set to `false` and the row remains in the database

---

### Requirement: Presign Endpoint

`POST /api/negocios/[id]/comprobantes/presign` MUST validate before issuing a presigned PUT URL.

Validation rules (in order):
1. Negocio MUST exist — 404 if not
2. Negocio `status` MUST be `EMITIDO` or `FONDEADO` — 422 if not
3. Negocio `numeroContrato` MUST NOT be null — 422 if null
4. Request body MUST contain `mimeType` ∈ `{image/jpeg, image/png, image/webp, image/gif}` — 422 if invalid

Key format: `{ENV_PREFIX}/negocios/{contract}/comprobantes/{contract}-{timestamp}-{uuid}.{ext}` where `ext` is derived from `mimeType`, NOT from the original filename.

Response on success: `200 { url: string, key: string }`.

#### Scenario: Happy path presign

- GIVEN a Negocio with status EMITIDO and a non-null contract number
- WHEN `POST /presign` is called with `mimeType: "image/jpeg"`
- THEN response is `200` with a `url` (presigned PUT URL) and a `key` matching the expected format

#### Scenario: Wrong status

- GIVEN a Negocio with status `PENDIENTE`
- WHEN `POST /presign` is called
- THEN response is `422` with an error indicating invalid status

#### Scenario: Null contract

- GIVEN a Negocio with status `EMITIDO` and `numeroContrato = null`
- WHEN `POST /presign` is called
- THEN response is `422`

#### Scenario: Unsupported MIME type

- GIVEN a valid Negocio
- WHEN `POST /presign` is called with `mimeType: "application/pdf"`
- THEN response is `422`

---

### Requirement: Persist Endpoint

`POST /api/negocios/[id]/comprobantes` MUST save a `BusinessSupport` record after the client has completed the direct PUT to Spaces.

Request body MUST contain `url` (non-empty string) and `key` (non-empty string). Server MUST re-derive and validate that the `key` extension corresponds to a supported MIME type. Missing or invalid fields return `422`.

Response on success: `201 { id, url, fileName, createdAt }`.

An `AuditLog` entry with action `COMPROBANTE_UPLOADED` MUST be written on every successful persist.

#### Scenario: Happy path persist

- GIVEN a valid Negocio and a body with `url` and `key`
- WHEN `POST /comprobantes` is called
- THEN response is `201` with the new record and an audit event is logged

#### Scenario: Missing url or key

- GIVEN a request body missing `url` or `key`
- WHEN `POST /comprobantes` is called
- THEN response is `422`

---

### Requirement: List Endpoint

`GET /api/negocios/[id]/comprobantes` MUST return all `BusinessSupport` records for the Negocio where `status = true`, ordered by `createdAt` descending.

Response shape: `200 { comprobantes: Array<{ id, url, fileName, uploadedBy: { id, name }, createdAt }> }`.

#### Scenario: Negocio with uploads

- GIVEN a Negocio with two active comprobantes
- WHEN `GET /comprobantes` is called
- THEN response includes both records ordered newest first

#### Scenario: Negocio not found

- GIVEN an id that does not match any Negocio
- WHEN `GET /comprobantes` is called
- THEN response is `404`

---

### Requirement: Business Row Actions UI

The Business table action column MUST be implemented as a single `BusinessRowActions` component, replacing the existing `ActionCell.tsx` and `BusinessTableSection.tsx` button strips.

The component MUST render:
- An inline "Subir comprobante" icon button with tooltip — visible only when `negocio.status ∈ {EMITIDO, FONDEADO}` AND `negocio.numeroContrato !== null`
- An inline "Ver comprobantes" icon button with tooltip — always visible
- A "⋮" dropdown containing: Editar, Ver detalle, Eliminar — preserving all existing behavior and role guards

#### Scenario: EMITIDO with contract — upload button visible

- GIVEN a Negocio row with status EMITIDO and a non-null contract
- WHEN the row renders
- THEN the "Subir comprobante" button is visible

#### Scenario: PENDIENTE — upload button hidden

- GIVEN a Negocio row with status PENDIENTE
- WHEN the row renders
- THEN the "Subir comprobante" button is NOT rendered

#### Scenario: EMITIDO but null contract — upload button hidden

- GIVEN a Negocio row with status EMITIDO and `numeroContrato = null`
- WHEN the row renders
- THEN the "Subir comprobante" button is NOT rendered

---

### Requirement: Upload Modal

`UploadComprobantesModal` MUST accept one image at a time. Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`. On success the modal MUST close automatically. On error the modal MUST remain open and display an error message.

#### Scenario: Successful upload closes modal

- GIVEN the upload modal is open
- WHEN the user selects a valid image and submits
- THEN the modal closes and the comprobante list refreshes

#### Scenario: Upload error keeps modal open

- GIVEN the upload modal is open
- WHEN the presign or PUT request fails
- THEN the modal stays open with an error message visible

---

### Requirement: View Sheet

`ViewComprobantesSheet` MUST render as a right-side Sheet wider than `xl`. Layout: thumbnail list on the left, large image previewer on the right. Thumbnails with `status = false` MUST NOT appear.

#### Scenario: Sheet opens with thumbnails

- GIVEN a Negocio with two active comprobantes
- WHEN the user clicks "Ver comprobantes"
- THEN the sheet opens showing two thumbnails; clicking one shows the full image in the previewer

---

### Requirement: Audit Log Events

Two new `AuditAction` enum values MUST be added: `COMPROBANTE_UPLOADED`, `COMPROBANTE_DEACTIVATED`. Each audit event MUST include `userId`, `email`, `ipAddress`, `userAgent`, and a human-readable `details` string. `logAuditEvent` MUST NOT throw.

---

### Requirement: Environment Variables

The following env vars MUST be present and non-empty at runtime: `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_ENDPOINT`, `DO_SPACES_BUCKET`, `DO_SPACES_PREFIX`. The service MUST fail fast with a clear error if any are missing during initialization.

---

## Out of Scope

Non-image uploads, server-side image processing, role-based upload restrictions, bulk operations, historical data migration, public sharing links.
