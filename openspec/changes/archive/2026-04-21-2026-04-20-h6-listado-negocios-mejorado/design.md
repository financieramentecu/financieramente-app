# Design: H6 — Listado principal de negocios mejorado

## Technical Approach

Introduce **`LIQUIDADO`** end-to-end in domain types and **`BusinessStatusBadge`**, fix **`businessDataForTable`** so each API status maps explicitly (no default to **Cancelado**), and unify the table’s estado column with the same badge used in modals. Add a stable **`BusinessStatus`** code on each table row (from API `BusinessEntity.status`) so toolbar actions compare enums instead of fragile Spanish strings. Rename the **`date`** column header to **«Fecha creación»**. Align **`LIST_STATUS_OPTIONS`** with the product policy ( **`LIQUIDADO`** in; **`COMISIONANDO`** out of the new filter UI while the API may still return legacy values).

**Ciclo de negocio y backend:** el orden canónico es **`EMITIDO` → `FONDEADO` → `LIQUIDADO`**. En pre-liquidación, **`updateBusinessStatusOnSettle`** (u operación equivalente) MUST filtrar por **`status: 'FONDEADO'`** antes de asignar **`LIQUIDADO`**, para no promover negocios que siguen solo en **`EMITIDO`**. La UI de listado refleja lo que devuelve la API; la regla de transición vive en servicio + spec delta `specs/pre-liquidacion/spec.md`.

```text
GET /api/negocios → BusinessEntity[] → businessDataForTable (map + statusCode)
       → BusinessTableSection (BusinessStatusBadge, actions by statusCode)
```

## Architecture Decisions

| Decision | Option A | Option B | Choice | Rationale |
|----------|-----------|-----------|--------|-----------|
| Badge source | Local `getStatusBadge` strings | `BusinessStatusBadge` + `BusinessStatus` | **A→shared badge** | Matches proposal and modals; DS tokens live in one place. |
| Table row shape | Spanish `status` only | Spanish + **`statusCode`** | **Both** | Proposal allows ES labels short-term; **`statusCode`** avoids action regressions and duplicate color logic. |
| Unknown / future status | Map to Cancelado | Explicit fallback (secondary badge / raw code) | **Explicit fallback** | Fixes wrong terminal styling; aligns with «ningún estado válido como Cancelado». |
| Filter **`COMISIONANDO`** | Keep in Select | Remove from Select | **Remove** | «UI nueva»; API can still return **`COMISIONANDO`** — badge config may keep entry until BD migration. |
| Mapper tests | Only badge tests | Badge + pure map function tests | **Badge + mapper** | Proposal asks for mapper coverage; pure function is cheap to test. |

## Estado de negocio (referencia)

```text
EMITIDO ──(fondeo)──► FONDEADO ──(liquidación comisiones)──► LIQUIDADO
         └── no salto directo a LIQUIDADO desde EMITIDO en el paso de settle ──┘
```

## Data Flow

```text
BusinessEntity.status (enum)
       │
       ├─► businessDataForTable: { status (ES label), statusCode }
       │
       └─► BusinessTableSection
               ├─ Estado cell: BusinessStatusBadge(statusCode)
               └─ actions(row): switches on row.statusCode (or BUSINESS_STATUS)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/negocios/types/business-entity.types.ts` | Modify | Add **`BUSINESS_STATUS.LIQUIDADO`**; extend **`BusinessStatus`**. |
| `src/features/negocios/types/business.types.ts` | Modify | Add **`LIQUIDADO`**/`Liquidado` to row types; add **`statusCode: BusinessStatus`** (import entity type). |
| `src/features/negocios/components/ui/BusinessStatusBadge.tsx` | Modify | **`STATUS_CONFIG`** entry for **`LIQUIDADO`** (label e.g. **Liquidado**, palette consistent with DS). |
| `src/features/negocios/components/BusinessTableSection.tsx` | Modify | Remove **`getStatusBadge`**; use **`BusinessStatusBadge`**; **`LIST_STATUS_OPTIONS`**; rename **Fecha** header; refactor **`actions`** to **`statusCode`**. |
| `src/app/dashboard/negocios/negocios-page-client.tsx` | Modify | Exhaustive **`business`** branch including **`LIQUIDADO`**; set **`statusCode`**; no fallback to Cancelado. |
| `src/features/negocios/lib/map-business-to-table-row.ts` (optional) | Create | Extract mapper from **`useMemo`** if tests should avoid mounting the page. |
| `src/features/negocios/__tests__/components/ui/BusinessStatusBadge.test.tsx` | Modify | **`LIQUIDADO`** / filter policy expectations; adjust **`COMISIONANDO`** tests if badge copy changes. |
| `src/features/negocios/__tests__/...` | Modify | Mapper or table action tests for **`LIQUIDADO`** / non-misclassified states. |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | Modify | `business.updateMany`: `where.status === 'FONDEADO'`, `data.status === 'LIQUIDADO'`; comentarios/JSDoc alineados al ciclo anterior. |
| `src/features/pre-liquidacion/__tests__/services/pre-liquidacion.service.test.ts` | Modify | Expectativas del mock de Prisma para el filtro **`FONDEADO`**. |

## Interfaces / Contracts

- **`Business`** (table row): **`statusCode: BusinessStatus`** (from `business-entity.types`), **`status`** remains ES label for backward compatibility.
- **`BusinessStatusBadge`**: **`STATUS_CONFIG`** must include every **`BusinessStatus`** value in use (including **`LIQUIDADO`**).
- **Mapper**: `switch (b.status)` / explicit if-chain covering **`BUSINESS_STATUS`** keys; **`default`**: label from **`b.status`** or safe string, **never** `'Cancelado'` unless **`CANCELADO`**.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | **`BusinessStatusBadge`** for **`LIQUIDADO`** | Vitest + RTL (existing pattern). |
| Unit | Mapper / table row shape | Pure function tests: each enum → expected **`status`** + **`statusCode`**; unknown → not Cancelado. |
| RTL | Toolbar actions | Row factory with **`statusCode`**: **`LIQUIDADO`** matches expected buttons (per final rules). |

## Migration / Rollout

Migración de enum/BD legacy (**`COMISIONANDO` → `LIQUIDADO`**) puede ir en el mismo release si el equipo la prioriza; la UI H6 no la exige para mostrar **`LIQUIDADO`** cuando la API ya lo envía. GET **`/api/negocios`** debe ser coherente con el ciclo real (un negocio **`LIQUIDADO`** implica haber pasado por **`FONDEADO`** en flujo normal).

## Open Questions

- [x] Transición a **`LIQUIDADO`** en liquidación: solo desde **`FONDEADO`** (cerrado en servicio + spec delta pre-liquidación).
- [ ] Toolbar rules for **`LIQUIDADO`** (edit / fondear / cancel) — confirm with PRD/H7 vs mirroring **`COMISIONANDO`**/**`FONDEADO`**.
- [ ] Exact filter policy if both legacy **`COMISIONANDO`** and **`LIQUIDADO`** coexist briefly (dropdown labels vs query param).
