# Apply Progress: business-comprobantes-pdf

## Status: COMPLETE — All tasks done (16/16 automated + 1 manual smoke pending)

## Mode: Strict TDD

---

## TDD Cycle Evidence

| Task | RED | GREEN | REFACTOR | Status |
|------|-----|-------|----------|--------|
| 1.1 ALLOWED_MIME_TYPES length 4 | ✅ | ✅ | ✅ | DONE |
| 1.2 isAllowedMime(pdf) → true; isImageMime tests | ✅ | ✅ | ✅ | DONE |
| 1.3 extensionFor(pdf) → 'pdf' | ✅ | ✅ | ✅ | DONE |
| 1.4 validateUpload pdf ok/FILE_TOO_LARGE | ✅ | ✅ | ✅ | DONE |
| 1.5 mime-utils.ts implementation | — | ✅ | ✅ | DONE |
| 1.6 25/25 mime-utils tests pass | — | — | ✅ | DONE |
| 2.1 accept contains application/pdf | ✅ | ✅ | ✅ | DONE |
| 2.2 UploadComprobanteModal GREEN | — | ✅ | ✅ | DONE |
| 2.3 6/6 modal tests pass | — | — | ✅ | DONE |
| 3.1 PDF thumbnail: no img, FileText svg | ✅ | ✅ | ✅ | DONE |
| 3.2 iframe title="PDF viewer" for PDF | ✅ | ✅ | ✅ | DONE |
| 3.3 BusinessSupportsSheet GREEN | — | ✅ | ✅ | DONE |
| 3.4 8/8 sheet tests pass | — | — | ✅ | DONE |
| 4.1 Full suite: 216 files / 2043 tests / 0 failures | — | — | ✅ | DONE |
| 4.2 type-check: zero errors | — | — | ✅ | DONE |
| 4.3 lint: clean | — | — | ✅ | DONE |

---

## Completed Tasks

- [x] 1.1 RED — ALLOWED_MIME_TYPES length 4 + toContain('application/pdf')
- [x] 1.2 RED — isAllowedMime pdf → true; isImageMime describe block
- [x] 1.3 RED — extensionFor(pdf) → 'pdf'
- [x] 1.4 RED — validateUpload pdf ok 1MB; FILE_TOO_LARGE 11MB
- [x] 1.5 GREEN — mime-utils.ts: pdf in ALLOWED_MIME_TYPES + MIME_TO_EXT + isImageMime exported
- [x] 1.6 REFACTOR — 25/25 mime-utils tests green
- [x] 2.1 RED — accept attribute contains application/pdf
- [x] 2.2 GREEN — ACCEPT from ALLOWED_MIME_TYPES.join(','); FileUp icon; "Seleccionar archivo"; description updated
- [x] 2.3 REFACTOR — 6/6 modal tests green
- [x] 3.1 RED — PDF thumbnail: no img alt=comprobante, FileText svg visible
- [x] 3.2 RED — iframe title="PDF viewer" for PDF selected
- [x] 3.3 GREEN — BusinessSupportsSheet: isImageMime branch thumbnail + preview; FileText + iframe
- [x] 3.4 REFACTOR — 8/8 sheet tests green
- [x] 4.1 Full test suite: 216 files / 2043 passed / 3 skipped / 0 failures
- [x] 4.2 type-check: zero errors
- [x] 4.3 lint: zero warnings on touched files
- [ ] 4.4 Manual smoke: upload .pdf, verify sidebar FileText icon, iframe preview, "Ver original"

---

## Files Changed

| File | Action | What |
|------|--------|------|
| `src/features/business-supports/lib/mime-utils.ts` | Modified | Added 'application/pdf' to ALLOWED_MIME_TYPES and MIME_TO_EXT; exported isImageMime() |
| `src/features/business-supports/components/UploadComprobanteModal.tsx` | Modified | ACCEPT derived from ALLOWED_MIME_TYPES; FileUp icon; "Seleccionar archivo"; description copy |
| `src/features/business-supports/components/BusinessSupportsSheet.tsx` | Modified | isImageMime + FileText import; thumbnail and preview branching |
| `src/features/business-supports/__tests__/mime-utils.test.ts` | Modified | pdf assertions updated (4 types, isImageMime block, extensionFor, validateUpload) |
| `src/features/business-supports/__tests__/UploadComprobanteModal.test.tsx` | Modified | accept attribute test added |
| `src/features/business-supports/__tests__/BusinessSupportsSheet.test.tsx` | Modified | mockPdfComprobante; FileText thumbnail test; iframe preview test; img preview test |
| `src/features/business-supports/__tests__/business-supports.service.test.ts` | Modified | Stale INVALID_MIME(pdf) tests → application/msword; PDF success cases added |

---

## Deviations from Design

- `business-supports.service.test.ts` had stale tests asserting `INVALID_MIME` for `application/pdf` — updated to use `application/msword` and added PDF success cases. Consistent with spec (PDF is now valid). Not a design deviation — just stale test data.

## Workload / PR Boundary

- Mode: single PR
- Current work unit: Unit 1 (all changes)
- Boundary: all changes within `src/features/business-supports/`
- Estimated review budget impact: ~100 lines changed — well under 400-line budget
