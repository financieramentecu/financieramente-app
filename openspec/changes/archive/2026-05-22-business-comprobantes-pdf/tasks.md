# Tasks: Allow PDF Comprobantes (business-supports)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 80–120 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception (not needed — under budget) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All changes — mime-utils + modal + sheet + tests | PR 1 | Single PR from `feat/aportes-fondeo-modal`; all changes isolated within `src/features/business-supports/` |

---

## Phase 1: Foundation — `mime-utils.ts`

TDD: red tests first, then implementation.

- [x] 1.1 **RED** — In `src/features/business-supports/__tests__/mime-utils.test.ts`: update `ALLOWED_MIME_TYPES` length assertion from `toHaveLength(3)` to `toHaveLength(4)` and add `expect(ALLOWED_MIME_TYPES).toContain('application/pdf')`.
- [x] 1.2 **RED** — In `mime-utils.test.ts` `isAllowedMime` block: change existing `returns false for application/pdf` test to assert `true`; add `isImageMime` test asserting `true` for `image/jpeg` and `false` for `application/pdf`.
- [x] 1.3 **RED** — In `mime-utils.test.ts` `extensionFor` block: change existing `returns null for application/pdf` test to assert `'pdf'`.
- [x] 1.4 **RED** — In `mime-utils.test.ts` `validateUpload` block: change existing `returns error for invalid mime type` (pdf) test to assert `ok: true`; add case asserting `ok: true` for pdf at 1 MB; add case asserting `FILE_TOO_LARGE` for pdf at `MAX_BYTES + 1`.
- [x] 1.5 **GREEN** — In `src/features/business-supports/lib/mime-utils.ts`: add `'application/pdf'` to `ALLOWED_MIME_TYPES`; add `'application/pdf': 'pdf'` to `MIME_TO_EXT`; export `isImageMime(mime: string): boolean` helper that checks `mime.startsWith('image/')` (keep it alongside the existing helpers).
- [x] 1.6 **REFACTOR** — Run `npm run test:unit -- mime-utils` and confirm all tests pass; no structural changes needed.

## Phase 2: Core Implementation — `UploadComprobanteModal.tsx`

- [x] 2.1 **RED** — In `src/features/business-supports/__tests__/UploadComprobanteModal.test.tsx`: add test asserting `screen.getByTestId('file-input')` has `accept` attribute containing `application/pdf`.
- [x] 2.2 **GREEN** — In `src/features/business-supports/components/UploadComprobanteModal.tsx`: replace any hardcoded `accept` string on the `<input>` with `ALLOWED_MIME_TYPES.join(',')` (import from `mime-utils`); update description copy to "Seleccioná una imagen o PDF" (max 10 MB); update button label to "Seleccionar archivo" if not already generic.
- [x] 2.3 **REFACTOR** — Run `npm run test:unit -- UploadComprobanteModal` and confirm all tests pass.

## Phase 3: Core Implementation — `BusinessSupportsSheet.tsx`

- [x] 3.1 **RED** — In `src/features/business-supports/__tests__/BusinessSupportsSheet.test.tsx`: add `mockPdfComprobante` fixture with `mimeType: 'application/pdf'` and `objectKey: 'negocios/42/doc.pdf'`; add test asserting that when a PDF comprobante is rendered, no `<img alt=/comprobante/i>` is present and a lucide `FileText` role/title is visible (query via `screen.getByTitle` or accessible label as implemented).
- [x] 3.2 **RED** — In same test file: add test asserting that when a PDF comprobante is selected/active, an `<iframe title="PDF">` is present in the document.
- [x] 3.3 **GREEN** — In `src/features/business-supports/components/BusinessSupportsSheet.tsx` `SupportGallery` (or equivalent inline section): import `isImageMime` from `mime-utils` and `FileText` from `lucide-react`; branch thumbnail rendering — `isImageMime(item.mimeType)` → `<img …/>`, else → `<FileText />` in a `w-10 h-10 flex items-center justify-center` container; branch preview rendering — `isImageMime(item.mimeType)` → `<img …/>`, else → `<iframe src={viewUrl} title="PDF" className="w-full h-full border-0" />` inside a `flex-1 flex flex-col` container.
- [x] 3.4 **REFACTOR** — Run `npm run test:unit -- BusinessSupportsSheet` and confirm all tests pass, including pre-existing image-path tests.

## Phase 4: Integration Verification

- [x] 4.1 Run full unit test suite `npm run test:unit` — all tests green.
- [x] 4.2 Run type-check `npm run type-check` — zero errors (particularly `AllowedMimeType` literal union and `MIME_TO_EXT` record must widen cleanly).
- [x] 4.3 Run linter `npm run lint` — zero warnings on touched files.
- [ ] 4.4 Manual smoke: start dev server, open any business, upload a `.pdf` file — confirm sidebar shows `FileText` icon, inline preview renders iframe, "Ver original" opens PDF in new tab.
