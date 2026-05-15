# Tasks: Business Comprobantes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 800–1 100 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (foundation + backend) → PR 2 (UI) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Prisma model + service + API routes + audit | PR 1 | Base: develop; full backend with tests |
| 2 | Hooks + UI components + row-action consolidation | PR 2 | Base: PR 1 branch; all UI with tests |

---

## Phase 1: Infrastructure

- [ ] 1.1 Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` via `npm install`.
- [ ] 1.2 Add `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_ENDPOINT`, `DO_SPACES_BUCKET`, `DO_SPACES_PREFIX` to `.env.example` with placeholder values and a comment explaining each.
- [ ] 1.3 Add `BusinessSupport` model to `prisma/schema.prisma` (fields: `id cuid PK`, `businessId`, `objectKey @unique`, `mimeType`, `sizeBytes`, `uploadedBy`, `status true`, `createdAt`, `updatedAt`; relations to `Business` and `User`; indexes `[businessId, status]` and `[uploadedBy]`).
- [ ] 1.4 Add back-relations `supports BusinessSupport[]` to `Business` model and `businessSupports BusinessSupport[]` to `User` model in `prisma/schema.prisma`.
- [ ] 1.5 Run `npx prisma migrate dev --name add_business_support` and commit the generated migration file.
- [ ] 1.6 Run `npx prisma generate` and confirm TypeScript compilation passes (`npm run type-check`).
- [ ] 1.7 Update `prisma/ERD.md`: (a) add `BusinessSupport` to enums block (status boolean), (b) add relationship lines to erDiagram, (c) add entity field list, (d) add note under "Índices y convenciones" for composite index and unique objectKey.
- [ ] 1.8 Add `COMPROBANTE_UPLOADED` and `COMPROBANTE_DEACTIVATED` to the `AuditAction` enum in `src/features/auth/lib/audit-logger.ts`.

## Phase 2: Core Lib (TDD — RED first)

- [ ] 2.1 **RED** Write `src/features/business-supports/__tests__/mime-utils.test.ts`: tests for `isAllowedMime` (valid/invalid), `extensionFor` (all 4 types), `validateUpload` (size > 10 MB returns error, invalid mime returns error, valid returns ok).
- [ ] 2.2 **GREEN** Create `src/features/business-supports/lib/mime-utils.ts` with `ALLOWED_MIME_TYPES`, `MAX_BYTES`, `isAllowedMime`, `extensionFor`, `validateUpload`. Run `npm run test:unit -- mime-utils`.
- [ ] 2.3 **RED** Write `src/features/business-supports/__tests__/object-key.test.ts`: tests for `buildComprobanteKey` verifying format `{prefix}/negocios/{contract}/comprobantes/{contract}-{ts}-{uuid}.{ext}` using injectable `now` and `uuid`.
- [ ] 2.4 **GREEN** Create `src/features/business-supports/lib/object-key.ts` with `buildComprobanteKey`. Run `npm run test:unit -- object-key`.
- [ ] 2.5 **RED** Write `src/features/business-supports/__tests__/spaces-client.test.ts`: mock `S3Client`; test `getSpacesConfig` throws when env vars missing; test `presignPutUrl` and `presignGetUrl` call correct SDK commands.
- [ ] 2.6 **GREEN** Create `src/features/business-supports/lib/spaces-client.ts`: singleton `S3Client`, `getSpacesConfig` (validates env, throws clear error), `presignPutUrl`, `presignGetUrl`, `deleteObject` (stub). Hard-code region `'us-east-1'`. Run `npm run test:unit -- spaces-client`.
- [ ] 2.7 Create `src/features/business-supports/types/business-support.types.ts`: `BusinessSupportDTO`, `ComprobanteError` (with `code` union), `RequestContext` interface.
- [ ] 2.8 Create `src/features/business-supports/lib/business-supports-api.ts`: `businessSupportsApi` object with `list`, `presign`, `persist`, `remove` — thin `fetch` wrappers, no business logic.

## Phase 3: Service Layer (TDD — RED first)

- [ ] 3.1 **RED** Write `src/features/business-supports/__tests__/business-supports.service.test.ts`: mock Prisma and spaces-client; cover `listComprobantes` (returns DTOs with presigned URLs, empty case), `presignComprobanteUpload` (happy path, NOT_FOUND, INVALID_STATUS, NO_CONTRACT, INVALID_MIME), `persistComprobante` (happy path + audit called, INVALID_MIME), `deactivateComprobante` (sets status=false + audit called, NOT_FOUND).
- [ ] 3.2 **GREEN** Create `src/features/business-supports/services/business-supports.service.ts`: implement all four functions using Prisma + spaces-client + `logAuditEvent`. Accept `requestContext` param on mutating functions. Throw `ComprobanteError` for domain errors. Run `npm run test:unit -- business-supports.service`.

## Phase 4: API Routes (TDD — RED first)

- [ ] 4.1 Create directory `src/app/api/negocios/[id]/comprobantes/` if it does not exist.
- [ ] 4.2 **RED** Write tests for `route.ts` (GET + POST): mock service; test GET returns 200 list, POST returns 201 DTO, POST 422 on missing body fields.
- [ ] 4.3 **GREEN** Create `src/app/api/negocios/[id]/comprobantes/route.ts`: `GET` → `listComprobantes`; `POST` → Zod validate `{ key, mime, size }` → `persistComprobante`; map `ComprobanteError` codes to HTTP. Run route tests.
- [ ] 4.4 **RED** Write tests for `presign/route.ts`: happy path 200, 422 on bad mime, 409 on invalid status.
- [ ] 4.5 **GREEN** Create `src/app/api/negocios/[id]/comprobantes/presign/route.ts`: `POST` → Zod validate `{ mime, size }` → `presignComprobanteUpload`; map errors. Run presign tests.
- [ ] 4.6 **RED** Write tests for `[supportId]/route.ts`: DELETE returns 200, 404 on missing id.
- [ ] 4.7 **GREEN** Create `src/app/api/negocios/[id]/comprobantes/[supportId]/route.ts`: `DELETE` → `deactivateComprobante`; map errors. Run DELETE tests.

## Phase 5: Hooks (TDD — RED first)

- [ ] 5.1 **RED** Write `src/features/business-supports/__tests__/useBusinessSupports.test.ts`: mock `businessSupportsApi.list`; test idle→loading→success state, error state, `refetch` triggers reload.
- [ ] 5.2 **GREEN** Create `src/features/business-supports/hooks/useBusinessSupports.ts` using `AsyncState<BusinessSupportDTO[]>`. Run hook tests.
- [ ] 5.3 **RED** Write `src/features/business-supports/__tests__/useUploadComprobante.test.ts`: mock `validateUpload`, `api.presign`, global `fetch`, `api.persist`; test full success flow, presign error stays in error state, PUT failure stays in error state, `progress` updates.
- [ ] 5.4 **GREEN** Create `src/features/business-supports/hooks/useUploadComprobante.ts`: presign → XHR PUT (progress via `XMLHttpRequest`) → persist. Use `AsyncState<BusinessSupportDTO>`. Run hook tests.
- [ ] 5.5 Create `src/features/business-supports/hooks/useDeleteComprobante.ts` using `AsyncState<void>`; call `api.remove`. (Covered by service + API tests; add brief hook-level test.)

## Phase 6: UI — BusinessRowActions (TDD)

- [ ] 6.1 **RED** Write `src/features/business/components/__tests__/BusinessRowActions.test.tsx`: assert Upload button renders when `status=EMITIDO` + contract present; hidden when `status=PENDIENTE`; hidden when contract null; Eye button always renders; dropdown items Editar/Ver detalle/Eliminar present.
- [ ] 6.2 **GREEN** Create `src/features/business/components/BusinessRowActions.tsx`: render Eye icon (always), Upload icon (conditional), `DropdownMenu` with three items. Wire `useState` for `uploadOpen` and `viewOpen`. Use shared `Tooltip`. Run component tests.
- [ ] 6.3 Remove `ActionCell.tsx` and the button-strip code from `BusinessTableSection.tsx`; replace usages with `<BusinessRowActions />`. Confirm no TypeScript errors.

## Phase 7: UI — Upload Modal

- [ ] 7.1 Create `src/features/business-supports/components/UploadComprobanteModal.tsx`: `Dialog`-based, single file input with drag-drop area, client-side preview, progress bar, error/success states from `useUploadComprobante`. Disable submit until file is valid. Auto-close on success; show error and stay open on failure.
- [ ] 7.2 Add component-level render tests (happy path closes, error path stays open, submit disabled with no file).

## Phase 8: UI — View Sheet

- [ ] 8.1 Create `src/features/business-supports/components/ComprobanteThumbnail.tsx`: card with `<img>` thumbnail, date, uploader name, delete button (AlertDialog confirm).
- [ ] 8.2 Create `src/features/business-supports/components/ComprobantePreviewer.tsx`: `<img>` large preview + fallback empty state.
- [ ] 8.3 Create `src/features/business-supports/components/ViewComprobantesSheet.tsx`: `Sheet side="right" sm:max-w-3xl`; two-pane layout; left = `ComprobanteThumbnail` list from `useBusinessSupports`; right = `ComprobantePreviewer` for selected item. Empty state when list empty.
- [ ] 8.4 Add render tests: sheet shows thumbnails when data loaded; clicking thumbnail updates previewer; empty state renders when list is empty.

## Phase 9: Integration Wiring

- [ ] 9.1 Import and compose `UploadComprobanteModal` and `ViewComprobantesSheet` inside `BusinessRowActions`; pass correct `businessId` and `contractNumber` props.
- [ ] 9.2 Wire `onUploaded` callback in `UploadComprobanteModal` to trigger a toast and close; optionally call `useBusinessSupports.refetch` from the sheet on next open.
- [ ] 9.3 Verify existing Editar / Ver detalle / Eliminar handlers from deleted `ActionCell.tsx` are preserved in the new dropdown (no regression).
- [ ] 9.4 Run `npm run test:unit` — all tests pass. Run `npm run type-check` — zero errors. Run `npm run lint` — zero warnings.

## Phase 10: Cleanup & Documentation

- [ ] 10.1 Confirm `.env.example` documents all 5 `DO_SPACES_*` vars with descriptions and no real values.
- [ ] 10.2 Add a comment block in `spaces-client.ts` noting the DO region quirk (`'us-east-1'` required by SDK, ignored by DO).
- [ ] 10.3 Add a CORS note in `openspec/changes/business-comprobantes/deploy-checklist.md` listing required bucket CORS rules (`PUT` + `GET` from app origins per env) — operational step, not code.
- [ ] 10.4 Confirm `prisma/ERD.md` is accurate and committed.
- [ ] 10.5 Confirm `audit-logger.ts` enum additions are committed and compiled.
