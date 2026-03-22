# Verification Report

**Change**: pre-liquidacion-detalle-liquidacion  
**Version**: Delta spec (pre-liquidacion/spec.md)

---

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 54 (phases 1–8) |
| Tasks complete | 54 |
| Tasks incomplete | 0 |

All tasks in `tasks.md` are marked complete [x]. No incomplete tasks.

---

## Build & Tests Execution

**Build**: ❌ Failed

```
npm run type-check → tsc --noEmit
src/app/api/negocios/__tests__/business-id.route.test.ts(409,4): error TS2352: Conversion of type 'PrismaClient<...>' to type '{ clientOrigin: { findFirst: Mock<Procedure>; }; }' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  The types of 'clientOrigin.findFirst' are incompatible between the types.
```

**Tests**: ❌ 1 failed / 1356 passed / 3 skipped (1360 total)

```
Failed test:
  src/app/api/negocios/__tests__/business-id.route.test.ts > PUT /api/negocios/[id] > Happy Path > debe actualizar negocio sin cambiar estado cuando no se proporciona contrato
  → expected "spy" to be called with arguments: [ { where: { idBusiness: 1 }, …(2) } ]
  Number of calls: 0
```

Note: This failing test is **not** part of the pre-liquidacion-detalle-liquidacion spec; it exercises PUT with an empty body `{}`. The current route returns 400 "Debe enviar contract o idClientOrigin" and does not call `prisma.business.update`, so the test expectation is outdated.

**Coverage**: ➖ Not configured (no `rules.verify.coverage_threshold` in `openspec/config.yaml`)

---

## Spec Compliance Matrix

