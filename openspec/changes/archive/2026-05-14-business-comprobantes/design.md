# Design — business-comprobantes

## 1. Architecture Overview

New **`business-supports`** feature module owns all comprobante logic (storage client, services, hooks, UI). Business feature consumes it only via UI composition (BusinessRowActions wires the modal + sheet). API routes under `src/app/api/negocios/[id]/comprobantes/` are thin HTTP shells delegating to `business-supports.service`.

Flow (upload):
```
Client → POST /api/negocios/[id]/comprobantes/presign  → { url, key, expiresAt }
Client → PUT {url} (binary, Content-Type: image/*)     → Spaces (DO)
Client → POST /api/negocios/[id]/comprobantes { key, mime, size }
         → service persists BusinessSupport + logAuditEvent
```

Flow (view): `GET /api/negocios/[id]/comprobantes` → service lists `status=true` + generates presigned GET URLs per item.

## 2. File Tree

```
src/features/business-supports/
├── components/
│   ├── UploadComprobanteModal.tsx
│   ├── ViewComprobantesSheet.tsx
│   ├── ComprobanteThumbnail.tsx
│   └── ComprobantePreviewer.tsx
├── hooks/
│   ├── useBusinessSupports.ts
│   ├── useUploadComprobante.ts
│   └── useDeleteComprobante.ts
├── lib/
│   ├── spaces-client.ts
│   ├── mime-utils.ts
│   ├── object-key.ts
│   └── business-supports-api.ts
├── services/
│   └── business-supports.service.ts
├── types/
│   └── business-support.types.ts
└── __tests__/
    ├── spaces-client.test.ts
    ├── mime-utils.test.ts
    ├── object-key.test.ts
    ├── business-supports.service.test.ts
    ├── useBusinessSupports.test.ts
    └── useUploadComprobante.test.ts
```

The consolidated row-actions component lives under business (it depends on Business row data + composes business-supports UI):
```
src/features/business/components/BusinessRowActions.tsx
src/features/business/components/__tests__/BusinessRowActions.test.tsx
```

## 3. Prisma Model

```prisma
model BusinessSupport {
  id          String   @id @default(cuid())
  businessId  String
  objectKey   String   @unique           // full Spaces key
  mimeType    String                     // image/jpeg | image/png | image/webp | image/gif
  sizeBytes   Int
  uploadedBy  String                     // userId
  status      Boolean  @default(true)    // soft delete
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  business    Business @relation(fields: [businessId], references: [id], onDelete: Restrict)
  uploader    User     @relation(fields: [uploadedBy], references: [id], onDelete: Restrict)

  @@index([businessId, status])
  @@index([uploadedBy])
}
```

`Business` gets `supports BusinessSupport[]`. `User` gets `businessSupports BusinessSupport[]`. `AuditAction` enum gains `COMPROBANTE_UPLOADED`, `COMPROBANTE_DEACTIVATED`. `prisma/ERD.md` updated in all three sections (enums, erDiagram relationships, entity field list) + note under "Índices y convenciones".

## 4. Spaces Client (`lib/spaces-client.ts`)

Singleton wrapper around `S3Client`. Lazy init guards missing env at runtime (throws clear error).

```ts
export interface SpacesConfig {
  readonly endpoint: string
  readonly region: string         // 'us-east-1' placeholder (DO ignores)
  readonly bucket: string
  readonly prefix: string
  readonly accessKeyId: string
  readonly secretAccessKey: string
}

export function getSpacesClient(): S3Client            // memoized
export function getSpacesConfig(): SpacesConfig        // reads env, validates once

export async function presignPutUrl(params: {
  readonly key: string
  readonly contentType: string
  readonly expiresInSeconds?: number   // default 300
}): Promise<{ url: string; expiresAt: Date }>

export async function presignGetUrl(params: {
  readonly key: string
  readonly expiresInSeconds?: number   // default 600
}): Promise<{ url: string; expiresAt: Date }>

export async function deleteObject(key: string): Promise<void>   // reserved, not used in v1
```

`forcePathStyle: false`, `endpoint: DO_SPACES_ENDPOINT`. Never expose this module outside services/api — UI talks HTTPS only.

## 5. MIME Utilities (`lib/mime-utils.ts`)

```ts
export const ALLOWED_MIME_TYPES = ['image/jpeg','image/png','image/webp','image/gif'] as const
export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number]

export const MAX_BYTES = 10 * 1024 * 1024 // 10MB

export function isAllowedMime(mime: string): mime is AllowedMimeType
export function extensionFor(mime: AllowedMimeType): 'jpg'|'png'|'webp'|'gif'
export function validateUpload(input: { mime: string; size: number }):
  { ok: true; mime: AllowedMimeType } | { ok: false; error: string }
```

