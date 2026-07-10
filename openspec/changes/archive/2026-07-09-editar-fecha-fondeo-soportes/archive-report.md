# Archive Report: editar-fecha-fondeo-soportes

**Change**: editar-fecha-fondeo-soportes
**Archive Date**: 2026-07-09
**Archived to**: `openspec/changes/archive/2026-07-09-editar-fecha-fondeo-soportes/`
**Artifact Store Mode**: hybrid (Engram + filesystem)
**Status**: COMPLETE ✓

## Artifact Traceability (Engram Observation IDs)

All artifacts retrieved from Engram and verified complete:

| Artifact | Engram ID | Topic Key | Status |
|----------|-----------|-----------|--------|
| Proposal | 1098 | sdd/editar-fecha-fondeo-soportes/proposal | Retrieved ✓ |
| Spec (Delta) | 1099 | sdd/editar-fecha-fondeo-soportes/spec | Retrieved ✓ |
| Design | 1100 | sdd/editar-fecha-fondeo-soportes/design | Retrieved ✓ |
| Tasks | 1101 | sdd/editar-fecha-fondeo-soportes/tasks | Retrieved ✓ |
| Apply Progress | 1102 | sdd/editar-fecha-fondeo-soportes/apply-progress | Retrieved ✓ |
| Verify Report | 1103 | sdd/editar-fecha-fondeo-soportes/verify-report | Retrieved ✓ |
| Archive Report | 1106 | sdd/editar-fecha-fondeo-soportes/archive-report | Persisted ✓ |

## Execution Summary

### Task Completion Gate: PASSED ✓
All 21 implementation tasks marked complete [x]. No unchecked implementation tasks remain in the tasks artifact. Gate validation confirmed before proceeding to spec sync and archive move.

### Spec Sync: MERGED ✓

**Main Spec**: `openspec/specs/negocios/spec.md`
- **Domain**: negocios
- **Action**: Merged delta requirements into main spec

**Delta Requirements Merged (3 ADDED)**:
1. Inline edit of Business.dateAnchored with Payment sync
2. Support validation before funding (/fondear, /fondear-aportes)
3. Remediation of businesses funded without supports

**Removed Requirements (1 REMOVED)**:
1. Fondeo por anualidades vía /fondear-anualidades (dead route)
   - Reason: superseded by `/fondear-aportes`; unused dead code
   - Migration: None required; `/fondear-aportes` already covers all use cases

**Merge Strategy**: Appended ADDED and REMOVED sections to the end of the main spec as "## ADDED Requirements" and "## REMOVED Requirements" sections following the existing main requirements. No conflicting requirements or overwrites. All existing requirements preserved.

### Archive Move: COMPLETED ✓

**Source**: `openspec/changes/editar-fecha-fondeo-soportes/`
**Destination**: `openspec/changes/archive/2026-07-09-editar-fecha-fondeo-soportes/`

**Artifacts Moved**:
- proposal.md
- design.md
- tasks.md
- verify-report.md
- specs/negocios/spec.md (delta spec preserved for audit trail)

**Active Change Folder**: Removed from `openspec/changes/` (no longer active)

### Verification: COMPLETE ✓

**Build Quality**:
- Type checking: ✓ Clean (0 errors)
- Linting: ✓ Clean (0 errors/warnings)
- Tests: ✓ 2885/2885 passed, 3 skipped, 0 failed

**Spec Compliance**:
- Requirement 1 (dateAnchored inline edit): PASS
- Requirement 2 (Payment[1] sync): PASS
- Requirement 3 (Support validation before funding): PASS
- Requirement 4 (Remediation script): PASS
- All 9 requirements in compliance matrix: PASS

**Implementation Evidence**:
- 21/21 tasks complete per apply-progress artifact
- Verify report confirms: PASS (final verdict after post-cleanup verification)
- No CRITICAL or WARNING issues
- All deviations documented and justified in tasks.md

## Changes Implemented

