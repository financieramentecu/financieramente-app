# Design: Allow PDF Comprobantes (Business Supports)

## Technical Approach

Purely additive change inside the existing `business-supports` feature. The central allow-list `ALLOWED_MIME_TYPES` in `lib/mime-utils.ts` gains `application/pdf` — the presign API route, `validateUpload()`, and the upload modal all consume that constant, so propagation is automatic. The viewer (`BusinessSupportsSheet`) branches on `mimeType` to choose between `<img>` (images) and `<iframe>` (PDFs). DO Spaces presigned URLs are served without `X-Frame-Options`, so native browser PDF rendering works without extra dependencies (no `pdf.js`, no `react-pdf`). No schema change, no new files.

## Architecture Decisions

| Decision | Choice | Alternatives Rejected | Rationale |
|----------|--------|-----------------------|-----------|
| PDF rendering engine | Native browser via `<iframe src={presignedUrl}>` | `react-pdf` / `pdf.js`; new `PdfPreview` component | Zero new deps, DO Spaces serves PDFs inline, "Ver original" already covers the unsupported-browser fallback. Stays SRP — viewer renders, not parses. |
| Thumbnail for PDFs | `<FileText>` lucide icon in a 40x40 centered container | Generated PDF page raster; generic doc emoji | No server work, consistent with `lucide` usage elsewhere, instantly distinguishable from image thumbs. |
| Where to branch on MIME | Inside `SupportGallery` (existing component) | New `<SupportThumbnail>` / `<SupportPreview>` atoms | Branch is two tiny `mimeType === 'application/pdf'` checks. Extracting now would be premature abstraction (YAGNI); revisit when a 3rd type lands. |
| Allow-list location | Keep single source in `lib/mime-utils.ts` | Duplicate `ACCEPT` string in the modal | DRY + Open/Closed: derive `ACCEPT` from `ALLOWED_MIME_TYPES.join(',')` so future MIME additions need one edit. |
| Schema impact | None — reuse `BusinessSupport.mimeType: String` | Add enum / discriminator column | Field already stores any MIME; Prisma migration would be churn with zero gain. |

## Data Flow

```
Upload:
  UploadComprobanteModal ──(file, mime)──→ validateUpload() ──→ presign API
        │                                        │                    │
        └─ ACCEPT derived from ALLOWED_MIME_TYPES ┘                    │
                                                                       ▼
                                                          DO Spaces (PUT)
                                                                       │
                                                                       ▼
                                                          BusinessSupport row
                                                          (mimeType persisted)

View:
  BusinessSupportsSheet → SupportGallery
        │                       │
        │                       ├─ thumbnail: mimeType === 'application/pdf'
        │                       │     ? <FileText/>  : <img src=viewUrl/>
        │                       │
        │                       └─ preview:   mimeType === 'application/pdf'
        │                             ? <iframe src=viewUrl/> : <img src=viewUrl/>
        │
        └─ "Ver original": <a href=viewUrl target=_blank>  (unchanged, both types)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/business-supports/lib/mime-utils.ts` | Modify | Add `'application/pdf'` to `ALLOWED_MIME_TYPES`; add `'application/pdf': 'pdf'` to `MIME_TO_EXT`. |
| `src/features/business-supports/components/UploadComprobanteModal.tsx` | Modify | Derive `ACCEPT` from `ALLOWED_MIME_TYPES`; update description copy ("imagen o PDF"); swap/augment icon (keep `<ImageUp>` or use `<Upload>`); update button label to "Seleccionar archivo". |
| `src/features/business-supports/components/BusinessSupportsSheet.tsx` | Modify | In `SupportGallery`: branch thumbnail (`<FileText>` vs `<img>`) and preview (`<iframe>` vs `<img>`) on `mimeType`. Ensure preview container is `flex-1 flex flex-col`; iframe uses `h-full w-full border-0`. |
| `src/features/business-supports/__tests__/mime-utils.test.ts` | Modify | Add cases: `isAllowedMime('application/pdf')`, `extensionFor('application/pdf') === 'pdf'`, `validateUpload('application/pdf', 1MB) ok`, `validateUpload('application/pdf', 11MB) FILE_TOO_LARGE`. |
| `src/features/business-supports/__tests__/BusinessSupportsSheet.test.tsx` | Modify | Render `SupportGallery` with a PDF item → assert thumbnail has no `<img>` and renders an SVG icon; preview renders `<iframe title="PDF">` with the expected `src`. Keep existing image-path assertions. |
| `src/features/business-supports/__tests__/UploadComprobanteModal.test.tsx` | Modify | Assert input `accept` attribute contains `application/pdf`. |

## Interfaces / Contracts

```ts
// lib/mime-utils.ts
export const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
] as const
// AllowedMimeType auto-narrows; MIME_TO_EXT gains 'application/pdf': 'pdf'.
// All downstream consumers (presign route, validateUpload, ACCEPT) update transitively.
```

No new public exports. No type changes outside the literal-union widening of `AllowedMimeType`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | `mime-utils` PDF allow + extension + size validation | Vitest, colocated `__tests__/mime-utils.test.ts` — pure functions, no mocks. |
| Unit | `UploadComprobanteModal` accepts PDF | Testing Library, assert `<input>` `accept` includes `application/pdf`. |
| Unit | `SupportGallery` PDF branch | Testing Library, render with `mimeType: 'application/pdf'`; assert icon-only thumbnail and `<iframe>` preview by role/title. |
| Integration | Presign API still 200s for PDF | Existing presign tests — add PDF MIME case (delegates to `isAllowedMime`). |
| Manual / E2E | Upload `.pdf`, verify sidebar icon, inline iframe, "Ver original" tab | Smoke check pre-merge (no Playwright spec required for this slice). |

Strict TDD: write/extend each test BEFORE the corresponding implementation edit (red → green → refactor).

## Migration / Rollout

No migration required. `BusinessSupport.mimeType` already stores any string and historical rows are untouched. Rollout is a single PR; revert is `git revert <merge-commit>` — previously uploaded PDFs remain accessible via "Ver original" (presigned URL is independent of MIME validation).

## Open Questions

- None blocking. Mobile PDF rendering in `<iframe>` is the only known soft spot; "Ver original" already mitigates it and is identical for both types.
