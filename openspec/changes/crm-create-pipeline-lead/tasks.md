# Tasks: Create a pipeline lead

## 1. Foundation and contracts

- [x] 1.1 Add focused failing schema and authorization tests for valid contact data, empty/invalid input, self-assignment, authorized delegation and denied cross-branch/read-granted assignment.
- [x] 1.2 Define the minimal manual-create Zod schema and result shape, respecting existing database field limits and shared API conventions.

## 2. Implementation

- [x] 2.1 Add lead creation service using native `Lead` fields, active `NUEVO_LEAD`, active owner, duplicate-contact rejection and atomic `Propio` origin linkage; record the real creator.
- [x] 2.2 Add session-authenticated `POST /api/leads` with existing CRM management guard and server-enforced owner selection; update the API reference.
- [x] 2.3 Add **Nuevo lead** dialog and mutation hook using shared components and async state. Show advisor choice only for administrators/leaders, preserve input on failure, disable pending submissions, and refresh the board after success.

## 3. Verification

- [x] 3.1 Cover service failures: inactive/missing assignee, inactive origin, missing initial stage, duplicate contact and rollback without changes to existing leads.
- [x] 3.2 Cover route responses and UI behavior for success, denied assignment, read-only users, validation and request failures.
- [x] 3.3 Run focused tests, type checking, touched-file lint and architecture review; record verification results and any runtime limitations. See `verify-report.md`.
- [x] 3.4 Keep all commits on `feature/crm-create-pipeline-lead`; do not commit, merge or push to `develop`.
