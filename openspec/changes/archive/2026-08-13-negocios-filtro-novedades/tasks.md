## 1. Domain types and filter constants

- [x] 1.1 Add `NOVEDAD_FILTER_SIN_NOVEDAD`, `NOVEDAD_FILTER_VALUES`, and `NovedadFilterValue` in `business-entity.types.ts` (5-state model + Sin novedad). — Implemented on COM-78 prior to artifact formalization.
- [x] 1.2 Extend `BusinessFilterParams` / list filter types with optional `novedadStatuses`. — Implemented on COM-78 prior to artifact formalization.

## 2. Schemas and WHERE builder

- [x] 2.1 Accept `novedadStatuses` in Zod list/export/stats schemas (`business-api.schemas.ts`); reject invalid/legacy values. — Implemented on COM-78 prior to artifact formalization.
- [x] 2.2 Implement OR-within / null-for-SIN_NOVEDAD / empty-skip logic in `build-business-list-where.ts`. — Implemented on COM-78 prior to artifact formalization.
- [x] 2.3 Map `novedadStatuses` in `to-business-list-filter-input.ts` and count as one active dimension in `count-active-dimensions.ts`. — Implemented on COM-78 prior to artifact formalization.

## 3. API and client wiring

- [x] 3.1 Pass `novedadStatuses` through `/api/negocios`, `/api/negocios/export`, and `/api/negocios/stats` route handlers. — Implemented on COM-78 prior to artifact formalization.
- [x] 3.2 Propagate `novedadStatuses` in `use-businesses` and URL sync on the negocios page client. — Implemented on COM-78 prior to artifact formalization.

## 4. Advanced filters UI

- [x] 4.1 Add Novedades MultiSelect in `AdvancedFiltersSheet` (same style as Estado; options per CA1; empty = Todos). — Implemented on COM-78 prior to artifact formalization.
- [x] 4.2 Apply/clear URL params for `novedadStatuses` with other advanced filters (AND). — Implemented on COM-78 prior to artifact formalization.

## 5. Tests

- [x] 5.1 Unit tests for WHERE builder (concrete, SIN_NOVEDAD, mixed OR, empty, AND with other filters). — Implemented on COM-78 prior to artifact formalization.
- [x] 5.2 Schema tests for valid/invalid `novedadStatuses`. — Implemented on COM-78 prior to artifact formalization.
- [x] 5.3 Filter-flow, list-export parity, and AdvancedFiltersSheet tests covering Novedades. — Implemented on COM-78 prior to artifact formalization.
