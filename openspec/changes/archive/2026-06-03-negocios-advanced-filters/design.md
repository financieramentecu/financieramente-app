# Design: Negocios Advanced Filters (Sheet panel + export parity)

## Technical Approach

Replace the fragmented toolbar inputs + `AdvancedFiltersModal` (Dialog) with one `side="right"` Sheet driven by react-hook-form draft state. All committed filter state moves to URL `searchParams` (`useSearchParams` + `router.replace`) so links are shareable and survive refresh. A SINGLE Zod schema (`businessFilterParamsSchema`) is the source of truth for both `GET /api/negocios` (query) and `POST /api/negocios/export` (body), closing the parity gap proven by `list-export-filter-parity.test.ts`. Two new shared components (`DateRangePicker`, `MultiSelect`) reuse existing shadcn primitives already present in `src/features/shared/ui/` (`calendar`, `command`, `popover`, `checkbox`).

This design is aligned to `spec.md` (authoritative). Param names follow the spec exactly: `statuses[]`, `dateIssuedFrom/To`, `hasSupports` (boolean), `terms[]`, `periodicityIds[]`.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Filter state location | URL `searchParams` via `useSearchParams` + `router.replace(scroll:false)` | Keep `useState` in page-client | Shareability + refresh persistence are in-scope success criteria; URL is SSOT |
| Sheet ownership | New `AdvancedFiltersSheet` component; `BusinessTableSection` only renders trigger + badge | Inline in `BusinessTableSection` | SRP — table section already 900 lines; Sheet owns draft form + catalog hooks |
| Draft vs committed state | RHF `useForm` holds draft while open; "Aplicar" writes URL; "Limpiar" resets to role default | Two-way bind each input to URL | Avoids navigation per keystroke; commit-on-apply matches modal UX |
| Single schema | `businessFilterParamsSchema` (core filters) + `.extend` for `page/pageSize/sort` in list | Two schemas (current) | Eliminates drift; parity test asserts identical `where` |
| Status contract | Add `statuses[]`; keep `status` single for back-compat; `buildBusinessListWhere` uses `status: { in }` when array present | Replace `status` outright | L (Liskov) — single-status callers (`page-client`) keep working |
| Periodicity endpoint | Create authed `GET /api/periodicities` returning `{id,name}[]` (spec requirement); back it with new `periodicity.service.ts` `listPeriodicities()` | Reuse `/api/admin/periodicities` | Admin route has NO `auth()` and wraps in `{ periodicities }` with full model; spec mandates authed `{id,name}[]`. Service maps `buyPeriodicity.findMany({orderBy:{name:'asc'}})` → `{id:idBuyPeriodicity, name}` |
| Term options | Distinct `Business.term` values via `GET /api/negocios/terms` | Hardcode `[1..10]` | Spec scenario requires options to reflect distinct DB year values; avoids stale list |
| Has comprobantes | `hasSupports` boolean (`true`/`false`/absent); WHERE `supports: { some/none: { status: true } }` | `supportCount` enum | Matches spec param + `BusinessSupport.status` soft-delete flag |
| dateIssued range | New `dateIssuedRange` in WHERE, `{ gte, lte, not: null }` | Plain gte/lte | Column is nullable; null rows must not leak into a range filter |
| Role default date field | Derived in `AdvancedFiltersSheet` from `userRole` prop (Fondeo for all; field selector switches mapping) | Server-side enforcement | Out of scope per proposal; consistent Fondeo default is enough |

## Data Flow

    URL searchParams ──parse──> page.tsx (server) ──props──> NegociosPageClient
         ▲                                                        │
         │ router.replace (Aplicar)                               │ initialValues
         │                                                        ▼
    AdvancedFiltersSheet (RHF draft) <── trigger+badge ── BusinessTableSection
         │  catalogs: useCompanies/useProducts/useClientOrigins/usePeriodicities
         ▼
    Apply ─> toSearchParams() ─> URL  ─(GET)─> businessFilterParamsSchema
    Export ─> same params as body ─(POST)─> businessFilterParamsSchema (same parse)
                                              │
                                  toBusinessListFilterInput ─> buildBusinessListWhere

