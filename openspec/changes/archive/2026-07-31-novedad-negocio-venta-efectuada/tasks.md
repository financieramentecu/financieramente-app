# Tasks: Business "Novedad" flag for Venta Efectuada

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650–800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (ask user) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Data layer: schema, types, mappers, ERD | PR 1 | `npm run test:unit -- business-entity.mapper map-business-to-table-row` | N/A — pure data/type layer, no runtime scenario | Revert migration + type/mapper diffs; no callers wired yet |
| 2 | API: mark-novedad route, PUT auto-resolve, audit log, Zod schema | PR 2 | `npm run test:integration -- mark-novedad business-id.route cancel.route` | `npm run dev` then `curl -X PATCH /api/negocios/{id}/mark-novedad` | Revert route file + PUT diff; PR 1 fields stay inert without callers |
| 3 | UI: hook, badge, row actions, table column, detail views, export | PR 3 | `npm run test:unit -- BusinessRowActions BusinessNovedadBadge BusinessTableSection status-presentation-parity use-business-export` | `npm run dev` then manual mark/unmark flow in `/dashboard/negocios` | Revert component/hook diffs; API and schema stay backward-compatible |

## Phase 1: Foundation — Schema, Types, Mappers

- [x] 1.1 Add `novedadStatus String? @db.VarChar(20)`, `novedadMarkedAt DateTime?`, `novedadResolvedAt DateTime?` to `Business` in `prisma/schema.prisma` (snake_case `@map`).
- [x] 1.2 Run `npx prisma migrate dev` to generate additive migration under `prisma/migrations/*/migration.sql`. (Generated with `--create-only` against the remote Neon dev DB — file created, NOT applied; see apply-progress for details.)
- [x] 1.3 Update `prisma/ERD.md`: add 3 fields to `Business` entity block, no relationship changes.
- [x] 1.4 Add `BUSINESS_NOVEDAD_STATUS` const + `BusinessNovedadStatus` type + 3 fields on `BusinessEntity` in `src/features/negocios/types/business-entity.types.ts`.
- [x] 1.5 [RED] Extend `business-entity.mapper.test.ts` (or mapper test file) asserting `prismaBusinessToEntity` maps `novedadStatus`/`novedadMarkedAt`/`novedadResolvedAt` (dates → ISO string | null); update `mock-business.ts` fixture.
- [x] 1.6 [GREEN] Extend `src/features/negocios/mappers/business-entity.mapper.ts` to map the 3 fields.
- [x] 1.7 Add `novedadStatus` (and `novedadMarkedAt`) to the table-row `Business` type in `src/features/negocios/types/business.types.ts`.
- [x] 1.8 [RED] Extend the `map-business-to-table-row` test asserting `novedadStatus`/`novedadMarkedAt` are carried into the table row.
- [x] 1.9 [GREEN] Update `src/features/negocios/lib/map-business-to-table-row.ts` to carry the new fields.
- [x] 1.10 [REFACTOR] Confirm no duplicated null-coalescing logic between the two mapper hops; align to existing patterns.

## Phase 2: API — Mark/Unmark Endpoint, Auto-Resolution, Audit

- [x] 2.1 Add `markNovedadSchema = z.object({ action: z.enum(['MARK', 'UNMARK']) })` to `src/features/negocios/lib/business-api.schemas.ts`.
- [x] 2.2 Add `BUSINESS_NOVEDAD_MARKED`, `BUSINESS_NOVEDAD_UNMARKED`, `BUSINESS_NOVEDAD_RESOLVED` to `AuditAction` in `src/features/auth/lib/audit-logger.ts`.
- [x] 2.3 [RED] Create `mark-novedad.route.test.ts` mirroring `cancel.route.test.ts`: cases 401 (no session), 400 (invalid id/body), 404 (business/user not found), 409 MARK (status ≠ VENTA_EFECTUADA or novedadStatus ≠ null), 409 UNMARK (novedadStatus ≠ PENDIENTE), 200 MARK, 200 UNMARK — each asserting the resulting fields and the matching `logAuditEvent` call.
- [x] 2.4 [GREEN] Create `src/app/api/negocios/[id]/mark-novedad/route.ts`: auth check → Zod parse → precondition check (409) → `prisma.business.update` → `logAuditEvent` (no role allowlist) → return `ApiResponse<BusinessEntity>`.
- [x] 2.5 [REFACTOR] Align error messages/shape with `cancel/route.ts` conventions; no new service layer.
- [x] 2.6 [RED] Extend `business-id.route.test.ts`: assert `PENDIENTE` → `RESUELTA` + `novedadResolvedAt` set + `BUSINESS_NOVEDAD_RESOLVED` audit call when `becomesEmitido` is true; assert no change and no audit call when `novedadStatus` is `null`/`RESUELTA`; assert single `business.update` call (no extra round-trip).
- [x] 2.7 [GREEN] Modify `src/app/api/negocios/[id]/route.ts`: inside the existing `prisma.$transaction`, when `becomesEmitido && existingBusiness.novedadStatus === 'PENDIENTE'`, add `novedadStatus: 'RESUELTA'` and `novedadResolvedAt: new Date()` to `updateData`; after commit, call `logAuditEvent(BUSINESS_NOVEDAD_RESOLVED)` outside the transaction (same placement as existing post-tx audit calls). Do not extract to a service.
- [x] 2.8 [RED] Extend `cancel.route.test.ts`: assert cancelling a business with `novedadStatus === PENDIENTE` leaves `novedadStatus` and `novedadMarkedAt` unchanged (no auto-clear).
- [x] 2.9 [GREEN] Verify/confirm the cancel handler already omits novedad fields from `updateData` (no code change expected — test-only task; if it fails, fix by excluding novedad fields from the cancel update payload).

