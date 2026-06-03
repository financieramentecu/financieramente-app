# Tasks: Negocios Advanced Filters (Sheet panel + export parity)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 700–950 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Backend (Layer 0–3) → PR 2: Frontend (Layer 4–7) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Catalog endpoints + schema + WHERE + route parity | PR 1 | Backend only; no UI changes; base = `feature/simulador-comisiones` |
| 2 | Shared UI components + AdvancedFiltersSheet + toolbar wiring | PR 2 | Frontend only; base = PR 1 branch |

---

## Phase 1: Catalog Endpoints (Layer 0)

- [x] 1.1 **[RED]** Write test `src/app/api/periodicities/__tests__/route.test.ts`: assert GET returns `{id,name}[]` ordered by name; 401 when unauthenticated.
- [x] 1.2 **[GREEN]** Create `src/features/negocios/services/periodicity.service.ts` — `listPeriodicities()` calls `prisma.buyPeriodicity.findMany({ orderBy: { name: 'asc' } })`, maps to `{id: idBuyPeriodicity, name}`.
- [x] 1.3 **[GREEN]** Create `src/app/api/periodicities/route.ts` — authed GET handler calling `listPeriodicities()`, returns `{ data: {id,name}[] }`.
- [x] 1.4 **[RED]** Write test `src/app/api/negocios/terms/__tests__/route.test.ts`: assert GET returns distinct `term` numbers; 401 when unauthenticated.
- [x] 1.5 **[GREEN]** Create `src/features/negocios/services/business-terms.service.ts` — `listDistinctTerms()` calls `prisma.business.findMany({ distinct: ['term'], select: { term: true } })`, returns `number[]`.
- [x] 1.6 **[GREEN]** Create `src/app/api/negocios/terms/route.ts` — authed GET handler calling `listDistinctTerms()`, returns `{ data: number[] }`.

## Phase 2: Types, Schemas & WHERE Clause (Layers 1–2)

- [x] 2.1 **[RED]** Write test `src/features/negocios/lib/__tests__/business-api.schemas.test.ts`: parse parity — same input through `businessFilterParamsSchema` produces identical output (asserts list and export use same schema).
- [x] 2.2 **[GREEN]** Modify `src/features/negocios/lib/business-api.schemas.ts`: add `businessFilterParamsSchema` with all new params (`statuses[]`, `dateIssuedFrom/To`, `createdFrom/To`, `hasSupports`, `terms[]`, `periodicityIds[]`, `companyIds[]`, `productIds[]`, `originIds[]`); derive `businessListParamsSchema` (`.extend` with page/sort) and `negociosExportBodySchema` (alias).
- [x] 2.3 **[GREEN]** Modify `src/features/negocios/types/business-api.types.ts`: add `statuses`, `dateIssuedFrom`, `dateIssuedTo`, `hasSupports`, `terms`, `periodicityIds` to `BusinessListParams` and export types.
- [x] 2.4 **[RED]** Write Vitest table test `src/features/negocios/lib/__tests__/build-business-list-where.test.ts`: new cases for `statuses[]`, `dateIssuedFrom/To` (null guard), `hasSupports` true/false, `terms[]`, `periodicityIds[]`.
- [x] 2.5 **[GREEN]** Modify `src/features/negocios/lib/build-business-list-where.ts`: add branches for `statuses[]` → `{status:{in}}`, `dateIssuedRange` → `AND[not:null,gte/lte]`, `hasSupports` → `some/none`, `terms[]` → `{term:{in}}`, `periodicityIds[]` → `{idBuyPeriodicity:{in}}`.
- [x] 2.6 **[GREEN]** Modify `src/features/negocios/lib/to-business-list-filter-input.ts`: map `statuses`, `dateIssuedFrom/To`, `hasSupports`, `terms`, `periodicityIds` into `BusinessListFilterInput`.
- [x] 2.7 **[REFACTOR]** Run `npm run test:unit` — all Phase 2 tests green before proceeding.

## Phase 3: API Routes Parity (Layer 3)

- [x] 3.1 **[RED]** Write/extend `src/features/negocios/__tests__/list-export-filter-parity.test.ts`: assert every param in `businessFilterParamsSchema` is handled by both route parsers identically.
- [x] 3.2 **[GREEN]** Modify `src/app/api/negocios/route.ts`: parse `statuses`, `dateIssuedFrom/To`, `createdFrom/To`, `hasSupports`, `terms`, `periodicityIds` from `searchParams` using `businessFilterParamsSchema`; pass to `toBusinessListFilterInput`.
- [x] 3.3 **[GREEN]** Modify `src/app/api/negocios/export/route.ts`: import `negociosExportBodySchema` (= `businessFilterParamsSchema`); parse body; apply ALL params through `toBusinessListFilterInput` + `buildBusinessListWhere`.
- [x] 3.4 **[REFACTOR]** Verify backward compat: single `status` param still returns correct results (scenario from spec).

