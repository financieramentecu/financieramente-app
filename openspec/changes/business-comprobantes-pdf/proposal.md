# Proposal: Allow PDF Comprobantes (Business Supports)

## Intent

Users need to upload payment proofs (`comprobantes`) that arrive as PDFs (bank statements, transfer receipts, official documents) — not only as images. Today the `business-supports` feature rejects `application/pdf` at the presign step, forcing users to convert/screenshot PDFs before upload. This breaks the workflow for the most common type of bank-issued comprobante and produces lower-fidelity evidence on the audit trail.

## Scope

### In Scope
- Add `application/pdf` to the central MIME allow-list in `business-supports/lib/mime-utils.ts`.
- Update `UploadComprobanteModal` UX: extend `ACCEPT`, update description copy, keep the existing entry point intact.
- Extend `BusinessSupportsSheet` viewer:
  - Sidebar thumbnail: render a `<FileText>` icon when `mimeType === 'application/pdf'`, keep `<img>` for images.
  - Main preview: render `<iframe>` for PDFs, keep `<img>` for images.
  - Preserve the existing "Ver original" anchor (presigned URL in new tab) for both.
- Extend colocated tests for `mime-utils` and `BusinessSupportsSheet` to cover the PDF path.

### Out of Scope
- PDF generation, OCR, or content extraction.
- Schema changes to `BusinessSupport` (already stores `mimeType: String`).
- Other file types (`.docx`, `.xlsx`, `.heic`, etc.) — handle in a separate change if requested.
- New feature folder or service layer — additive changes only.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `business-supports`: comprobante upload + viewer now accept `application/pdf` in addition to the existing image MIME types, and the inline viewer renders PDFs natively.

## Approach

Pure additive change within the existing `business-supports` feature. Central allow-list (`ALLOWED_MIME_TYPES`) gains `application/pdf` plus its `.pdf` extension mapping — the presign API route already delegates validation to `isAllowedMime()`, so the server side flips on with a single edit. The viewer adds a `mimeType`-based branch: `<iframe>` for PDFs (Digital Ocean Spaces presigned URLs render natively in browsers, no extra library), `<img>` otherwise. The sidebar thumbnail follows the same branch with a `lucide` `<FileText>` icon. No new dependencies, no schema migration, no new feature folder — Feature-Based Architecture preserved.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/business-supports/lib/mime-utils.ts` | Modified | Add `application/pdf` to `ALLOWED_MIME_TYPES` and `.pdf` to extension map |
| `src/features/business-supports/components/UploadComprobanteModal.tsx` | Modified | Extend `ACCEPT`, update copy/icon |
| `src/features/business-supports/components/BusinessSupportsSheet.tsx` | Modified | Conditional thumbnail + preview rendering by MIME type |
| `src/features/business-supports/__tests__/mime-utils.test.ts` | Modified | Add PDF cases |
| `src/features/business-supports/__tests__/BusinessSupportsSheet.test.tsx` | Modified | Add PDF rendering assertions |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Browser blocks iframe rendering of presigned URL (CORS / `X-Frame-Options`) | Low | DO Spaces presigned URLs do not set `X-Frame-Options`; fallback "Ver original" link remains functional. Verify in staging. |
| Larger PDF files inflate Spaces costs / slow uploads | Low | Existing upload size limit in `validateUpload()` already enforces a cap; no change to that contract. |
| Mobile browsers render PDFs inconsistently in `<iframe>` | Medium | "Ver original" anchor (target=_blank) provides reliable fallback; document the behavior in the modal copy if needed. |
| Existing E2E/screenshot tests assume images only | Low | Add explicit PDF test cases; review test snapshots before merge. |

## Rollback Plan

Single-PR revert. The change is purely additive to a const array and a few render branches:
1. `git revert <merge-commit>` removes `application/pdf` from `ALLOWED_MIME_TYPES`; future uploads of PDFs are rejected at presign again.
2. Existing PDF rows already persisted in `BusinessSupport` remain in DB but become unviewable inline — they still expose the "Ver original" link, which keeps working (presigned URL is signed by Spaces, independent of MIME validation).
3. No DB migration to undo. No third-party config to roll back.

## Dependencies

- None. Uses native browser PDF rendering and existing DO Spaces presigned URLs.

## Success Criteria

- [ ] Upload of a `.pdf` file via `UploadComprobanteModal` succeeds end-to-end (presign + PUT to Spaces + DB row).
- [ ] `BusinessSupportsSheet` sidebar shows a document icon for PDF comprobantes and an image thumbnail for images.
- [ ] Selecting a PDF comprobante renders it inline via `<iframe>`; "Ver original" still opens it in a new tab.
- [ ] Image comprobantes continue to render exactly as before (no visual regression).
- [ ] `mime-utils` and `BusinessSupportsSheet` tests cover the PDF path and pass.
- [ ] `npm run lint` and `npm run test:unit` pass on the change branch.
