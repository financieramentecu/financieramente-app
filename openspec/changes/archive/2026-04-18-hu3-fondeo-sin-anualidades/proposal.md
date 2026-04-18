# Proposal: HU3 — Fondeo sin anualidades

## Intent
Businesses in `EMITIDO` state that have **no** annual-payment rows need a one-click "Fondear" action that records a funding timestamp and transitions the business to `FONDEADO`. Today this status and transition do not exist anywhere in the stack.

## Scope

### In Scope
- Add `FONDEADO` to `BUSINESS_STATUS` constant and `BusinessStatus` type
- Consolidate the two drifting `BUSINESS_STATUS` definitions (`business-entity.types.ts` and `business-status.types.ts`) into a single source of truth
- New `POST /api/negocios/[id]/fondear/route.ts` (mirrors cancel sub-route pattern)
- Guard: `status === EMITIDO` AND `annualPayments.length === 0`
- Set `dateAnchored = now()` on Business (new Prisma field) and `status = FONDEADO`
- Role guard: AGENTE (own businesses), ASISTENTE_GERENCIA_OPERATIVA (all), ADMIN (all)
- Add "Fondear" button in `ActionCell.tsx` visible for EMITIDO + authorized roles
- Add `FONDEADO` entry in `BusinessStatusBadge` (indigo badge)
- Add `BUSINESS_FUNDED` to `AuditAction` enum
- Add `dateAnchored` to `BusinessEntity` and mapper

### Out of Scope
- LIQUIDADO status (separate HU)
- Modal flow for businesses WITH annual payments (HU4)
- ANALISTA_SOPORTE access to fondear
- Leader-specific ownership filtering (deferred refinement)

## Approach
Create a dedicated `POST /api/negocios/[id]/fondear/route.ts` following the existing cancel sub-route pattern. The route authenticates, checks role permissions, verifies `status === EMITIDO`, queries `annualPayments` count to confirm zero rows, then atomically sets `dateAnchored = now()` and `status = FONDEADO` in a single Prisma update. The UI adds a "Fondear" action button in `ActionCell` gated by status and role. The `businessWithRelations` selector adds `annualPayments: true` to support the guard check.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add `dateAnchored DateTime?` to Business model |
| `src/features/negocios/types/business-entity.types.ts` | Modified | Add `FONDEADO`; add `dateAnchored` to `BusinessEntity`; consolidate duplicate from `business-status.types.ts` |
| `src/app/api/negocios/[id]/fondear/route.ts` | New | POST endpoint: auth + role guard + status guard + zero-annualPayments guard + atomic update |
| `src/features/negocios/components/BusinessTable/ActionCell.tsx` | Modified | Add "Fondear" button with role/status visibility |
| `src/features/negocios/components/ui/BusinessStatusBadge.tsx` | Modified | Add `FONDEADO` badge config (indigo) |
| `src/features/negocios/types/business-prisma.types.ts` | Modified | Add `annualPayments: true` to `businessWithRelations` selector |
| `src/features/negocios/mappers/business-entity.mapper.ts` | Modified | Map `dateAnchored` to entity |
| `src/features/auth/lib/audit-logger.ts` | Modified | Add `BUSINESS_FUNDED` audit action |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Two `BUSINESS_STATUS` defs causan drift en la consolidación | Medium | Consolidar en commit preparatorio antes del feature work |
| Race condition: dos usuarios fondean el mismo negocio | Low | Prisma `update` con `where` status check provee optimistic lock |
| `businessWithRelations` más pesado por `annualPayments` join | Low | La query es liviana; AnnualPayments solo existen en negocios Anuales |

## Rollback Plan
1. Revertir la migración que agrega `dateAnchored` (columna nullable, seguro de dropear)
2. Revertir commits de la ruta, botón UI y constante de status
3. Limpieza de datos: negocios en `FONDEADO` pueden volver a `EMITIDO` via script si se requiere

## Dependencies
- H1 (AnnualPayment table) — ya implementado ✅
- H2 (dateIssued / issuance instant) — ya implementado ✅

## Success Criteria
- [ ] Acción "Fondear" visible en negocios EMITIDO para AGENTE, ASISTENTE_GERENCIA_OPERATIVA, ADMIN
- [ ] Click en "Fondear" en negocio sin anualidades setea `dateAnchored` y transiciona a `FONDEADO`
- [ ] No aparece modal (ruta no-anual)
- [ ] Badge `FONDEADO` renderiza con estilo indigo
- [ ] Log de auditoría registra evento `BUSINESS_FUNDED`
- [ ] `BUSINESS_STATUS` consolidado en única fuente de verdad
