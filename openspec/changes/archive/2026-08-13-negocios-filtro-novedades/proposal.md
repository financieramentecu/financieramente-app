## Why

Operations and coaches need to find businesses by their **novedad** lifecycle (COM-78) without scanning the full list. Advanced filters already cover Estado, Money Strategist, fechas, etc., but there was no way to filter by the 5-state novedad model (`NUEVA`, `SOMETIDA_DEVOLUCION`, `DECLINADA`, `PENDIENTE`, `CANCELADA`) or by businesses that were never marked (`novedadStatus IS NULL`). The legacy Pendiente/Resuelta-only mental model is insufficient for current novedad workflows.

## What Changes

- Add a **Novedades** MultiSelect in `AdvancedFiltersSheet`, visually aligned with the Estado filter.
- Options: Nueva, Sometido o Devolución, Declinado, Pendiente, Cancelado, Sin novedad. Empty selection = Todos (default; no novedad criterion).
- Multi-select semantics: match businesses whose `novedadStatus` is **any** of the selected values (OR within the dimension).
- "Sin novedad" maps to sentinel `SIN_NOVEDAD` → `novedadStatus IS NULL`.
- Wire `novedadStatuses` through list, export, and stats APIs (query/body), URL search params, `use-businesses`, and shared WHERE builder so filters combine with other dimensions via **AND**.
- Extend Zod schemas, types, and unit/parity tests for the new dimension.

## Capabilities

### New Capabilities

- (none — behavior extends the existing `negocios` capability)

### Modified Capabilities

- `negocios`: Advanced filters gain a Novedades multiselect with OR-within / AND-across semantics, including Sin novedad (null column), shared across list / export / stats.

## Impact

- **UI**: `AdvancedFiltersSheet` (new MultiSelect), URL sync / active-dimension count, `negocios-page-client` wiring as needed.
- **API**: `GET/POST` params on `/api/negocios`, `/api/negocios/export`, `/api/negocios/stats` — new optional `novedadStatuses[]`.
- **Domain**: `NOVEDAD_FILTER_*` constants and `NovedadFilterValue` in `business-entity.types.ts`; Zod in `business-api.schemas.ts`; WHERE in `build-business-list-where.ts`.
- **Tests**: build-where, schemas, filter-flow, list-export parity, AdvancedFiltersSheet.
- **No DB migration**; uses existing `Business.novedadStatus` column.
- **Ticket**: COM-78. Implementation already present on branch COM-78 (artifacts formalized after the fact).
- **Rollback**: revert the COM-78 filter wiring (UI + schemas + WHERE + tests); no schema/data rollback required.