## 6. Object Key (`lib/object-key.ts`)

```ts
export function buildComprobanteKey(params: {
  readonly prefix: string
  readonly contract: string       // numeroContrato, validated non-null by caller
  readonly mime: AllowedMimeType
  readonly now?: Date             // injectable for tests
  readonly uuid?: string          // injectable for tests
}): string
// → `{prefix}/negocios/{contract}/comprobantes/{contract}-{timestamp}-{uuid}.{ext}`
```

`timestamp` = `Date.now()` (ms epoch). `uuid` from `crypto.randomUUID()`.

## 7. Service (`services/business-supports.service.ts`)

Sole Prisma caller. Returns domain types, never `ApiResponse`.

```ts
export interface BusinessSupportDTO {
  readonly id: string
  readonly businessId: string
  readonly objectKey: string
  readonly mimeType: string
  readonly sizeBytes: number
  readonly uploadedBy: string
  readonly createdAt: Date
  readonly previewUrl: string         // presigned GET, short-lived
  readonly previewExpiresAt: Date
}

export async function listComprobantes(businessId: string): Promise<BusinessSupportDTO[]>

export async function presignComprobanteUpload(input: {
  readonly businessId: string
  readonly mime: string
  readonly size: number
}): Promise<{ url: string; key: string; expiresAt: Date }>
// guards: business exists, contract !== null, status ∈ {EMITIDO, FONDEADO}, mime+size valid

export async function persistComprobante(input: {
  readonly businessId: string
  readonly objectKey: string
  readonly mime: AllowedMimeType
  readonly size: number
  readonly uploadedBy: string
}): Promise<BusinessSupportDTO>
// validates key prefix matches business contract, creates row, logs audit

export async function deactivateComprobante(input: {
  readonly id: string
  readonly userId: string
}): Promise<void>
// status=false, audit log; never deletes from Spaces in v1
```

Errors are typed (`ComprobanteError extends Error` with `code: 'NOT_FOUND'|'INVALID_MIME'|'INVALID_SIZE'|'INVALID_STATUS'|'NO_CONTRACT'`). API layer maps codes to HTTP status.

## 8. Hooks

All async hooks use `AsyncState<T>` from `src/features/shared/types/async-state.types.ts`.

### `useBusinessSupports(businessId)`
```ts
interface UseBusinessSupportsReturn {
  readonly state: AsyncState<BusinessSupportDTO[]>
  readonly refetch: () => Promise<void>
}
```

### `useUploadComprobante(businessId)`
Encapsulates presign → PUT → persist as a single user-facing action.

```ts
interface UseUploadComprobanteReturn {
  readonly state: AsyncState<BusinessSupportDTO>   // success = persisted row
  readonly progress: number                        // 0..1, from XHR upload
  readonly upload: (file: File) => Promise<void>
  readonly reset: () => void
}
```

Internally validates with `validateUpload`, then `api.presign`, then `fetch(url, { method:'PUT', body:file, headers:{'Content-Type':mime} })`, then `api.persist`. Errors collapse into `AsyncState.error`.

### `useDeleteComprobante()`
```ts
interface UseDeleteComprobanteReturn {
  readonly state: AsyncState<void>
  readonly remove: (id: string) => Promise<void>
}
```

## 9. Client API (`lib/business-supports-api.ts`)

Thin fetch wrapper used by hooks (no business logic):
```ts
export const businessSupportsApi = {
  list: (businessId: string) => Promise<BusinessSupportDTO[]>
  presign: (businessId: string, input: { mime: string; size: number }) =>
           Promise<{ url: string; key: string; expiresAt: string }>
  persist: (businessId: string, input: { key: string; mime: string; size: number }) =>
           Promise<BusinessSupportDTO>
  remove:  (businessId: string, id: string) => Promise<void>
}
```

## 10. API Route Handlers

All handlers: parse params → call session helper → call service → map errors → return JSON. No Prisma. No business logic.

### `src/app/api/negocios/[id]/comprobantes/route.ts`
```ts
export async function GET(req, { params }) {
  const session = await requireSession()
  const list = await listComprobantes(params.id)
  return NextResponse.json({ success: true, data: list })
}

export async function POST(req, { params }) {
  const session = await requireSession()
  const body = await req.json()  // { key, mime, size }
  // zod schema validates
  const dto = await persistComprobante({ businessId: params.id, ...body, uploadedBy: session.userId })
  return NextResponse.json({ success: true, data: dto }, { status: 201 })
}
```