### New Files Created
- `src/features/negocios/lib/date-anchored.schema.ts` — Zod YYYY-MM-DD schema
- `src/features/negocios/services/business-date-anchored.service.ts` — Transactional service (updateBusinessDateAnchored, assertHasSupports)
- `src/app/api/negocios/[id]/date-anchored/route.ts` — PATCH endpoint
- `src/features/negocios/lib/remediate-unsupported-funded-businesses.ts` — Remediation logic
- `prisma/seeds/remediate-unsupported-funded-businesses.ts` — Remediation CLI wrapper
- Test files (unit + integration) for all new modules

### Modified Files
- `src/features/auth/lib/audit-logger.ts` — Added BUSINESS_DATE_ANCHORED_UPDATED, BUSINESS_REMEDIATION_REVERTED audit actions
- `src/features/negocios/services/business.service.ts` — Added updateDateAnchored() client fetch wrapper
- `src/features/negocios/components/BusinessTableSection.tsx` — Made dateAnchored inline-editable, mirrors dateIssued pattern
- `src/app/api/negocios/[id]/fondear/route.ts` — Added assertHasSupports guard (409 when supportCount=0)
- `src/app/api/negocios/[id]/fondear-aportes/route.ts` — Added assertHasSupports guard
- `src/app/dashboard/negocios/negocios-page-client.tsx` — Wired handleSaveDateAnchored
- `src/features/negocios/components/MisNegociosPage.tsx` — Passed onSaveDateAnchored callback
- Various test files extended with new test coverage

### Deleted Files
- `src/app/api/negocios/[id]/fondear-anualidades/route.ts` — Dead route removed
- `src/app/api/negocios/[id]/fondear-anualidades/__tests__/route.test.ts` — Dead route tests removed

### Preserved Files (Not Deleted Despite Initial Design)
- `src/features/negocios/lib/fondear-anualidades.schema.ts` — Schema retained; still imported by active /fondear-aportes endpoint

**Total Lines Changed**: ~750-950 (estimate from design phase; single PR delivered with size:exception approval)

## Architecture Decisions Honored

| Decision | Status | Notes |
|----------|--------|-------|
| Edit transport: PATCH /[id]/date-anchored | ✓ Implemented | SRP: atomic date+payment sync |
| Payment sync via updateMany(installmentIndex=1) | ✓ Implemented | No-op for HU3 businesses, efficient for HU4 |
| Support guard as shared service helper | ✓ Implemented | DRY across both funding endpoints |
| Date handling via dateOnlyToBogotaNoonUtc() | ✓ Implemented | Prevents UTC/Bogotá ±1 day drift |
| Remediation as standalone script (--dry-run/--apply) | ✓ Implemented | CLI wrapper at prisma/seeds/, lib at src/features |
| Transactional Business+Payment update | ✓ Implemented | Single prisma.$transaction ensures atomicity |

## Audit Trail

**User Journey**:
1. Proposal submitted with complete scope, risks, and success criteria
2. Spec and design reviewed; assumptions validated
3. Tasks decomposed across 7 phases; delivery strategy: single-pr with size:exception
4. Implementation executed via strict TDD (RED/GREEN cycles)
5. 21/21 tasks completed with test coverage
6. Verification passed: 0 CRITICAL, 0 WARNING issues
7. Cleanup and documentation updates applied
8. Change archived (2026-07-09) with all artifacts persisted

## SDD Cycle Completion

**Status**: ✅ COMPLETE AND ARCHIVED

- ✓ Proposal phase: completed, stored (ID 1098)
- ✓ Spec phase: completed, stored (ID 1099)
- ✓ Design phase: completed, stored (ID 1100)
- ✓ Tasks phase: completed, stored (ID 1101)
- ✓ Apply phase: completed, stored (ID 1102)
- ✓ Verify phase: completed, PASS verdict (ID 1103)
- ✓ Archive phase: completed, now archived

**Next Change**: Ready. No follow-up change needed. The business can now:
- Edit funding dates inline in the negocios table
- Maintain Payment[1] sync automatically
- Block funding of businesses without supporting documentation
- Run the remediation script to clean up historical funding-without-supports rows

**Rollback**: Single-PR revert if needed (restores read-only dateAnchored cell; no data schema changes required).
