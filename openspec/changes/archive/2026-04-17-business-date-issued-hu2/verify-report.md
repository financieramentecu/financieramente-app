# Verification Report

**Change**: `business-date-issued-hu2`  
**Version**: Delta spec `openspec/changes/business-date-issued-hu2/specs/negocios/spec.md` (Negocios)

---

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 12 |
| Tasks complete | 12 |
| Tasks incomplete | 0 |

All checklist items in `tasks.md` are `[x]`.

---

### Build & Tests Execution

**Typecheck**: ✅ Passed — `npx tsc --noEmit` (exit 0)

**Build**: ✅ Passed — `npm run build` (`next build`, exit 0)

**Tests**: ✅ **286 passed**, ❌ **0 failed**, ⚠️ **0 skipped** (Vitest)

Command: `npm run test -- --run src/features/negocios src/app/api/negocios`

```
Test Files  21 passed (21)
Tests       286 passed (286)
Duration    ~5s (last run)
```

**Coverage**: ➖ Not configured (`openspec/config.yaml` has no `rules.verify.coverage_threshold`)

---

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|---------------|----------|------|--------|
| Issuance instant at first EMITIDO | Create with contract | `create-business.test.ts` › `sets dateIssued when contract is provided on create` | ✅ COMPLIANT |
| Issuance instant at first EMITIDO | Create without contract | `create-business.test.ts` › `uses VENTA_EFECTUADA and null contract in business.create when contract is omitted` (expects `dateIssued: null`) | ✅ COMPLIANT |
| Issuance instant at first EMITIDO | Later contract VE→EMITIDO | `[id]/__tests__/route.test.ts` › `sets dateIssued when assigning contract from VENTA_EFECTUADA to EMITIDO`; `business-id.route.test.ts` › `debe actualizar negocio exitosamente agregando contrato y cambiando estado a EMITIDO` | ✅ COMPLIANT |
| Issuance instant at first EMITIDO | Contract edit after EMITIDO | `[id]/__tests__/route.test.ts` › `does not set dateIssued when editing contract while already EMITIDO` | ✅ COMPLIANT |
| Issuance exposed in API payloads | Issued business readable | `business-entity.mapper.test.ts` › `should map dateIssued to ISO string` | ⚠️ PARTIAL |
| Issuance exposed in API payloads | Never issued readable | `business-entity.mapper.test.ts` › `should map null dateIssued to null` | ✅ COMPLIANT |

**Compliance summary**: **5/6** scenarios fully compliant; **1** partial (see below).

**Partial rationale**: “Issued business readable” applies to **any** canonical payload (list + detail). Implementation uses `prismaBusinessToEntity` for both; the **mapper unit test** proves serialization for issued rows. There is **no** dedicated HTTP test asserting `dateIssued` on `GET /api/negocios` or `GET /api/negocios/[id]` JSON. Runtime proof is indirect (same mapper path).

---

### Correctness (Static — Structural Evidence)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Issuance instant at first EMITIDO | ✅ Implemented | `create-business.ts` sets `dateIssued` when `status === EMITIDO`; `[id]/route.ts` sets on VE→EMITIDO transition only |
| No overwrite on contract edit in EMITIDO | ✅ Implemented | Update payload omits `dateIssued` unless `becomesEmitido` |
| Issuance in API | ✅ Implemented | `BusinessEntity.dateIssued`, mapper, `businessEntitySchema` |

---

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Set once at first EMITIDO | ✅ Yes | Matches `design.md` |
| Server timestamp `new Date()` | ✅ Yes | Create + PUT transition |
| Nullable column / legacy null | ✅ Yes | Prisma + mapper `?? null` |
| camelCase `dateIssued` in JSON | ✅ Yes | Entity + Zod |
| File table | ✅ Yes | Matches `design.md` file list |

---

### Issues Found

**CRITICAL** (must fix before archive): None

**WARNING** (should fix):

- Optional: add an API-level test (`GET` list or detail) that parses JSON and asserts `dateIssued` for an issued vs never-issued business, to close the **PARTIAL** scenario above.

**SUGGESTION** (nice to have):

- Run `prisma migrate deploy` in each deployment environment so `date_issued` exists before traffic hits new code.

---

### Verdict

**PASS WITH WARNINGS**

All tasks complete; tests and production build green; delta spec satisfied with one **PARTIAL** mapping (HTTP surface for “issued readable” relies on mapper tests + shared code path).
