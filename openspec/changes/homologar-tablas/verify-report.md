# Verification Report

**Change**: homologar-tablas  
**Version**: N/A (delta specs)  
**Verified**: 2026-03-31  
**Artifact store**: hybrid (this file + Engram `topic_key` `sdd/homologar-tablas/verify-report`)

---

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 24 |
| Tasks complete | 16 |
| Tasks incomplete | 8 |

### Incomplete tasks (per `tasks.md`)

- [ ] 3.1 Refactorizar `BusinessTableSection.tsx` para usar el nuevo engine.
- [ ] 3.2 Refactorizar `RegistrosLiquidacionTable.tsx` eliminando la lógica de selección manual de checkboxes.
- [ ] 3.3 Buscar componentes que usan `div` para tablas y migrarlos.
- [ ] 3.4 Asegurar que las tablas dentro de Acordeones en Liquidación usen el componente estándar.
- [ ] 4.1 Eliminar `src/features/admin/shared/CrudTable.tsx`.
- [ ] 4.2 Eliminar `src/features/shared/ui/data-table-enhanced.tsx`.
- [ ] 4.3 Renombrar/Reemplazar el `DataTable.tsx` original por el nuevo o alias temporal.
- [ ] 4.4 Correr linter y type-check en todo el proyecto.

**Note (implementation drift)**: Code review shows `BusinessTableSection.tsx` and `RegistrosLiquidacionTable.tsx` already import and use `DataTable` from `@/features/shared/ui/DataTable/`. `CrudTable.tsx` and `data-table-enhanced.tsx` are **not present** in the tree (likely already removed). **Tasks checklist is out of sync** with the repository; completeness should be reconciled by updating `tasks.md` or completing any remaining grep-based migrations (3.3, 3.4).

**Flag**: **CRITICAL** if `tasks.md` is treated as source of truth for “done”; **WARNING** if code is ahead of the checklist.

---

## Build & Tests Execution

### Type check

**Command**: `npm run type-check` (`tsc --noEmit`)  
**Result**: Passed (exit 0).

### Unit tests

**Command**: `npm run test:unit -- --run`  
**Result**: Passed — **137** test files, **1505** passed, **3** skipped (exit 0).

### Integration tests

**Command**: `npm run test:integration -- --run`  
**Result**: Passed — **2** test files, **15** passed (exit 0).

### Production build

**Command**: `npm run build` (`next build`)  
**Result**: **Failed** (exit 1).

```
[Error [PageNotFoundError]: Cannot find module for page: /api/admin/companies/[id]]
[Error [PageNotFoundError]: Cannot find module for page: /access-denied]
[Error [PageNotFoundError]: Cannot find module for page: /_not-found]
> Build error occurred
[Error: Failed to collect page data for /api/admin/companies/[id]]
```

**Flag**: **CRITICAL** — build failure blocks release confidence; appears **unrelated** to DataTable homologation (missing route modules).

### Coverage

`openspec/config.yaml` has **no** `rules.verify.coverage_threshold`.  
**Coverage step**: Not configured (skipped).

---

## Spec Compliance Matrix

Behavioral rule used: a scenario is **COMPLIANT** only if a **passing** automated test clearly exercises that scenario. Code presence alone is insufficient.

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| DataTable reutilizable | Visualización básica | `DataTable.test.tsx` > debe renderizar correctamente los datos | COMPLIANT |
| DataTable reutilizable | Selección de filas (`selectable`) | `DataTable.test.tsx` > debe manejar la selección de filas si selectable es true | COMPLIANT |
| DataTable reutilizable | Búsqueda global + debounce | `DataTable.test.tsx` > debe filtrar los datos mediante la búsqueda global | PARTIAL (uses `searchDebounceMs={0}`; does not assert default 300ms debounce) |
| DataTable reutilizable | Visibilidad búsqueda (`searchable` false) | (none) | UNTESTED |
| DataTable reutilizable | Exportación XLSX (`exportable`) | (none) | UNTESTED |
| DataTable reutilizable | Selección controlada externa | (none on `DataTable`); `RegistrosLiquidacionTable.test.tsx` > toggling row checkbox | PARTIAL (proves parent `Set` sync for one row, not generic controlled API / select-all) |
| DataTable reutilizable | Filtros por columna | (none) | UNTESTED |
| DataTable reutilizable | Persistencia en URL | (none) | UNTESTED |
| DataTable reutilizable | Acciones de fila (`actions`) | (none) | UNTESTED |
| DataTable reutilizable | Estado de carga (`loading`) | `DataTable.test.tsx` > debe mostrar skeletons cuando está cargando | COMPLIANT |
| DataTable reutilizable | Tabla vacía | `DataTable.test.tsx` > debe mostrar mensaje de vacío cuando no hay datos | COMPLIANT |
| Migración RegistrosLiquidación | Selección masiva + sync contexto (select all) | (none) — single-row checkbox only | UNTESTED |
| Migración RegistrosLiquidación | Integración en acordeones | (none) | UNTESTED |
| Negocios DataTable | Transición visual (misma información) | (none) | UNTESTED |
| Negocios DataTable | Acciones según permisos | (none) | UNTESTED |
| Admin sin CrudTable | Consistencia acciones Editar/Eliminar | (none in admin feature tests) | UNTESTED |
| Admin sin CrudTable | Búsqueda y paginación TanStack | (none) | UNTESTED |

