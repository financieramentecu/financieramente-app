## Context

See `proposal.md` — Why (COM-78). Advanced filters already share a single WHERE builder (`buildBusinessListWhere`) across list, export, and stats. `Business.novedadStatus` is a nullable `VarChar(20)` holding the 5-state model (`NUEVA` | `SOMETIDA_DEVOLUCION` | `DECLINADA` | `PENDIENTE` | `CANCELADA`) or `null` when never marked. Legacy Pendiente/Resuelta-only filtering is not in scope; this design targets the current model plus an explicit “Sin novedad” sentinel.

Implementation already exists on branch COM-78; this document records the technical contract for verify/archive.

## Goals / Non-Goals

**Goals:**

- Single MultiSelect in `AdvancedFiltersSheet` for Novedades, styled like Estado.
- Shared param `novedadStatuses[]` through Zod schemas → URL → hooks → list/export/stats routes → `buildBusinessListWhere`.
- Correct OR-within-novedad / AND-with-other-dimensions semantics, including `SIN_NOVEDAD` → `novedadStatus: null`.

**Non-Goals:**

- Changing novedad mark/unmark/manage workflows or the 5-state model itself.
- DB migrations or enum changes.
- Filtering by legacy-only values (`RESUELTA`) or inventing new novedad statuses.
- Version bump / CHANGELOG (deferred to archive).

## Decisions

### 1. Sentinel `SIN_NOVEDAD` instead of a separate boolean

- **Choice**: `NOVEDAD_FILTER_SIN_NOVEDAD = 'SIN_NOVEDAD'` lives in `NOVEDAD_FILTER_VALUES` alongside concrete statuses; UI option “Sin novedad”.
- **Rationale**: One multiselect array keeps URL/query parity simple (`novedadStatuses` repeated params). Mixing null into the same OR tree is explicit in the WHERE builder.
- **Rejected**: Separate `hasNovedad=false` query flag (two dimensions to AND/OR with the status multiselect; more UI/URL edge cases).

### 2. WHERE construction in `build-business-list-where.ts`

```
if novedadStatuses non-empty:
  concrete = values except SIN_NOVEDAD
  OR parts:
    - if concrete.length > 0 → { novedadStatus: { in: concrete } }
    - if SIN_NOVEDAD present → { novedadStatus: null }
  push single condition or { OR: parts } into whereConditions (AND with peers)
```

Empty / omitted `novedadStatuses` → skip (Todos).

### 3. API surface parity

- Schemas accept `novedadStatuses` as array of `NovedadFilterValue` (Zod enum from `NOVEDAD_FILTER_VALUES`).
- List GET query, export, and stats all map through `to-business-list-filter-input` / shared types so COM-73 filter parity extends to this dimension.
- Active-dimension count treats any non-empty `novedadStatuses` as one dimension.

### 4. UI labels (Spanish, user-facing)

| Value | Label |
|-------|-------|
| `NUEVA` | Nueva |
| `SOMETIDA_DEVOLUCION` | Sometido o Devolución |
| `DECLINADA` | Declinado |
| `PENDIENTE` | Pendiente |
| `CANCELADA` | Cancelado |
| `SIN_NOVEDAD` | Sin novedad |

Independence from Estado: no coupling between `statuses` and `novedadStatuses` in form defaults or apply logic.

### 5. Tests (contract)

- Unit: WHERE for concrete-only, SIN_NOVEDAD-only, mixed OR, empty skip, AND with agentIds/statuses.
- Schema: accept valid values; reject legacy `RESUELTA` / unknown tokens.
- UI/filter-flow + list-export parity: `novedadStatuses` round-trip.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Users confuse “Cancelado” novedad with business status Cancelado | Distinct field label **Novedades**; same word in options is product copy from CA1 — document in QA notes. |
| `SIN_NOVEDAD` leaked into DB writes | Filter-only constant; never written to `novedadStatus` column; schema rejects it on manage/mark payloads (existing). |
| Stats/list drift if a new endpoint skips the shared builder | Keep all three on `buildBusinessListWhere`; parity tests cover `novedadStatuses`. |

## Migration Plan

- No data migration. Deploy code only.
- **Rollback**: revert COM-78 filter wiring (UI, schemas, WHERE, tests). Column and novedad workflows unchanged.

## Open Questions

- None — acceptance criteria CA1–CA6 and implementation on COM-78 are aligned.
