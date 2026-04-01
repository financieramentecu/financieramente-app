# Verification Report

**Change**: `liquidar-rezagar-preliquidacion`  
**Delta specs**: `specs/pre-liquidacion/spec.md`, `specs/negocios/spec.md`  
**Verified**: 2026-03-30 (`/sdd-verify` re-run)

---

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 21 |
| Tasks complete | 20 |
| Tasks incomplete | 1 |

**Incomplete**

- [ ] **6.3** — Archive change after sign-off (`openspec-archive`).

**Flag**: WARNING — housekeeping only; core tasks complete.

---

## Build & tests execution

**Type-check** (`npm run type-check` / `tsc --noEmit`): **Passed** (exit 0).

**Note**: If `TS6053` appears for missing `.next/types/**/*.ts`, remove `.next` or regenerate with a successful `next build` before `type-check`.

**Build** (`npm run build`): **Failed** (exit 1).

```
Could not find a production build in the '.../.next' directory.
Try building your app with 'next build' before starting the static export.
(next-export-no-build-id)
```

Compile phase reported success; failure occurred during later steps in this environment. Retry on a full local/CI run without sandbox interference.

**Unit tests** (Vitest, scoped to this change):

```bash
npx vitest run --config vitest.unit.config.ts \
  src/features/pre-liquidacion/__tests__/services/pre-liquidacion.service.test.ts \
  src/features/pre-liquidacion/services/pre-liquidacion.service.test.ts \
  src/app/api/pre-liquidacion/liquidar/__tests__/route.test.ts \
  src/app/api/pre-liquidacion/rezagar/__tests__/route.test.ts \
  src/features/negocios/__tests__/components/ui/BusinessStatusBadge.test.tsx
```

**Result**: **48 passed**, 0 failed, 0 skipped, exit 0 (5 test files).

**Coverage threshold**: Not configured in `openspec/config.yaml` → skipped.

---

## Spec compliance matrix

Evidence = **test existed and passed** in the run above.

### Pre-liquidación (`specs/pre-liquidacion/spec.md`)

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Rezagar user-initiated lag | Lag fields written | `__tests__/.../pre-liquidacion.service.test.ts` > rezagarRegistros updates records with isLagByUser… | ✅ COMPLIANT |
| Rezagar user-initiated lag | Empty selection | Service lagged=0; route 400 when ids empty | ✅ COMPLIANT |
| Liquidar settles commission + distributions | Pre-liquidated with distributions | `__tests__/...` > liquidarRegistros settles… VOLUNTARIA | ✅ COMPLIANT |
| Liquidar settles commission + distributions | No distributions | No dedicated happy-path name | ⚠️ PARTIAL |
| Liquidar POLIZA clawbacks | POLIZA with clawback rows | `__tests__/...` > applyClawbacks… | ✅ COMPLIANT |
| Liquidar POLIZA clawbacks | POLIZA without clawbacks | `__tests__/...` > does NOT update clawback… | ✅ COMPLIANT |
| Linked business COMISIONANDO (pre-liq) | EMITIDO promoted | POLIZA + updateBusiness EMITIDO filter | ✅ COMPLIANT |
| Linked business COMISIONANDO (pre-liq) | Already COMISIONANDO | EMITIDO filter only (no explicit row) | ⚠️ PARTIAL |
| File COMPLETED dual gate | Partial Liquidar | SYNCHRONIZED=0, PRE-SETTLED>0 | ✅ COMPLIANT |
| File COMPLETED dual gate | Sync backlog | SYNCHRONIZED>0 | ✅ COMPLIANT |
| File COMPLETED dual gate | Fully drained | Both counts 0 | ✅ COMPLIANT |

### Negocios (`specs/negocios/spec.md`)

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| COMISIONANDO valid status | Validation passes | No `safeParse` unit test for COMISIONANDO | ❌ UNTESTED |
| Liquidar sets EMITIDO → COMISIONANDO | EMITIDO promoted | Same as pre-liq service tests | ✅ COMPLIANT |
| Liquidar sets EMITIDO → COMISIONANDO | Not EMITIDO | No explicit CANCELADO row | ⚠️ PARTIAL |
| Liquidar sets EMITIDO → COMISIONANDO | Idempotent COMISIONANDO | Same as “Already COMISIONANDO” | ⚠️ PARTIAL |
| COMISIONANDO in business list UI (SHOULD) | Badge visible | `BusinessStatusBadge.test.tsx` | ✅ COMPLIANT |

**Out-of-spec UI (not in delta files)**: Pre-liquidación detail empty state → link to `/dashboard/liquidaciones`; negocios table mapping `COMISIONANDO` → “Comisionando”. **No automated tests** for those pages.

**Compliance summary**: 14 ✅ compliant, 4 ⚠️ partial, 1 ❌ untested (Zod scenario).

---

## Correctness (static)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Rezagar + PRE-SETTLED filter | ✅ | `rezagarRegistros` |
| Liquidar + dual file gate | ✅ | `liquidarRegistros` |
| Clawbacks + balance upsert | ✅ | `applyClawbacksForSettlement` |
| Business EMITIDO → COMISIONANDO | ✅ | `updateBusinessStatusOnSettle` |
| COMISIONANDO types / badge / list mapping | ✅ | `negocios` + dashboard client |

---

## Coherence (design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Transaction + helpers | ✅ | |
| Dual gate COMPLETED | ✅ | |
| EMITIDO-only promotion | ✅ | |

---

## Issues found

**CRITICAL**

- `npm run build` did not complete successfully in this run (`next-export-no-build-id` / incomplete `.next`). Re-run on CI or local outside sandbox.

**WARNING**

- Zod COMISIONANDO validation scenario still without dedicated test.
- Task **6.3** archive pending.

**SUGGESTION**

- Optional RTL: pre-liquidación empty state button; `BusinessTableSection` “Comisionando”.
- Full `npm run test:unit` before archive.

---

## Verdict

**PASS WITH WARNINGS**

**48** scoped tests **passed**; **type-check passed**. Delta **implementation and specs** remain aligned. **Build** not green in this environment; **archive (6.3)** and optional tests still open.