### `src/app/api/negocios/[id]/comprobantes/presign/route.ts`
```ts
export async function POST(req, { params }) {
  const session = await requireSession()
  const body = await req.json()   // { mime, size }
  const result = await presignComprobanteUpload({ businessId: params.id, ...body })
  return NextResponse.json({ success: true, data: result })
}
```

### `src/app/api/negocios/[id]/comprobantes/[supportId]/route.ts` (DELETE)
```ts
export async function DELETE(req, { params }) {
  const session = await requireSession()
  await deactivateComprobante({ id: params.supportId, userId: session.userId })
  return NextResponse.json({ success: true })
}
```

Error mapping: `NOT_FOUND→404`, `INVALID_MIME|INVALID_SIZE→415|413`, `INVALID_STATUS|NO_CONTRACT→409`, else `500`.

## 11. Component Contracts

### `UploadComprobanteModal`
```ts
interface UploadComprobanteModalProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly businessId: string
  readonly contractNumber: string          // for display
  readonly onUploaded?: (dto: BusinessSupportDTO) => void
}
```
Layout: `Dialog` from shared/ui. Single file input (drag+drop area), client-side preview, progress bar, error/success states from `useUploadComprobante.state`. Submit disabled until file valid.

### `ViewComprobantesSheet`
```ts
interface ViewComprobantesSheetProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly businessId: string
  readonly canDelete?: boolean             // future; default false in v1 (all roles can delete per proposal — wire true)
}
```
Layout: `Sheet` side="right" with `sm:max-w-3xl` (wider than xl Dialog). Two-pane: left = scrollable thumbnail list (`ComprobanteThumbnail` cards with date + uploader); right = large `ComprobantePreviewer` showing currently selected `previewUrl`. Empty state when list is empty. Delete button per thumbnail (confirm via existing AlertDialog pattern).

### `BusinessRowActions`
Consolidates `ActionCell.tsx` and `BusinessTableSection.tsx` button strips.

```ts
interface BusinessRowActionsProps {
  readonly business: BusinessRow            // existing row type from business feature
  readonly onEdit: (b: BusinessRow) => void
  readonly onViewDetail: (b: BusinessRow) => void
  readonly onDelete: (b: BusinessRow) => void
}
```
Render:
1. Inline icon `Eye` (always) — opens `ViewComprobantesSheet`
2. Inline icon `Upload` — rendered only when `business.numeroContrato !== null && (business.status === 'EMITIDO' || business.status === 'FONDEADO')` — opens `UploadComprobanteModal`. Disabled-with-tooltip variant when gating fails could be considered, but proposal says conditional render.
3. `DropdownMenu` triggered by `MoreVertical` icon with items: Editar, Ver detalle, Eliminar (destructive variant)

State internal: `const [uploadOpen, setUploadOpen] = useState(false)`, `const [viewOpen, setViewOpen] = useState(false)`. After successful upload, optionally auto-open the Sheet — v1: just close modal and toast.

Tooltips on each icon button via shared `Tooltip`.

## 12. Audit Events

`audit-logger.ts` extends `AuditAction`:
- `COMPROBANTE_UPLOADED` — emitted in `persistComprobante` after row create. Details: `Comprobante {objectKey} cargado para negocio {contract}`.
- `COMPROBANTE_DEACTIVATED` — emitted in `deactivateComprobante`. Details: `Comprobante {id} desactivado`.

Always pass `userId`, `email`, `ipAddress` (`getClientIp(headers)`), `userAgent` (`getUserAgent(headers)`). Headers obtained in API layer and forwarded to service as a context object, OR service receives a `requestContext` parameter — chosen approach: **pass `requestContext` into service** from route handler to keep service testable.

```ts
interface RequestContext { readonly userId: string; readonly email: string; readonly ipAddress: string; readonly userAgent: string }
```

Service signatures revised: `persistComprobante(input, ctx)` and `deactivateComprobante(input, ctx)`. `listComprobantes` and `presignComprobanteUpload` don't need ctx (no mutation).

## 13. ENV & Dependencies

**New deps** (package.json):
- `@aws-sdk/client-s3` (^3.x)
- `@aws-sdk/s3-request-presigner` (^3.x)

No new dev deps (uuid via `crypto.randomUUID` built-in).