## Phase 3: UI — Hook, Badge, Row Actions, Table, Detail, Export

- [x] 3.1 [RED] Write `use-mark-novedad.test.ts` covering idle/loading/success/error `AsyncState<BusinessEntity>` transitions for both `MARK` and `UNMARK`.
- [x] 3.2 [GREEN] Create `src/features/negocios/hooks/use-mark-novedad.ts` returning `AsyncState<BusinessEntity>`, calling `PATCH /api/negocios/[id]/mark-novedad`, matching `use-update-funded-date.ts` shape.
- [x] 3.3 [RED] Write `BusinessNovedadBadge.test.tsx`: renders nothing when `null`, orange "Pendiente" when `PENDIENTE`, green/neutral "Resuelta" when `RESUELTA`.
- [x] 3.4 [GREEN] Create `src/features/negocios/components/ui/BusinessNovedadBadge.tsx` using the `STATUS_CONFIG` record pattern from `BusinessStatusBadge`.
- [x] 3.5 [RED] Extend `BusinessRowActions.test.tsx`: assert "Marcar Con Novedad" visible only when `status === VENTA_EFECTUADA && novedadStatus !== 'PENDIENTE'`; assert "Desmarcar Novedad" visible only when `novedadStatus === 'PENDIENTE'`; assert neither is role-gated.
- [x] 3.6 [GREEN] Modify `src/features/negocios/components/BusinessRowActions.tsx`: add `novedadStatus` prop + 2 gated `DropdownMenuItem`s wired to `useMarkNovedad`. Do not touch `BusinessTable/ActionCell.tsx`. (Wired via `onMarkNovedad`/`onUnmarkNovedad` callback props, following the existing `onEdit`/`onCancel` callback pattern; the hook is invoked by the caller, not inside this component — see deviation note.)
- [x] 3.7 [RED] Extend `BusinessTableSection.test.tsx`: assert "Novedad" status column renders after "Estado" with correct empty/orange/green states; assert new "Fecha de Novedad" date column renders `novedadMarkedAt` via `formatDateBogota()` alongside `dateIssued`/`dateAnchored`/`date`. (New file `BusinessTableSection.novedad.test.tsx`, following the sibling `.date-anchored.test.tsx` file-splitting convention.)
- [x] 3.8 [GREEN] Modify `src/features/negocios/components/BusinessTableSection.tsx`: add "Novedad" column (badge) after "Estado", add "Fecha de Novedad" date column, add both labels to `BUSINESS_COLUMN_LABELS`, pass `novedadStatus` to `BusinessRowActions`.
- [x] 3.9 Wire mark/unmark handlers and refetch in `src/app/dashboard/negocios/negocios-page-client.tsx`. (Also threaded `onMarkNovedad`/`onUnmarkNovedad` through `MisNegociosPage.tsx`, which was missing from the design's file list.)
- [x] 3.10 [RED] Extend `status-presentation-parity.test.tsx` to assert `BusinessViewModal` and `dashboard/negocios/[id]/page.tsx` both render `BusinessNovedadBadge` + `novedadMarkedAt` (via `formatDateBogota()`) next to `BusinessStatusBadge`, and both expose a Mark/Unmark button wired to `useMarkNovedad`. Do not bypass this test.
- [x] 3.11 [GREEN] Modify `src/features/negocios/components/modals/BusinessViewModal.tsx`: render badge + formatted `novedadMarkedAt` + Mark/Unmark button.
- [x] 3.12 [GREEN] Modify `src/app/dashboard/negocios/[id]/page.tsx`: render badge + formatted `novedadMarkedAt` + Mark/Unmark button.
- [x] 3.13 [RED] Extend `map-business-to-export-row.test.ts`: assert exported rows include "Novedad" (empty/"Pendiente"/"Resuelta") and "Fecha de Novedad" columns. (Deviation: the actual export column-building lives server-side in `map-business-to-export-row.ts`, not in the client `use-business-export.ts` hook — see deviation note.)
- [x] 3.14 [GREEN] Modify `src/features/negocios/lib/map-business-to-export-row.ts` to include both columns (headers + row mapping); `business-export-include.ts` needed no change since Prisma `include` already returns all `Business` scalar fields.

## Phase 4: Integration Verification

- [ ] 4.1 Run full suite: `npm run test:unit && npm run test:integration` — confirm all 19 spec scenarios have a corresponding passing test.
- [ ] 4.2 Manual/E2E smoke (optional, per design): mark on a `VENTA_EFECTUADA` business → badge shows in list → emit → badge flips to Resuelta.
- [ ] 4.3 Run `npm run type-check && npm run lint`.
