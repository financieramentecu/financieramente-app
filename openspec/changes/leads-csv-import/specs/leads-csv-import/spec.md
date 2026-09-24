# Leads CSV Import Specification

## Purpose

Define the CSV template download, row validation rules, strict resolvers, upsert semantics, per-row rejection reporting, authorization, and audit trail for `POST /api/leads/csv-import` and `GET /api/leads/csv-template`. This is a curated, human-operated import path — separate from `lead-sync.service.ts` — and MUST NOT reuse any of the webhook's lenient fallback behavior.

## Requirements

### Requirement: CSV Template Download

`GET /api/leads/csv-template` MUST return a plain-text CSV response with `Content-Disposition: attachment` containing exactly these 11 headers, in this exact order, and no data rows: `id_externo_crm, nombre, apellido, telefono, correo, columna_funnel, estado, fecha_creacion, origen, propietario_correo, propietario_nombre`.

`propietario_nombre` is optional per row and is the last column. An uploaded file whose header row does not match all 11 headers exactly, in count and order, MUST be rejected as a whole before any row is processed.

#### Scenario: Template download returns header-only CSV

- GIVEN an authorized user requests `GET /api/leads/csv-template`
- WHEN the response is generated
- THEN the CSV body SHALL contain exactly one line with the 11 headers in the specified order, ending with `propietario_nombre`
- AND the response SHALL include `Content-Disposition: attachment`

#### Scenario: File missing the propietario_nombre header is rejected whole-file

- GIVEN an uploaded file whose header row carries only the previous 10 headers
- WHEN the file is parsed
- THEN the whole file SHALL be rejected with a reason naming the 11 expected headers
- AND no row SHALL be imported

### Requirement: Row-Level Import Tolerance (Never All-or-Nothing)

`POST /api/leads/csv-import` MUST process every row independently. A row failing validation MUST NOT prevent other valid rows in the same file from being persisted. The response MUST report, per rejected row, its row number and a human-readable reason.

#### Scenario: Mixed-validity file imports valid rows and reports rejected ones

- GIVEN a CSV file with 5 rows where 2 rows fail validation
- WHEN the file is imported
- THEN the 3 valid rows SHALL be persisted as leads
- AND the response SHALL list the 2 rejected rows with their row number and rejection reason
- AND the response SHALL NOT reject the entire file because of the 2 invalid rows

### Requirement: In-File Duplicate id_externo_crm Detection

When the same `id_externo_crm` appears in more than one row of the same uploaded file, the system MUST process the first occurrence normally and MUST reject every later occurrence with a reason identifying it as a duplicate within the file.

#### Scenario: Second occurrence of a duplicate id_externo_crm is rejected

- GIVEN a CSV file where row 3 and row 7 both have `id_externo_crm = "CRM-100"`
- WHEN the file is imported
- THEN row 3 SHALL be processed and upserted normally
- AND row 7 SHALL be rejected with a reason stating it duplicates `id_externo_crm` already seen earlier in the file

### Requirement: Strict estado Resolution (Fail Closed)

The system MUST parse `estado` by case-insensitive matching against exactly the four accepted tokens `open`, `won`, `lost`, `abandoned`. A row whose `estado` does not match any of these four tokens MUST be rejected with a reason naming the unrecognized value. The system MUST NOT normalize an unrecognized `estado` to `OPEN` or any other default.

#### Scenario: Recognized estado value resolves to the internal enum

- GIVEN a row with `estado = "Won"`
- WHEN the row is validated
- THEN it SHALL resolve to the internal `outcomeStatus` value `WON`

#### Scenario: Unrecognized estado value is rejected, never normalized

- GIVEN a row with `estado = "en_revision"`
- WHEN the file is imported
- THEN that row SHALL be rejected with a reason naming `"en_revision"` as unrecognized
- AND no lead SHALL be created or updated from that row with `outcomeStatus = "OPEN"` as a silent fallback

### Requirement: Strict columna_funnel Resolution (Exact, Case-Sensitive)

The system MUST resolve `columna_funnel` by exact, case-sensitive string match against the `name` of an active `LeadFunnelColumn`. A row whose `columna_funnel` does not match any active column name exactly MUST be rejected. The rejection reason MUST list the valid expected column names. The system MUST NOT fall back to a "Sin mapear" or any default column for CSV import.

#### Scenario: Exact match resolves the funnel column

- GIVEN an active `LeadFunnelColumn` with `name = "Contactado"`
- WHEN a row has `columna_funnel = "Contactado"`
- THEN the row SHALL resolve to that column

#### Scenario: Case mismatch is rejected, not fuzzy-matched

- GIVEN an active `LeadFunnelColumn` with `name = "Contactado"`
- WHEN a row has `columna_funnel = "contactado"`
- THEN the row SHALL be rejected
- AND the rejection reason SHALL list the valid active column names, including `"Contactado"`

#### Scenario: Unmatched columna_funnel is rejected, never routed to a fallback column

