# Proposal: business-comprobantes

## Intent

### Problem
Operations needs a way to attach payment/proof images (comprobantes) to each Negocio so settlement audits can verify that EMITIDO/FONDEADO businesses actually produced documentation. Today there is no storage layer, no per-negocio file linkage, and no UI affordance. Auditors are working from screenshots in chat — slow, lossy, and not auditable.

### Why now
The settlement workflow is moving toward auditability requirements (AuditLog already covers entity mutations). Without comprobantes attached to Business records, the platform cannot close the loop on EMITIDO → FONDEADO transitions with proof. Also, the Business action column has accumulated duplicate implementations (`ActionCell.tsx` and `BusinessTableSection.tsx`) — adding two more buttons inline would compound the drift. We fix both in one change.

### Success looks like
- Any user with access to the Business table can upload one or more comprobante images for a negocio that is in EMITIDO or FONDEADO and has a non-null contract.
- Any user can open a wide viewer to browse all comprobantes attached to a negocio.
- Uploads go directly from the browser to Digital Ocean Spaces via presigned PUT URLs — the Next.js server never proxies image bytes.
- All uploads and logical deletions are persisted in `BusinessSupport` and recorded in `AuditLog`.
- The Business row action column is consolidated into one implementation: two always-relevant icon buttons + a "⋮" dropdown for Editar / Ver detalle / Eliminar.

## Scope

### In scope
- New Prisma model `BusinessSupport` (soft-delete capable) with FKs to `Business` and `User`.
- New env vars and a feature-local S3 client wrapper for Digital Ocean Spaces (`DO_SPACES_*`).
- Three API routes under `src/app/api/negocios/[id]/comprobantes/`:
  - `POST presign/` — issue presigned PUT URL with env-prefixed key.
  - `POST /` — persist `BusinessSupport` record after client upload succeeds.
  - `GET /` — list active comprobantes for the negocio.
- Feature service in `src/features/business/services/` for all Prisma + Spaces calls (API routes delegate, no Prisma in handlers).
- AuditLog entries `COMPROBANTE_UPLOADED` and `COMPROBANTE_DEACTIVATED` added to `AuditAction` enum and `audit-logger.ts`.
- Refactor of Business row actions: collapse duplicate `ActionCell.tsx` and `BusinessTableSection.tsx` button strips into a single reusable component, with the three existing actions inside a "⋮" dropdown and two new icon buttons (Subir / Ver) inline with tooltips.
- Upload modal: single-file picker per upload action (one image at a time), but multiple uploads can be performed sequentially — each persists as an independent `BusinessSupport` row.
- View modal: wide layout (Sheet or custom Dialog wider than `xl`), thumbnail list on the left, large previewer on the right.
- Visibility rule for "Subir comprobante": only when `status ∈ {EMITIDO, FONDEADO}` AND `contract !== null`.
- Soft-delete on `BusinessSupport.status` (never `prisma.delete`).
- Update `prisma/ERD.md` with the new model and relationships.

### Out of scope
- Non-image uploads (PDF, etc.) — only image formats are supported.
- Server-side image processing, thumbnails, OCR, virus scanning.
- Role-based restrictions — explicitly all roles can upload and view.
- Bulk operations across multiple negocios.
- Replacing other S3/Spaces usages elsewhere in the app (none exist yet — this becomes the reference pattern).
- Migration of historical comprobantes from external sources.
- Sharing/public links — all access goes through the authenticated app.

## Approach

### High-level
Add a thin, feature-local storage layer for Digital Ocean Spaces, persist linkage in a dedicated `BusinessSupport` table, and unify the Business action column on the way through.

### Storage strategy — presigned PUT URLs
**Decision**: Browser uploads directly to DO Spaces via presigned PUT URLs.

**Rationale**:
- Keeps Next.js server lean — no multipart parsing, no streaming megabytes through the API layer.
- Matches the standard S3 pattern; `@aws-sdk/s3-request-presigner` is purpose-built for it.
- Naturally scales to multi-file uploads with per-file progress (each file is its own PUT).

**Tradeoff**: Two round-trips per file (presign → PUT → persist) instead of one. Acceptable — uploads are user-initiated and infrequent relative to read traffic. The persist call is what triggers the AuditLog entry, so the audit trail is authoritative even if a PUT succeeds without a follow-up persist (orphan in Spaces, no DB row — recoverable by lifecycle cleanup later if needed).

