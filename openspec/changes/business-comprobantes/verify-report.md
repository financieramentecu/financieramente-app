# Verify Report — business-comprobantes (Re-Verify)

**Date**: 2026-05-14  
**Verdict**: PASS WITH WARNINGS  
**CRITICAL**: 0 | **WARNING**: 1 | **SUGGESTION**: 0

---

## Test Suite Results

| Metric | Value |
|--------|-------|
| Total tests | 1974 |
| Passed | 1969 |
| Failed | 2 (pre-existing, unrelated) |
| Skipped | 3 |
| business-comprobantes scope (211 tests) | ALL PASS |

Pre-existing failures: `business-table-status-filter.test.tsx` — `column.header is not a function` TypeError. Unrelated to this change.

---

## Re-Verify Checklist

| Item | Result |
|------|--------|
| `mime-utils.test.ts` — only jpeg/png/webp, length 3, gif returns false/null | PASS |
| GET `/comprobantes` route test — `body.data` as array directly | PASS |
| `useBusinessSupports` tests — mock returns array directly | PASS |
| `BusinessSupportsSheet.test.tsx` — imports `ViewComprobantesSheet`, alt includes "comprobante" | PASS |
| Stats tests — `sinSoporte` present, all 12 tests pass | PASS |
| `onDeleteSuccess` → `BusinessRowActions` → `ViewComprobantesSheet` as `onSupportDeleted` | PASS |
| `onDeleteSuccess` → `BusinessTableSection` prop + passthrough | PASS |
| `onDeleteSuccess` → `MisNegociosPage` prop + passthrough | PASS |
| `onDeleteSuccess` → `negocios-page-client.tsx` `() => { refetch(); refetchStats() }` | PASS |
| `onUploadSuccess` — full 4-level prop chain verified | PASS |

---

## Issues

### WARNING — gif excluded from implementation vs. spec

**Spec states**: `mimeType ∈ {image/jpeg, image/png, image/webp, image/gif}` for presign validation.  
**Implementation**: `ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']` — gif intentionally excluded.  
**Impact**: More restrictive than spec. Tests pass as-is. Spec should be updated or the omission documented as a deliberate product decision.  
**Severity**: WARNING (no runtime failure, but spec is inaccurate)

---

## Spec Compliance Matrix

| Requirement | Status |
|-------------|--------|
| BusinessSupport model with all required fields | PASS |
| Soft delete (status = false, no physical delete) | PASS |
| Presign endpoint — 404/422 guards | PASS |
| Presign endpoint — key format | PASS |
| Persist endpoint — 201 response shape | PASS |
| Persist endpoint — AuditLog COMPROBANTE_UPLOADED | PASS |
| List endpoint — array ordered by createdAt desc | PASS |
| List endpoint — 404 on unknown negocio | PASS |
| BusinessRowActions — single component | PASS |
| Upload/delete prop chain wired end-to-end | PASS |
| AuditAction enums added | PASS |
| Presign — gif allowed | WARNING (not implemented) |

---

## Verdict: PASS WITH WARNINGS

Ready for `sdd-archive`. The gif omission should be documented in the archive as a deliberate scope reduction.