- GIVEN no active `LeadFunnelColumn` has `name = "Etapa Inexistente"`
- WHEN a row has `columna_funnel = "Etapa Inexistente"`
- THEN the row SHALL be rejected with a reason listing the valid active column names
- AND no lead SHALL be assigned to a "Sin mapear" or default column as a result of that row

### Requirement: fecha_creacion Validation

`fecha_creacion` MUST be an offset-aware ISO 8601 string. A naive (offset-less) or otherwise malformed value MUST cause the row to be rejected.

#### Scenario: Offset-aware fecha_creacion is accepted

- GIVEN a row with `fecha_creacion = "2023-01-15T10:00:00-05:00"`
- WHEN the row is validated
- THEN validation SHALL succeed and that value SHALL be used to resolve the lead's creation date

#### Scenario: Naive or malformed fecha_creacion is rejected

- GIVEN a row with `fecha_creacion = "2023-01-15"` (no time offset)
- WHEN the file is imported
- THEN that row SHALL be rejected with a reason describing the required ISO 8601 offset-aware format

### Requirement: Upsert by id_externo_crm With Partial Merge

The system MUST upsert the `Lead` by `id_externo_crm`, reusing `buildLeadUpsertData`'s "omit means preserve" semantics: an empty or omitted optional CSV field MUST NOT overwrite a previously stored non-empty value for that field.

#### Scenario: Re-importing the same id_externo_crm updates the existing lead

- GIVEN a lead already exists for `id_externo_crm = "CRM-200"`
- WHEN a new file imports a row with `id_externo_crm = "CRM-200"` and updated `telefono`
- THEN the existing lead SHALL be updated, not duplicated
- AND `Lead.telefono` SHALL reflect the new value

#### Scenario: Omitted optional field preserves the stored value

- GIVEN a lead with `origen = "Feria"` already stored
- WHEN a re-import row for the same `id_externo_crm` leaves `origen` empty
- THEN `Lead.origen` SHALL remain `"Feria"` after the upsert

### Requirement: WON Outcome Status Lock Reported, Not Silent

When an existing lead's `outcomeStatus` is `WON` and an import row for the same `id_externo_crm` carries a different `estado`, the row MUST still be processed and its other fields upserted (the row MUST NOT be rejected), but `Lead.outcomeStatus` MUST remain `WON`. The import summary MUST explicitly list that lead as blocked by the WON lock.

#### Scenario: WON lead is not downgraded but the row still succeeds

- GIVEN an existing lead for `id_externo_crm = "CRM-300"` with `outcomeStatus = "WON"`
- WHEN a row for `id_externo_crm = "CRM-300"` carries `estado = "lost"`
- THEN the row SHALL be treated as successfully processed, not rejected
- AND `Lead.outcomeStatus` SHALL remain `"WON"`
- AND the import summary SHALL explicitly report `CRM-300` as blocked by the WON lock

### Requirement: Owner Resolution Order — Email First, Exact Name as Fallback

The system MUST resolve the owner of each row in this order, and MUST NOT block or reject a row because owner resolution failed:

1. If `propietario_correo` is present and matches an active `User.email` (case-insensitive, trimmed), that user SHALL be assigned.
2. If `propietario_correo` is empty OR matches no active user, and `propietario_nombre` is present, the system SHALL compare the normalized `propietario_nombre` against the normalized `User.name + " " + User.lastName` of every active user. Normalization MUST trim, collapse internal whitespace, lowercase, and strip diacritics. A match MUST be exact over those normalized values. If EXACTLY ONE active user matches, that user SHALL be assigned.
3. If `propietario_nombre` matches no active user, or matches MORE THAN ONE, the lead MUST be imported WITHOUT an owner and MUST be reported in the summary.

The system MUST NOT perform fuzzy, partial, prefix, "contains", or similarity matching on `propietario_nombre`. Ambiguity and non-matches MUST always fall through to ownerless — never to a guessed assignment.

A failed or ambiguous name fallback MUST NOT clear an owner already stored on an existing lead when `propietario_correo` was empty; the existing owner SHALL be preserved. The pre-existing rule that a present-but-unmatched `propietario_correo` clears the owner MUST remain unchanged.

This resolution order is exclusive to the CSV import path. The CRM webhook (`lead-sync.service.ts`) owner resolution MUST remain unchanged.

#### Scenario: propietario_correo match wins and the name fallback is not used

- GIVEN a row whose `propietario_correo` matches an active user
- AND whose `propietario_nombre` names a different active user
- WHEN the row is imported
- THEN the lead SHALL be assigned to the user matched by `propietario_correo`

#### Scenario: Empty propietario_correo with an exact single name match assigns the owner

- GIVEN exactly one active user with `name = "Yohan"` and `lastName = "España"`
- WHEN a row has `propietario_correo` empty and `propietario_nombre = "  yohan   espana "`
- THEN the row SHALL be imported and assigned to that user
- AND the lead SHALL NOT be reported as ownerless

#### Scenario: Unmatched propietario_correo falls back to the name match