**Key format**: `{ENV_PREFIX}/negocios/{numeroContrato}/comprobantes/{numeroContrato}-{timestamp}-{uuid}.{ext}`

Supported formats: `image/jpeg`, `image/png`, `image/webp`, `image/gif`. The extension is derived from the file's MIME type — not from the original filename — to prevent spoofing.
- `ENV_PREFIX` from `DO_SPACES_PREFIX` (`qa` | `prod`) isolates environments inside a single bucket.
- `numeroContrato` in the path makes manual inspection in the Spaces console human-readable.
- `{timestamp}-{uuid}` guarantees uniqueness even for same-day re-uploads.

### Data model — new `BusinessSupport`
Separate model rather than a JSON column on `Business`:
- Each comprobante is an independent row → trivial soft delete per file.
- Native FK to `User` (uploadedBy) for audit attribution.
- Index on `idNegocio` keeps "list per negocio" cheap.

Fields: `id`, `idNegocio` (FK Business), `url`, `fileName`, `uploadedBy` (FK User), `createdAt`, `status` (Boolean, default `true` for soft delete).

### API surface
Three handlers under `src/app/api/negocios/[id]/comprobantes/`:
- `POST presign/` — validates session + that the negocio exists, returns `{ url, key }`.
- `POST /` — validates body (`{ url, fileName }`), creates `BusinessSupport`, logs `COMPROBANTE_UPLOADED`.
- `GET /` — returns list filtered by `status = true`, ordered by `createdAt desc`.

All handlers thin — they call into `business/services/comprobantes.service.ts` which holds Prisma + S3 client logic. This honors the project rule: no Prisma in API route handlers.

### UI consolidation — Business action column
**Decision**: Build one `BusinessRowActions` component used by both call sites; delete the duplicated logic in `ActionCell.tsx` and `BusinessTableSection.tsx`.

**Rationale**: We are already adding two buttons. Adding them twice would lock in the duplication permanently. One pass to unify now is cheaper than two passes later. The component composes a `⋮` dropdown (Editar, Ver detalle, Eliminar) and two inline icon buttons (Subir conditional, Ver always).

**Tradeoff**: The refactor expands the blast radius of this change beyond pure feature-add. Mitigated by keeping the new component API tight and covering both call sites with the same prop contract.

### Modals
- **Upload modal**: standard `Dialog`, single-file flow: pick one image → presign → PUT to Spaces → persist. The modal closes on success. The user opens it again to upload another comprobante — each upload is independent and accumulates as a new `BusinessSupport` row.
- **View modal**: requires width beyond Shadcn `xl`. Use a `Sheet` (right-side, `sm:max-w-[1100px]`) — fewer custom CSS overrides than forcing a wider `Dialog`. Layout is two-pane: list of thumbnails left, selected preview right.

### Audit + soft delete
- `logAuditEvent` calls inside the service after each mutating Prisma call. Never throws (project convention).
- Deactivation path (out of scope to expose in UI for v1, but the service supports it): `status = false` + `COMPROBANTE_DEACTIVATED` audit entry. We add the enum value now so future work doesn't need a schema change.

### Risks and mitigations
- **CORS on the Spaces bucket** — presigned PUT requires the bucket CORS policy to allow `PUT` from the app origin. Must be configured per environment before this ships.
- **Orphaned objects in Spaces** — a PUT that succeeds but never persists leaves a file with no DB row. Acceptable for v1; can be reconciled later via a lifecycle rule or sweeper.
- **Contract null guard** — must be enforced both in the UI (button hidden) and in the service (defensive — reject presign if `Business.contract` is null). Belt-and-suspenders.
- **Action column duplication** — risk that one of the two call sites uses props the other doesn't. Need to diff them carefully during spec phase to make sure the unified component covers both.
- **Modal width** — Sheet vs Dialog choice may bikeshed; pinning Sheet up front in the design phase.

## Next phases
- `sdd-spec` — capability spec for the comprobantes feature (API contracts, request/response shapes, validation rules, audit events).
- `sdd-design` — concrete component tree for the row actions refactor, modal structures, service module shape, and the Spaces client wrapper.
- Can run in parallel.