**ENV vars** (`.env.example` + Doppler/Terraform vars):
- `DO_SPACES_KEY`
- `DO_SPACES_SECRET`
- `DO_SPACES_ENDPOINT` (e.g. `https://nyc3.digitaloceanspaces.com`)
- `DO_SPACES_BUCKET`
- `DO_SPACES_PREFIX` (e.g. `dev` | `staging` | `prod`)

Bucket CORS (operational, not code) must allow `PUT` + `GET` from app origins per env. Documented in apply phase.

## 14. ADR-style Decisions

### D1: Standalone `business-supports` feature vs nesting under `business`
**Chosen**: standalone module. **Why**: storage concern is reusable (other entities may attach files later); avoids bloating business feature; clean test boundaries. **Rejected**: nesting under business (couples storage lifecycle to business module, harder to extract later). Trade-off: one extra module import surface.

### D2: Presigned PUT vs server-proxied upload
**Chosen**: presigned PUT direct to Spaces. **Why**: avoids streaming large bodies through Next.js runtime, lower memory/CPU, simpler API. **Rejected**: server proxy (forces Vercel/Next runtime to buffer ~10MB per upload, no real benefit since we still validate on persist). Trade-off: PUT-without-persist orphans (accepted; lifecycle policy deferred).

### D3: Sheet vs custom-width Dialog for viewer
**Chosen**: `Sheet` side="right" `sm:max-w-3xl`. **Why**: built-in wide layout, no CSS overrides, better for two-pane (list + preview). **Rejected**: Dialog with custom max-width (fragile CSS, breaks shared component contract).

### D4: `BusinessSupport` model name
**Chosen**: `BusinessSupport` (generic "support material"). **Why**: future-proofs for non-comprobante attachments (contracts, IDs) without rename migration. **Rejected**: `Comprobante` model (too narrow). API path keeps `/comprobantes` because v1 UX is comprobante-only.

### D5: Validate status+contract in service, not just UI
**Chosen**: defensive validation in service (server is source of truth). **Why**: UI gate can be bypassed by direct API call; audit integrity demands server enforcement. Cost: minor duplication of business-state knowledge.

### D6: Soft delete only; Spaces objects retained
**Chosen**: `status=false`, no Spaces deletion. **Why**: align with project-wide soft-delete rule + simpler v1 + audit recoverability. **Trade-off**: storage cost accrues; lifecycle policy deferred to ops.

### D7: `AsyncState<T>` discriminated union for all hooks
**Chosen**: project convention. **Why**: matches existing hooks, single state machine, type-narrowing in components.

### D8: `requestContext` passed into service vs reading headers in service
**Chosen**: pass context from route. **Why**: service stays runtime-agnostic, easier to unit test, mirrors existing audit patterns elsewhere. **Rejected**: service reads `headers()` directly (couples to Next runtime).

## 15. Integration Points

- **business feature**: imports `UploadComprobanteModal` + `ViewComprobantesSheet` inside `BusinessRowActions`; replaces both `ActionCell.tsx` and `BusinessTableSection.tsx` button strips with the new component. Both old files removed.
- **auth feature**: `audit-logger.ts` gets two new enum values; `logAuditEvent` call sites added in service.
- **shared/ui**: reuses existing `Sheet`, `Dialog`, `DropdownMenu`, `Tooltip`, `AlertDialog`. No new shared primitives.
- **prisma**: schema + ERD + migration `add_business_support`.

## 16. Data Flow Summary

```
UI (BusinessRowActions)
  ├─ Eye   → ViewComprobantesSheet → useBusinessSupports → api.list → GET /comprobantes → service.list → Prisma + presignGet
  ├─ Up    → UploadComprobanteModal → useUploadComprobante
  │           ├─ api.presign → POST /presign → service.presignUpload → buildKey + presignPut
  │           ├─ fetch PUT {presignedUrl} → DO Spaces
  │           └─ api.persist → POST /comprobantes → service.persist → Prisma + audit
  └─ ⋮     → DropdownMenu (Editar/Ver detalle/Eliminar — existing handlers)
```

## 17. Risks / Open Items

- CORS configuration is operational; must be set before merge — surface in apply checklist.
- Orphan objects from abandoned uploads — accepted, log volume should be monitored.
- DO Spaces region quirk: SDK requires a region string even though DO ignores; hard-code `'us-east-1'`.
- Prisma client cache may need TS server reload after migration.
- Audit logger swallows errors — fine, but verify in tests that mutation still succeeds when audit fails.