- GIVEN a row with `propietario_correo = "noexiste@example.com"` matching no user
- AND `propietario_nombre` matching exactly one active user
- WHEN the file is imported
- THEN the row SHALL be assigned to the user matched by name

#### Scenario: Ambiguous name never assigns an owner

- GIVEN two active users whose normalized full name is `"juan perez"`
- WHEN a row has `propietario_nombre = "Juan Pérez"` and no matching `propietario_correo`
- THEN the row SHALL be imported without an owner
- AND the summary SHALL report it as ambiguous, naming the number of candidates
- AND neither candidate SHALL be assigned

#### Scenario: Partial name never matches

- GIVEN an active user whose normalized full name is `"yohan espana"`
- WHEN a row has `propietario_nombre = "Yohan"`
- THEN the row SHALL be imported without an owner
- AND no user SHALL be assigned by partial or similarity matching

### Requirement: Ownerless Leads Report the Reason

Every lead imported without an owner MUST be listed in the import summary with a machine-readable reason distinguishing at least: unmatched `propietario_correo` with no name supplied, unmatched `propietario_nombre`, ambiguous `propietario_nombre` (including the candidate count), and no owner information supplied at all. The report MUST echo the offending `propietario_correo` and/or `propietario_nombre` value so the operator knows exactly what to correct.

A row where both `propietario_correo` and `propietario_nombre` are empty MUST be reported as ownerless only when the resulting lead actually ends up with no owner; an existing lead that already has an owner MUST keep it and MUST NOT be reported.

#### Scenario: Unmatched email with no name supplied is reported with its own reason

- GIVEN a row with `propietario_correo = "noexiste@example.com"` and `propietario_nombre` empty
- WHEN the file is imported
- THEN the row SHALL be processed successfully with no owner
- AND the summary SHALL list it as ownerless with a reason identifying the unmatched email and echoing `"noexiste@example.com"`

#### Scenario: Ambiguous name reason carries the candidate count

- GIVEN a `propietario_nombre` matching 3 active users
- WHEN the file is imported
- THEN the summary entry for that lead SHALL carry the ambiguous reason, the supplied name, and a candidate count of 3

#### Scenario: Both owner columns empty on a new lead is reported

- GIVEN a row for a `id_externo_crm` that does not yet exist, with `propietario_correo` and `propietario_nombre` both empty
- WHEN the file is imported
- THEN the lead SHALL be created without an owner
- AND the summary SHALL list it as ownerless with the "no owner supplied" reason

#### Scenario: Both owner columns empty preserves an existing owner silently

- GIVEN an existing lead that already has an owner
- WHEN a row for that same `id_externo_crm` leaves `propietario_correo` and `propietario_nombre` empty
- THEN the stored owner SHALL be preserved
- AND the lead SHALL NOT appear in the ownerless list

### Requirement: Authorization Restricted to ADMIN and ASISTENTE_GERENCIA_OPERATIVA

`POST /api/leads/csv-import` and `GET /api/leads/csv-template` MUST be accessible only to users whose role is `ADMIN` or `ASISTENTE_GERENCIA_OPERATIVA`. Any other authenticated role MUST receive HTTP 403.

#### Scenario: ADMIN can import

- GIVEN a user with role `ADMIN`
- WHEN they call `POST /api/leads/csv-import` with a valid file
- THEN the request SHALL be processed

#### Scenario: ASISTENTE_GERENCIA_OPERATIVA can import

- GIVEN a user with role `ASISTENTE_GERENCIA_OPERATIVA`
- WHEN they call `POST /api/leads/csv-import` with a valid file
- THEN the request SHALL be processed

#### Scenario: Other roles are rejected with 403

- GIVEN a user whose role is neither `ADMIN` nor `ASISTENTE_GERENCIA_OPERATIVA`
- WHEN they call `POST /api/leads/csv-import` or `GET /api/leads/csv-template`
- THEN the system SHALL return HTTP 403 and MUST NOT process the request

### Requirement: Audit Logging With Real Importing User

Every import run MUST record `AuditLog` entries via `logAuditEvent()` using the real importing user's email — never `crm-sync@system`. The system MUST record at least one entry when an import starts and one when it completes, and MUST record a row-rejection entry for each rejected row.

#### Scenario: Import audit entries use the real user's email

- GIVEN an admin with email `ana@financieramente.com` runs an import
- WHEN the import completes
- THEN the `AuditLog` entries for that import SHALL carry `email = "ana@financieramente.com"`
- AND MUST NOT carry `email = "crm-sync@system"`

### Requirement: No All-or-Nothing Transaction

The import MUST NOT wrap the entire file in a single all-or-nothing database transaction. Persisting each valid row MUST be independent of the outcome of any other row in the same file.

#### Scenario: A later row's rejection does not roll back earlier successful rows

- GIVEN row 2 of a file imports successfully
- WHEN row 5 of the same file is rejected for an unrecognized `estado`
- THEN the lead created or updated from row 2 SHALL remain persisted after the import completes
