# Proposal: file-sync-ux-improvement

## Intent

The "Carga Archivos" page currently shows all file import statuses (LOAD, PRE-SETTLED, COMPLETED) in a single "Historial de cargas" tab, mixing files that require action with files that are already settled. Users need a clear separation: files that are still being processed (with action buttons) and files that are historical (read-only). This change restructures the tabs, simplifies filters per context, tightens delete permissions, and improves UI contrast and copies.

## Scope

### In Scope

**Tab restructure**
- Rename "Historial de cargas" → **"Archivos"** (scope: `LOAD` + `PRE-SETTLED` — files requiring action)
- Add new **"Historial"** tab (scope: only `COMPLETED` — read-only historical view)

**Filters per tab**
- Tab "Archivos": filters — search by filename, month, year. **No status filter.**
- Tab "Historial": filters — search by filename, month, year. **No status filter.**

**Delete permissions**
- Files in `LOAD` → can be deleted (show delete button)
- Files in `PRE-SETTLED` → **cannot be deleted** (hide delete button)
- Files in `COMPLETED` → **cannot be deleted** (hide delete button)

**Multi-status API filter**
- Extend GET `/api/carga-archivos/file-import` to accept `status` as comma-separated values (e.g. `status=LOAD,PRE-SETTLED`)
- Extend `useFileHistory` hook: `statuses?: string[]` serialized as comma-joined param
- Extend `FileImportService.listFileImports` to build `{ in: [...] }` Prisma filter

**UI improvements (ui-ux-pro-max)**
- Improve contrast on "IR a PRELIQUIDACIÓN" button (currently `bg-primary/5`, near-invisible)
- All clickable elements: `cursor-pointer` + hover feedback with `transition-colors duration-200`
- Minimum 4.5:1 contrast ratio on all text and badges
- Empty state: show "No hay archivos" message with context (not a blank screen)
- Action buttons: min 44×44px touch target, clear labels (not just icons where context is ambiguous)
- No emojis as icons — use Lucide SVG only

### Out of Scope

- Changes to the "Cargar archivo" upload tab
- Backend status transition logic
- New Prisma models or migrations
- Pagination (remains unchanged)
- Bulk actions

## Approach

Parametrize `HistorialCargasTab` with `allowedStatuses: FileImportStatus[]` and `showStatusFilter: false`. Each tab instance receives its own statuses and renders filters accordingly (name, month, year only). The API route and service are extended to accept multi-status. Delete action visibility is determined strictly by `carga.estado === 'LOAD'` — no other status allows deletion.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/dashboard/carga-archivos/page.tsx` | Modified | Add "Historial" tab; rename "Historial de cargas" → "Archivos"; pass `allowedStatuses` to each tab instance. |
| `src/features/load-file/components/HistorialCargasTab.tsx` | Modified | Accept `allowedStatuses` + `showStatusFilter` props; remove status filter rendering; delete button only for `LOAD`; improve button contrast and copies. |
| `src/features/load-file/hooks/use-file-history.ts` | Modified | Change `status?: string` → `statuses?: string[]`; serialize as comma-separated param. |
| `src/features/load-file/lib/load-file-api.ts` | Modified | Serialize `statuses[]` as comma-joined `status` query param. |
| `src/app/api/carga-archivos/file-import/route.ts` | Modified | Zod schema: accept comma-separated `status`; split and pass array to service. |
| `src/features/load-file/services/file-import.service.ts` | Modified | `listFileImports` builds `{ in: [...] }` Prisma filter from status array. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Backward-compat break on single-status filter | Low | Comma-separated parsing is backward-compatible; a single value still works. |
| PRE-SETTLED delete guard regression | Low | Guard is purely frontend (`carga.estado === 'LOAD'`); backend already blocks invalid deletions — double protection. |
| Re-render loop from unstable `statuses` array reference | Low | Serialize array to stable string for `useEffect` dependency. |

## Rollback Plan

- **Code**: Revert commits; single `HistorialCargasTab` without `allowedStatuses` restores previous behavior.
- **Data**: No data changes — frontend + API query parameter only. No migration needed.

## Success Criteria

- [ ] "Archivos" tab shows only `LOAD` and `PRE-SETTLED` file imports.
- [ ] "Historial" tab shows only `COMPLETED` file imports.
- [ ] Neither tab shows a status dropdown filter.
- [ ] Both tabs support search by filename, month, and year.
- [ ] Delete button is visible only for `LOAD` status items.
- [ ] `PRE-SETTLED` and `COMPLETED` items show no delete button.
- [ ] "IR a PRELIQUIDACIÓN" button meets 4.5:1 contrast ratio.
- [ ] All interactive elements have `cursor-pointer` and hover feedback.
- [ ] Empty state shows a descriptive message, not a blank screen.
- [ ] API supports `status=LOAD,PRE-SETTLED` multi-value query parameter.
- [ ] No regressions in file upload or pre-liquidacion flows.
