# Proposal: Business "Novedad" flag for Venta Efectuada

## Intent

Businesses stuck in `VENTA_EFECTUADA` sometimes have an issue (missing/incorrect data, pending contract input) that blocks issuance. Today there is no structured way to flag them: managers reuse free-text `observations` (already owned by cancellation reasons) or track them outside the system. Result: no visibility, no prioritization, no follow-up, and no audit trail.

This change gives business managers a first-class, one-click flag ("Con Novedad") on `VENTA_EFECTUADA` businesses, a dedicated column in the business list, and automatic resolution when the business reaches `EMITIDO` — so the flag never goes stale.

## Scope

### In Scope
- Persist novedad state on `Business`: `novedadStatus` (null | `PENDIENTE` | `RESUELTA`), `novedadMarkedAt`, `novedadResolvedAt`.
- Row action "Marcar Con Novedad" in `BusinessRowActions`, visible only when status is `VENTA_EFECTUADA` and no novedad is pending. Available to all authenticated roles (no allowlist).
- Row action "Desmarcar Novedad" in `BusinessRowActions`, visible only when `novedadStatus === 'PENDIENTE'`, letting a user undo a mistaken mark. Resets both `novedadStatus` and `novedadMarkedAt` to null (business returns to the "never marked" state, CA5a); the only remaining trace lives in `AuditLog`. Available to all authenticated roles.
- Dedicated `PATCH /api/negocios/[id]/mark-novedad` endpoint supporting both mark and unmark actions (mirrors `cancel/route.ts`: Zod schema, state validation, audit log; no role allowlist since all roles are permitted).
- Automatic resolution to `RESUELTA` inside the existing `PUT /api/negocios/[id]` transaction when `becomesEmitido` is true, regardless of the actor's role.
- Cancelling a business with a pending novedad leaves `novedadStatus` as `PENDIENTE` (no auto-clear).
- New "Novedad" column right after "Estado" in `BusinessTableSection`, rendered by a new `BusinessNovedadBadge` (orange = Pendiente, green/neutral = Resuelta, empty when null).
- Novedad state visible in the business detail view.
- New `AuditAction` values `BUSINESS_NOVEDAD_MARKED`, `BUSINESS_NOVEDAD_UNMARKED`, and `BUSINESS_NOVEDAD_RESOLVED`.
- `prisma/ERD.md` updated per project rule.

### Out of Scope
- Novedad history / multiple novedades per business (single active cycle only — unmarking resets to null, it does not create a record).
- Free-text reason or attachments for a novedad.
- Manual "resolve" action or reopening an already-resolved novedad.
- Filtering or sorting the business list by novedad.
- Notifications/alerts when a novedad is created.
- Touching `BusinessTable/ActionCell.tsx` (unconfirmed caller — must stay unchanged).
- Extracting the inline PUT business logic into a service (pre-existing debt; do not worsen, do not fix here).

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `negocios`: adds the novedad lifecycle (mark on `VENTA_EFECTUADA`, auto-resolve on transition to `EMITIDO`), the list column, the row action, and the detail display.

## Approach

Simple flat fields on `Business`, matching the existing `status String? @db.VarChar(20)` pattern where the enum lives in TypeScript only (`BUSINESS_NOVEDAD_STATUS` const in `business-entity.types.ts`). No `BusinessNovedad` table: no history requirement, and a 1:N join would cost extra selects on a paginated list.

Marking and unmarking share a dedicated action endpoint (not the generic PUT) so state preconditions stay explicit, following the shape of `PATCH /api/negocios/[id]/cancel` minus its role allowlist (all roles permitted here). Auto-resolution is written inside the existing `prisma.$transaction` in the PUT handler so status change and novedad resolution are atomic; the resolution is conditional on `novedadStatus === 'PENDIENTE'`. All three events (mark, unmark, auto-resolve) emit dedicated audit entries.

The badge replicates the `STATUS_CONFIG` record pattern from `BusinessStatusBadge`; a null `novedadStatus` renders nothing (CA5a).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | 3 nullable fields on `Business` + migration |
| `prisma/ERD.md` | Modified | Document new fields |
| `src/features/negocios/types/business-entity.types.ts` | Modified | `BUSINESS_NOVEDAD_STATUS` const + entity fields |
| `src/features/negocios/mappers/business-entity.mapper.ts` | Modified | Map new Prisma fields |
| `src/app/api/negocios/[id]/mark-novedad/route.ts` | New | PATCH endpoint |
| `src/app/api/negocios/[id]/route.ts` | Modified | Auto-resolve inside existing transaction |
| `src/features/negocios/lib/business-api.schemas.ts` | Modified | Zod schema for mark-novedad |
| `src/features/negocios/components/BusinessRowActions.tsx` | Modified | New dropdown item, state-gated |
| `src/features/negocios/components/BusinessTableSection.tsx` | Modified | New "Novedad" column after "Estado" |
| `src/features/negocios/components/ui/BusinessNovedadBadge.tsx` | New | Badge with own `STATUS_CONFIG` |
| Business detail view (`BusinessViewModal.tsx` / `dashboard/negocios/[id]/page.tsx`) | Modified | Show novedad + color |
| `src/features/auth/lib/audit-logger.ts` | Modified | 3 new `AuditAction` values |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Novedad stays `PENDIENTE` if a business is cancelled instead of emitted | Med | Accepted for v1: flag is only meaningful while in `VENTA_EFECTUADA`; list can render it as stale-but-harmless. Confirm with product during spec. |
| Auto-resolve missed because the transition path is not the PUT handler | Low | Exploration confirmed PUT is the only place `becomesEmitido` is derived; verify with a test hitting the endpoint |
| Two row-action components create confusion for future maintainers | Low | Only `BusinessRowActions` is touched; note the divergence in the design phase |
| Extra columns widen an already dense business table | Low | Badge-only column, empty when null |

## Rollback Plan

Revert the feature commit and run `prisma migrate resolve`/down-migration to drop the three nullable columns. Since all fields are nullable and additive, and no existing behavior branches on them, rolling back the application code alone is already safe — orphan columns are inert.

## Dependencies

- Prisma migration must be applied before deploy (additive, no backfill needed).

## Success Criteria

- [ ] A `VENTA_EFECTUADA` business can be marked "Con Novedad" from the row actions dropdown and shows "Pendiente" in orange in the list.
- [ ] Moving that business to `EMITIDO` flips the novedad to "Resuelta" atomically, for any actor role.
- [ ] A `VENTA_EFECTUADA` business never marked shows an empty Novedad cell.
- [ ] Detail view shows novedad status with the correct color.
- [ ] A `PENDIENTE` novedad can be unmarked back to empty from the same row-actions dropdown.
- [ ] `BUSINESS_NOVEDAD_MARKED`, `BUSINESS_NOVEDAD_UNMARKED`, and `BUSINESS_NOVEDAD_RESOLVED` entries appear in `AuditLog` with user, IP, and user agent.
- [ ] `prisma/ERD.md` reflects the new fields.
