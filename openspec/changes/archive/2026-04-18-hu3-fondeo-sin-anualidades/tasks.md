# Tasks: HU3 — Fondeo sin anualidades

## Phase 1: Foundation

- [x] 1.1 `prisma/schema.prisma` — add `dateAnchored DateTime? @map("date_anchored")` to Business model
- [x] 1.2 Run `npx prisma migrate dev --name add-date-anchored-to-business` and commit migration file
- [x] 1.3 `src/features/negocios/types/business-entity.types.ts` — add `FONDEADO` to `BUSINESS_STATUS` constant and `BusinessStatus` type; add `dateAnchored?: string` to `BusinessEntity` interface
- [x] 1.4 `src/features/negocios/types/business-status.types.ts` — remove duplicate `BUSINESS_STATUS`; re-export from `business-entity.types.ts`
- [x] 1.5 `src/features/negocios/types/business-prisma.types.ts` — add `_count: { select: { annualPayments: true } }` to `businessWithRelations` selector
- [x] 1.6 `src/features/negocios/lib/business-api.schemas.ts` — add `FONDEADO` to status enum in `businessEntitySchema` and in `businessListParamsSchema` filter enum
- [x] 1.7 `src/features/auth/lib/audit-logger.ts` — add `BUSINESS_FUNDED` to `AuditAction` enum

## Phase 2: Backend

- [x] 2.1 Create `src/app/api/negocios/[id]/fondear/route.ts` with POST handler: auth + `getCurrentUserByEmail` + role guard (AGENTE own / ASISTENTE_GERENCIA_OPERATIVA / ADMIN)
- [x] 2.2 In route: `prisma.business.findUnique` with `_count annualPayments`; reject 400 if `status !== EMITIDO`; reject 400 if `annualPayments > 0`
- [x] 2.3 In route: `prisma.business.update({ status: FONDEADO, dateAnchored: new Date() })`; call `logAuditEvent(BUSINESS_FUNDED)`; return `prismaBusinessToEntity(updated)`
- [x] 2.4 `src/features/negocios/mappers/business-entity.mapper.ts` — map `prisma.dateAnchored` → ISO string in `prismaBusinessToEntity`

## Phase 3: UI

- [x] 3.1 `src/features/negocios/components/ui/BusinessStatusBadge.tsx` — add `FONDEADO` entry to `STATUS_CONFIG` with indigo color scheme
- [x] 3.2 `src/features/negocios/components/BusinessTable/ActionCell.tsx` — add `hasAnnualPayments: boolean` prop and `onFondear?: (id: number) => void` callback; render "Fondear" button visible when `status === EMITIDO && !hasAnnualPayments && authorizedRole`
- [x] 3.3 Wire `onFondear` and `hasAnnualPayments` in the parent component that renders `ActionCell` (e.g., `BusinessTableSection.tsx` or equivalent)

## Phase 4: Tests

- [x] 4.1 Integration test `src/app/api/negocios/[id]/fondear/__tests__/route.test.ts` — happy path: EMITIDO + no APs → 200, `status === FONDEADO`, `dateAnchored` set
- [x] 4.2 Integration test — status guard: `VENTA_EFECTUADA` business → 400 rejected
- [x] 4.3 Integration test — AP guard: EMITIDO + annualPayments > 0 → 400 rejected
- [x] 4.4 Integration test — role guard: ANALISTA_SOPORTE → 403 rejected
- [x] 4.5 Integration test `src/features/negocios/mappers/__tests__/business-entity.mapper.test.ts` — `dateAnchored` maps to ISO string correctly
- [x] 4.6 Unit test `src/features/negocios/components/BusinessTable/__tests__/ActionCell.test.tsx` — Fondear visible/hidden by status + role + `hasAnnualPayments`
- [x] 4.7 Unit test `src/features/negocios/components/ui/__tests__/BusinessStatusBadge.test.tsx` — FONDEADO renders with indigo badge

## Phase 5: Cleanup

- [x] 5.1 Run `npm run type-check` — fix any TypeScript errors from consolidation or new fields
- [x] 5.2 Run `npm run test:unit` — confirm all tests pass