Scenarios from `openspec/changes/pre-liquidacion-detalle-liquidacion/specs/pre-liquidacion/spec.md` mapped to test execution results. A scenario is COMPLIANT only if a test that covers it **passed**.

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Detail page for SYNCHRONIZED records | User opens detail page and sees SYNCHRONIZED records only | `pre-liquidacion.service.test.ts` > obtenerRegistrosParaLiquidacion > returns only SYNCHRONIZED records and correct archivo.fileType | ✅ COMPLIANT |
| Detail page for SYNCHRONIZED records | User opens detail page and sees SYNCHRONIZED records only | `registros/[fileId]/route.test.ts` > returns 200 with correct shape for allowed role (ANALISTA_SOPORTE) | ✅ COMPLIANT |
| Detail page for SYNCHRONIZED records | User selects rows and opens Ver Negocio | `business-view-modal.test.tsx` > Edit client origin… > Modal loads with origin as label and Editar origen in footer when EMITIDO | ✅ COMPLIANT |
| Detail page for SYNCHRONIZED records | Select-all and row checkbox control selection | (no dedicated test) | ⚠️ PARTIAL |
| API returning SYNCHRONIZED records | Client requests registros for a file | `registros/[fileId]/route.test.ts` > returns 200 with correct shape for allowed role | ✅ COMPLIANT |
| API returning SYNCHRONIZED records | File with no SYNCHRONIZED records | `pre-liquidacion.service.test.ts` > returns empty registros with archivo metadata when file has no SYNCHRONIZED records | ✅ COMPLIANT |
| Bulk Liquidar action | User liquidates selected records | `pre-liquidacion.service.test.ts` > liquidarRegistros > updates only SYNCHRONIZED ids and returns liquidated count | ✅ COMPLIANT |
| Bulk Liquidar action | User liquidates selected records | `liquidar/route.test.ts` > returns 200 with liquidated and fileCompleted when allowed role | ✅ COMPLIANT |
| Bulk Liquidar action | File completes when last SYNCHRONIZED record is liquidated | `pre-liquidacion.service.test.ts` > liquidarRegistros > sets FileImport COMPLETED when 0 SYNCHRONIZED remain | ✅ COMPLIANT |
| Bulk Liquidar action | File not completed when some SYNCHRONIZED remain | `pre-liquidacion.service.test.ts` > liquidarRegistros > does not set FileImport COMPLETED when some SYNCHRONIZED remain | ✅ COMPLIANT |
| Bulk Liquidar action | Non-SYNCHRONIZED ids in request are skipped | `pre-liquidacion.service.test.ts` > liquidarRegistros > skips non-SYNCHRONIZED ids and returns actual liquidated count | ✅ COMPLIANT |
| Bulk Rezagar action | User rezaga selected records | `pre-liquidacion.service.test.ts` > rezagarRegistros > updates only SYNCHRONIZED ids to LAG with lagDate and isLag | ✅ COMPLIANT |
| Bulk Rezagar action | User rezaga selected records | `rezagar/route.test.ts` > returns 200 with lagged count when allowed role | ✅ COMPLIANT |
| Bulk Rezagar action | Rezagar does not complete the file | `pre-liquidacion.service.test.ts` > rezagarRegistros > does not set FileImport COMPLETED (rezagar never completes file) | ✅ COMPLIANT |
| Audit logging for Liquidar and Rezagar | Audit log created after Liquidar | (route calls logAuditEvent; test mocks it but does not assert call) | ⚠️ PARTIAL |
| Audit logging for Liquidar and Rezagar | Audit log created after Rezagar | (route calls logAuditEvent; test mocks it but does not assert call) | ⚠️ PARTIAL |
| Authorization for detail page and bulk actions | ANALISTA_SOPORTE can access detail page and actions | `registros/[fileId]/route.test.ts` > returns 200 with correct shape for allowed role (ANALISTA_SOPORTE); liquidar/rezagar route tests with allowed role | ✅ COMPLIANT |
| Authorization for detail page and bulk actions | Unauthorized role cannot call new endpoints | `registros/[fileId]/route.test.ts` > returns 403 for unauthorized role; liquidar/route.test.ts > returns 403 for unauthorized role; rezagar/route.test.ts > returns 403 for unauthorized role | ✅ COMPLIANT |
| Navigation to detail from file list | User navigates from file list to detail | Manual/E2E per tasks 7.3 and manual-e2e-checklist.md | ⚠️ PARTIAL |
| File metadata includes fileType | Detail page receives fileType and renders correct columns | Service test returns fileType; GET registros returns fileType in shape | ✅ COMPLIANT |
| File metadata includes fileType | VOLUNTARIA file shows VOLUNTARIA columns | Implementation in RegistrosLiquidacionTable by fileType; no dedicated unit test for column set | ⚠️ PARTIAL |
| Edit client origin from Ver Negocio modal when EMITIDO | Modal loads with origin as label and Editar origen in footer when EMITIDO | `business-view-modal.test.tsx` > Modal loads with origin as label and Editar origen in footer when EMITIDO | ✅ COMPLIANT |
| Edit client origin from Ver Negocio modal when EMITIDO | Clicking Editar origen shows Select and Guardar in footer | `business-view-modal.test.tsx` > Clicking Editar origen shows Select and Guardar in footer | ✅ COMPLIANT |
| Edit client origin from Ver Negocio modal when EMITIDO | User saves new origin and modal returns to label view | `business-view-modal.test.tsx` > User saves new origin and modal returns to label view | ✅ COMPLIANT |
| Edit client origin from Ver Negocio modal when EMITIDO | Non-EMITIDO business does not show Editar origen | `business-view-modal.test.tsx` > Non-EMITIDO business does not show Editar origen | ✅ COMPLIANT |
| Edit client origin from Ver Negocio modal when EMITIDO | Backend accepts only idClientOrigin when EMITIDO | `business-id.route.test.ts` > PUT Happy Path > debe actualizar solo idClientOrigin cuando negocio está EMITIDO | ✅ COMPLIANT |

**Compliance summary**: 22 scenarios compliant, 4 partial (select-all/checkbox, audit assertion, navigation, VOLUNTARIA columns). No scenario is UNTESTED or FAILING due to this change’s tests.

---

## Correctness (Static — Structural Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Detail page for SYNCHRONIZED records | ✅ Implemented | Page at `[fileId]/page.tsx`, RegistrosLiquidacionTable with checkbox first column, section header by fileType, Ver Negocio opens modal; BusinessViewModal extended with allowEditOrigin/clientOriginsOptions/onSaveOrigin; Edit origin flow when EMITIDO implemented. |
| API returning SYNCHRONIZED records | ✅ Implemented | GET `/api/pre-liquidacion/registros/[fileId]` returns only SYNCHRONIZED, flat RegistroLiquidacionDetalle and archivo with fileType. |
| Bulk Liquidar action | ✅ Implemented | liquidarRegistros in transaction; updateMany SYNCHRONIZED→SETTLED; FileImport COMPLETED when 0 remain; POST /liquidar with schema and audit. |
| Bulk Rezagar action | ✅ Implemented | rezagarRegistros in transaction; updateMany SYNCHRONIZED→LAG, isLag, lagDate; no FileImport update; POST /rezagar with schema and audit. |
| Audit logging for Liquidar and Rezagar | ✅ Implemented | COMMISSION_SETTLED and COMMISSION_LAGGED in AuditAction; logAuditEvent called after liquidar/rezagar (fire-and-forget). |
| Authorization for detail page and bulk actions | ✅ Implemented | Role check ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE on registros, liquidar, rezagar; ANALISTA_SOPORTE.liquidaciones.preliquidacion = true. |
| Navigation to detail from file list | ✅ Implemented | ListaArchivosDisponibles has "Ver Detalle" button navigating to `/dashboard/pre-liquidacion/[fileId]`. |
| File metadata includes fileType | ✅ Implemented | ArchivoDisponible.fileType; service and GET registros include fileType; table columns by fileType. |
| Edit client origin from Ver Negocio modal when EMITIDO | ✅ Implemented | BusinessViewModal allowEditOrigin flow; ModalVerNegocio with useClientOrigins and onSaveOrigin calling PUT negocios; updateBusinessSchema and PUT route accept idClientOrigin when EMITIDO. |