**Compliance summary (strict)**: **4** COMPLIANT, **3** PARTIAL, **10** UNTESTED → **17** scenarios tracked.

---

## Correctness (Static — Structural Evidence)

| Area | Status | Notes |
|------|--------|-------|
| Shared `DataTable` + subcomponents | Implemented | `src/features/shared/ui/DataTable/` |
| Admin tables on `DataTable` | Implemented | e.g. `currencies-table.tsx`, `products-table.tsx`, `periodicities-table.tsx`, `users-table.tsx` |
| `BusinessTableSection` | Implemented | Uses `DataTable` + `ColumnDef` |
| `RegistrosLiquidacionTable` | Implemented | Uses `DataTable`, `rowSelection` / `onRowSelectionChange` adapter to `Set<number>` |
| `CrudTable` / `data-table-enhanced` | Absent | Aligns with cleanup intent; matches repo state, not checked tasks |
| Task 1.10 (“exportación Excel” in unit test) | Partial | `DataTable.test.tsx` does **not** cover export |

---

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| TanStack Table v8 motor | Yes | Used across shared `DataTable` and consumers |
| Ubicación `features/shared/ui/DataTable/` | Yes | Matches |
| Sub-componentes (pagination, header, toolbar) | Yes | Present |
| Hook URL state | Mostly | Design names `useDataTableState`; code ships `useDataTableURLState` — naming drift |
| Eliminar `CrudTable` | Yes (in repo) | Tasks still list 4.1 unchecked |

---

## Issues Found

### CRITICAL (must fix before archive)

1. **`tasks.md`**: Eight tasks still unchecked while much of the work exists in code — reconcile checklist vs repo (or finish 3.3 / 3.4 / verification).
2. **Spec/test gap**: Ten scenarios lack passing tests that prove behavior (export, URL sync, column filters, controlled selection API, admin/negocios/liquidación integration, accordion).
3. **`npm run build` fails** on missing pages (`/api/admin/companies/[id]`, `/access-denied`, `/_not-found`) — not attributed to this change but blocks a green verify gate.

### WARNING (should fix)

1. **Task 1.10 vs tests**: Proposal/tasks call out Excel export in unit tests; export path is not covered by `DataTable.test.tsx`.
2. **Debounced search**: Only immediate (`searchDebounceMs={0}`) path is exercised.
3. **Liquidación**: Row-level selection is tested; **select-all** header behavior and full multi-row sync are not.

### SUGGESTION (nice to have)

1. Add focused tests for `exportable` / `actions` / `searchable={false}` / `useDataTableURLState`.
2. Optional Playwright flows for Admin search/pagination and Negocios actions.

---

## Verdict

**FAIL**

Unit and integration tests pass and TypeScript is clean, but the **production build fails**, **`tasks.md` is inconsistent** with the codebase, and **most cross-feature spec scenarios are UNTESTED** under the strict SDD verify rule (passing test per scenario).

---

## Return envelope (orchestrator)

- **status**: completed_with_findings  
- **executive_summary**: Verification recorded; gate **FAIL** due to build failure, incomplete/stale task checklist, and many spec scenarios without passing behavioral tests.  
- **artifacts**: `openspec/changes/homologar-tablas/verify-report.md`; Engram `topic_key` `sdd/homologar-tablas/verify-report`  
- **next_recommended**: Fix `next build` route/module errors; sync `tasks.md`; add tests for UNTESTED scenarios (especially export, admin, negocios, liquidación select-all).  
- **risks**: Shipping without build green or without scenario-level tests risks regressions in selection, export, and admin CRUD flows.
