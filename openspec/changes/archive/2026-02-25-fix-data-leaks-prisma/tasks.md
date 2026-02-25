## 1. Business Domain Refactoring

- [ ] 1.1 Create unit test for `src/features/negocios/services/business.service.ts` to fetch business by ID.
- [ ] 1.2 Implement `getBusinessById` in `src/features/negocios/services/business.service.ts`.
- [ ] 1.3 Update `src/app/dashboard/negocios/editar/[id]/page.tsx` to use `getBusinessById` instead of direct Prisma import.

## 2. Agent Dashboard Refactoring

- [ ] 2.1 Create `src/features/shared/services/agent.service.ts` with unit test for dashboard metrics.
- [ ] 2.2 Implement `getAgentDashboardStats` in `src/features/shared/services/agent.service.ts`.
- [ ] 2.3 Update `src/app/dashboard/agente/page.tsx` to use the new service and remove `@/lib/prisma` import.

## 3. Batch Matcher Refactoring

- [ ] 3.1 Create `src/features/carga-archivos/services/matcher.service.ts` with unit tests for matching logic.
- [ ] 3.2 Move logic from `src/app/dashboard/carga-archivos/lib/business-matcher.ts` to `matcher.service.ts`.
- [ ] 3.3 Refactor `business-matcher.ts` (or its callers) to use the new service.

## 4. Verification

- [ ] 4.1 Run full unit test suite to ensure 80%+ coverage for new services.
- [ ] 4.2 Run `grep` to confirm no direct `@/lib/prisma` imports remain in `src/app/`.
- [ ] 4.3 Validate the change with `openspec validate fix-data-leaks-prisma`.