---

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Decision 1: New detail page, Client Component, useParams | ✅ Yes | Page at `[fileId]/page.tsx`, useRegistrosLiquidacion(fileId), DetallePreLiquidacionHeader, RegistrosLiquidacionTable, BarraAccionesLiquidacion. |
| Decision 2: Table column strategy by fileType, checkbox first, section header | ✅ Yes | RegistrosLiquidacionTable receives fileType; VOLUNTARIA/POLIZA column sets; section header by fileType; "Ver negocio" row action. |
| Decision 3: Bulk actions state in page, BarraAccionesLiquidacion props | ✅ Yes | selectedIds in page; Liquidar/Rezagar disabled when 0 selected or loading; modals and refetch on success. |
| Decision 4: GET registros, POST liquidar, POST rezagar | ✅ Yes | New routes and response shapes as in design. |
| Decision 5: obtenerRegistrosParaLiquidacion, liquidarRegistros, rezagarRegistros | ✅ Yes | Service functions and transaction logic match design. |
| Decision 6: FileImport COMPLETED in liquidarRegistros when 0 SYNCHRONIZED | ✅ Yes | Implemented in same transaction. |
| Decision 7: Ver Negocio modal — label, Editar origen, Select, onSaveOrigin, PUT idClientOrigin | ✅ Yes | BusinessViewModal extension and ModalVerNegocio; PUT negocios accepts idClientOrigin when EMITIDO. |
| Decision 8: ANALISTA_SOPORTE preliquidacion = true | ✅ Yes | permissions.ts updated. |
| Decision 9: ArchivoDisponible.fileType, RegistroLiquidacionDetalle, RespuestaRegistrosLiquidacion | ✅ Yes | Types and service mapping. |
| Decision 10: COMMISSION_SETTLED, COMMISSION_LAGGED | ✅ Yes | audit-logger.ts enum. |
| File Changes Table | ✅ Yes | New/modified files match the design table. |

---

## Issues Found

**CRITICAL** (must fix before archive):

1. **Type-check failure** in `src/app/api/negocios/__tests__/business-id.route.test.ts` (line 409): cast of `prisma` to `{ clientOrigin: { findFirst: ReturnType<typeof vi.fn> } }` triggers TS2352. Fix: use `unknown` in the assertion chain (e.g. `prisma as unknown as { clientOrigin: { findFirst: ReturnType<typeof vi.fn> } }`) or type the mock so it is compatible with the Prisma client type.
2. **One failing unit test** (outside this change’s spec): PUT "debe actualizar negocio sin cambiar estado cuando no se proporciona contrato" expects `prisma.business.update` to be called when body is `{}`. The route now returns 400 when neither `contract` nor `idClientOrigin` is sent, so the test is outdated. Update or remove the test so the suite passes.

**WARNING** (should fix):

1. **Audit log assertions**: POST liquidar and POST rezagar route tests do not assert that `logAuditEvent` was called with `COMMISSION_SETTLED` / `COMMISSION_LAGGED` and the correct details. Adding these assertions would strengthen spec compliance for the audit scenarios.
2. **Select-all / row checkbox**: No dedicated unit test for "select-all and row checkbox control selection" and bulk bar enabling only when ≥1 selected; covered by implementation and possibly E2E/manual.

**SUGGESTION** (nice to have):

1. Consider a small component or integration test for RegistrosLiquidacionTable that asserts VOLUNTARIA vs POLIZA column headers when fileType changes.
2. E2E for "User navigates from file list to detail" and full flow (select → Liquidar/Rezagar) as noted in tasks 7.3.

---

## Verdict

**FAIL**

Build fails (type-check) and one unrelated PUT test fails. The implementation of the change is complete and aligned with the spec and design; the blocking issues are a type error in the test file and an outdated PUT test expectation. Fix the two CRITICAL items and re-run verify before archiving.