Changing the date field clears `from/to` in the draft before re-render.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/features/shared/ui/date-range-picker.tsx` | Create | Popover + Calendar `mode="range"`, locale `es`, format `dd/MM/yyyy` (spec: `shared/ui/`) |
| `src/features/shared/ui/multi-select.tsx` | Create | Popover + Command + Checkbox; searchable; `value:string[]` |
| `src/features/negocios/components/AdvancedFiltersSheet.tsx` | Create | RHF Sheet `side="right"`; replaces modal; reads/writes URL params |
| `src/features/negocios/services/periodicity.service.ts` | Create | `listPeriodicities()` → `{id,name}[]` from `buyPeriodicity`, ordered by name |
| `src/features/negocios/services/business-terms.service.ts` | Create | `listDistinctTerms()` → `number[]` from `business.findMany({distinct:['term']})` |
| `src/features/negocios/hooks/use-periodicities.ts` | Create | `AsyncState<{id,name}[]>` over `GET /api/periodicities` |
| `src/features/negocios/hooks/use-business-terms.ts` | Create | `AsyncState<number[]>` over `GET /api/negocios/terms` |
| `src/app/api/periodicities/route.ts` | Create | Authed `GET` → `{ data: {id,name}[] }`, ordered by name (spec requirement) |
| `src/app/api/negocios/terms/route.ts` | Create | Authed `GET` → distinct `term` year values |
| `src/features/negocios/components/modals/AdvancedFiltersModal.tsx` | Delete | Superseded by Sheet |
| `src/features/negocios/components/BusinessTableSection.tsx` | Modify | Drop inline status/date/agent toolbar; render Sheet trigger + amber badge |
| `src/app/dashboard/negocios/negocios-page-client.tsx` | Modify | Read state from URL; remove `useState` filter block |
| `src/app/dashboard/negocios/page.tsx` | Modify | Pass parsed `searchParams` to client (server boundary) |
| `src/features/negocios/lib/business-api.schemas.ts` | Modify | New `businessFilterParamsSchema`; list/export derive from it |
| `src/features/negocios/types/business-api.types.ts` | Modify | Add `statuses`, `dateIssuedFrom/To`, `hasSupports`, `terms`, `periodicityIds` |
| `src/features/negocios/lib/build-business-list-where.ts` | Modify | Add `statuses[]`, `dateIssuedRange`, `hasSupports`, `terms[]`, `periodicityIds[]` |
| `src/features/negocios/lib/to-business-list-filter-input.ts` | Modify | Map new params into `BusinessListFilterInput` |
| `src/app/api/negocios/route.ts` | Modify | Read `getAll` for new array params; use shared schema |
| `src/app/api/negocios/export/route.ts` | Modify | Use shared schema; apply ALL params (parity hard requirement) |

## Interfaces / Contracts

```typescript
// business-api.schemas.ts — single source
const dateField = z.enum(['fondeo', 'creacion', 'emision'])
export const businessFilterParamsSchema = z.object({
  search: z.string().nullish(),
  statuses: z.array(z.enum([...BUSINESS_STATUS])).optional(),
  status: z.enum([...BUSINESS_STATUS]).nullish(),     // back-compat
  dateFrom: isoCalendarDay.optional(), dateTo: isoCalendarDay.optional(),
  createdFrom: isoCalendarDay.optional(), createdTo: isoCalendarDay.optional(),
  dateIssuedFrom: isoCalendarDay.optional(), dateIssuedTo: isoCalendarDay.optional(),
  agentName: z.string().nullish(),
  companyIds: z.array(z.number()).optional(),
  productIds: z.array(z.number()).optional(),
  originIds: z.array(z.number()).optional(),
  periodicityIds: z.array(z.number()).optional(),
  terms: z.array(z.number().int()).optional(),
  hasSupports: z.preprocess(v => v === 'true' ? true : v === 'false' ? false : v,
    z.boolean().optional()),
}).superRefine(pairedRangeCheck) // each from/to pair must travel together

export const businessListParamsSchema =
  businessFilterParamsSchema.extend({ page, pageSize, sortBy, sortOrder })
export const negociosExportBodySchema = businessFilterParamsSchema // identical

// build-business-list-where.ts additions to BusinessListFilterInput
statuses?: string[]; dateIssuedRange?: { gte: Date; lte: Date }
hasSupports?: boolean; terms?: number[]; periodicityIds?: number[]
```

`hasSupports` WHERE: `true` → `{ supports: { some: { status: true } } }`; `false` → `{ supports: { none: { status: true } } }` (`BusinessSupport.status` is the soft-delete flag). `statuses` → `{ status: { in: statuses } }`; falls back to single `status` if `statuses` absent. `dateIssuedRange` → `AND[{ dateIssued: { not: null } }, { dateIssued: { gte, lte } }]`. `periodicityIds` → `{ idBuyPeriodicity: { in } }`. `terms` → `{ term: { in } }`.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `buildBusinessListWhere` new branches (statuses/dateIssued/hasSupports/terms/periodicity) | Vitest table cases |
| Unit | `to-business-list-filter-input` mapping | Vitest |
| Integration | List ↔ export parity for EVERY param | Extend `list-export-filter-parity.test.ts` |
| Component | Sheet apply/clear/badge count; date-field switch clears range | Testing Library + RHF |
| E2E | Filter → URL updates → export matches filtered list | Playwright (optional) |

## Migration / Rollout

No DB migration. All new params optional → API stays backward compatible. Revert per commit: restore `AdvancedFiltersModal` import in `BusinessTableSection`; new params ignored if UI reverts.

## Open Questions

- [x] Supports relation confirmed: `Business.supports: BusinessSupport[]` (`schema.prisma:336`); filter on `status: true` (soft-delete flag).
- [x] Term options sourced from distinct `Business.term` via `GET /api/negocios/terms` (spec mandates DB-derived, not hardcoded).
- [ ] Confirm whether existing inline list filters (status Select, fund-date range, agentName) are FULLY removed from the toolbar or kept as quick-access — spec "Toolbar Layout" says ONLY search + Filtros + Export, so `BusinessTableSection` must drop `renderAdditionalFilters` inline controls.