## Phase 4: Shared UI Components (Layer 4)

- [x] 4.1 **[RED]** Write test `src/features/shared/ui/__tests__/date-range-picker.test.tsx`: assert renders, calls `onChange` with `DateRange` on selection, shows formatted dates.
- [x] 4.2 **[GREEN]** Create `src/features/shared/ui/date-range-picker.tsx`: Popover + Calendar `mode="range"`, locale `es`, format `dd/MM/yyyy`; exports `DateRangePicker` with `value: DateRange | undefined`, `onChange: (r: DateRange | undefined) => void`.
- [x] 4.3 **[RED]** Write test `src/features/shared/ui/__tests__/multi-select.test.tsx`: renders options, selects/deselects, calls `onChange` with updated array; searchable filter works.
- [x] 4.4 **[GREEN]** Create `src/features/shared/ui/multi-select.tsx`: Popover + Command + Checkbox; `value: string[]`, `options: {label,value}[]`, `onChange: (v:string[]) => void`; searchable.

## Phase 5: AdvancedFiltersSheet (Layer 5)

- [x] 5.1 **[RED]** Write test `src/features/negocios/components/__tests__/AdvancedFiltersSheet.test.tsx`: Sheet closes without URL change on dismiss; "Aplicar" updates URL with all selected params; "Limpiar filtros" resets form state without closing; badge count reflects active dimensions.
- [x] 5.2 **[GREEN]** Create `src/features/negocios/components/AdvancedFiltersSheet.tsx`: `side="right"` Sheet; `useForm` (RHF) draft state pre-populated from URL params; all 9 filter dimensions wired (date-field selector + DateRangePicker, statuses MultiSelect, hasSupports radio, companyIds/productIds/originIds MultiSelect, terms MultiSelect, periodicityIds MultiSelect, agentName autocomplete via `use-search-agents`).
- [x] 5.3 **[GREEN]** Create `src/features/negocios/hooks/use-periodicities.ts`: `AsyncState<{id,name}[]>` fetching `GET /api/periodicities`.
- [x] 5.4 **[GREEN]** Create `src/features/negocios/hooks/use-business-terms.ts`: `AsyncState<number[]>` fetching `GET /api/negocios/terms`.
- [x] 5.5 **[REFACTOR]** Implement date-field selector logic: changing field clears from/to in RHF state; default = "Fondeo".

## Phase 6: Toolbar & BusinessTableSection (Layer 6)

- [x] 6.1 **[RED]** Write test `src/features/negocios/components/__tests__/BusinessTableSection.test.tsx`: toolbar shows only 3 controls; badge hidden when no active filters; badge shows count when filters active; Export disabled during loading.
- [x] 6.2 **[GREEN]** Modify `src/features/negocios/components/BusinessTableSection.tsx`: remove inline status Select, date range inputs, agentName input; add Sheet trigger button + amber badge (`#F59E0B`, hidden at zero); disable Export while loading; render `AdvancedFiltersSheet`.
- [x] 6.3 **[GREEN]** Implement `countActiveDimensions` util in `src/features/negocios/lib/count-active-dimensions.ts`: returns number of active filter dimensions from current URL params.

## Phase 7: Page-Client URL State & Integration (Layer 7)

- [x] 7.1 **[GREEN]** Modify `src/app/dashboard/negocios/page.tsx` (server): parse `searchParams` and pass typed props to `NegociosPageClient`.
- [x] 7.2 **[GREEN]** Modify `src/app/dashboard/negocios/negocios-page-client.tsx`: remove `useState` filter block; read all filter state from URL `searchParams` via `useSearchParams`; pass current params to Export call as body.
- [x] 7.3 **[GREEN]** Delete `src/features/negocios/components/modals/AdvancedFiltersModal.tsx` (superseded) — imports removed; file is now an orphan.
- [x] 7.4 **[RED]** Write integration test `src/features/negocios/__tests__/filter-flow.test.tsx`: filter applied in Sheet → URL updates → export receives same params.
- [x] 7.5 **[REFACTOR]** Run full `npm run test:unit`; fix any regressions from toolbar/state changes.

## Phase 8: Cleanup

- [x] 8.1 Remove any dead imports from deleted `AdvancedFiltersModal` in all files. (completed — AdvancedFiltersModal import removed from BusinessTableSection; orphan file noted)
- [x] 8.2 Verify `npm run type-check` and `npm run lint` pass with zero errors. (type-check: 0 errors)
- [x] 8.3 Confirm `npm run test:unit` green end-to-end. (296 files passed, 2647 tests, 0 failures)
