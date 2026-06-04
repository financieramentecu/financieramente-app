# Proposal: Negocios Advanced Filters (Sheet panel + export parity)

## Intent
The negocios list filters are fragmented across inline toolbar inputs and a modal, and the export endpoint ignores most filters. Consolidate ALL filters into one slide-in Sheet, add the missing filter dimensions, and guarantee export honors every filter param. Success = single discoverable filter UI, accurate active-filter badge, and export output that matches the on-screen filtered list exactly.

## Scope

### In Scope
- New shared `DateRangePicker` (Popover + Calendar `mode="range"`, react-day-picker v9).
- Replace `AdvancedFiltersModal` (Dialog) with a `side="right"` Sheet using react-hook-form.
- Toolbar reduced to: search input + "Filtros avanzados" button (badge count) + Export.
- Single date range with field selector (Fondeo dateFrom/dateTo, Creación createdFrom/createdTo, Emisión dateIssuedFrom/dateIssuedTo); changing field clears range; default Fondeo for all roles.
- Filters: date range, Money Strategist autocomplete (use-search-agents), Status MULTISELECT, Has files (Todos/Con/Sin), Company/Product/Origin multiselect, Term (discrete years multiselect), Periodicity multiselect (DB endpoint).
- API + WHERE + schema additions: `dateIssued` range, `supportCount` boolean, `term[]`, `periodicityIds[]`, `statuses[]`.
- Active-filter badge = count of active dimensions, color #F59E0B.
- Export parity: `POST /api/negocios/export` accepts ALL list params (hard requirement).

### Out of Scope
- Saved/named filter presets.
- Server-side default-by-role enforcement beyond a consistent Fondeo default.
- Pagination/sorting changes.

## Capabilities

### New Capabilities
- `negocios-advanced-filters`: Sheet-based filter panel, full filter dimension set, active-filter badge, and shared DateRangePicker.
- `negocios-export-parity`: Export endpoint accepts and applies every list filter param.

### Modified Capabilities
- `negocios-list-filtering`: status becomes multiselect (`statuses[]`); adds dateIssued range, supportCount, term, periodicity to params + WHERE.

## Approach
Sheet replaces the modal; react-hook-form holds filter state, submitted to existing `searchParams`. Extend `business-api.schemas.ts`, `business-api.types.ts`, `build-business-list-where.ts`, `to-business-list-filter-input.ts`, and both `route.ts` handlers symmetrically. Status accepts `statuses[]`; keep `status` single for backward compat. Verify/create periodicity catalog endpoint.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `components/modals/AdvancedFiltersModal.tsx` | Removed/Replaced | → Sheet panel |
| `components/BusinessTableSection.tsx` | Modified | Toolbar + badge wiring |
| `dashboard/negocios/negocios-page-client.tsx` | Modified | searchParams state |
| `shared/ui/DateRangePicker.tsx` | New | Range picker |
| `lib/business-api.schemas.ts` + `types/business-api.types.ts` | Modified | New params |
| `lib/build-business-list-where.ts` + `to-business-list-filter-input.ts` | Modified | New WHERE |
| `api/negocios/route.ts` + `api/negocios/export/route.ts` | Modified | Param parity |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Export/list param drift | High | Single shared param schema; parity test |
| Status multiselect breaks contract | Med | Add `statuses[]`, keep `status` |
| dateIssued nullable | Med | Match only IS NOT NULL |
| Missing periodicity endpoint | Med | Verify; create catalog if absent |

## Rollback Plan
Each area is additive; revert per commit. Sheet swap is isolated to BusinessTableSection — restore AdvancedFiltersModal import. New params are optional, so reverting UI leaves API backward compatible.

## Dependencies
- Periodicity catalog endpoint (verify GET /api/periodicities).
- Confirm Term units (years) for discrete value list — confirmed: discrete years.

## Success Criteria
- [ ] All filters live in one right Sheet; toolbar shows only search + button + export.
- [ ] Badge counts active dimensions in #F59E0B.
- [ ] Export output matches filtered list for every param.
- [ ] Status multiselect works without breaking single-status callers.
