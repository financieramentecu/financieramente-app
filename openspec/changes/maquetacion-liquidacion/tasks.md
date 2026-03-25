## 1. Backend & Services

- [x] 1.1 Update `prisma/schema.prisma` to add `settledDate DateTime? @map("settled_date")` to `SettlementCommission` (if necessary for filtering).
- [x] 1.2 Run database migration: `npx prisma migrate dev --name add_settled_date`
- [x] 1.3 Create service `src/features/liquidaciones/services/liquidacion.service.ts`
- [x] 1.4 Implement `obtenerComisionesLiquidadas` supporting `SETTLED` items, returning total settled amounts, clawbacks, and nested distribution metrics (`ComissionDistribution`), with date range/month filters.

## 2. Hooks & Data Fetching

- [x] 2.1 Create `useComisionesLiquidadas` hook for reading past settled items (using `AsyncState<T>`).

## 3. UI Components & Pages

- [x] 3.1 Create page layout at `src/app/dashboard/liquidaciones/page.tsx`
- [x] 3.2 Implement "Histórico de Liquidaciones" view: displaying total settled amounts and clawbacks.
- [x] 3.3 Implement **Accordion/Collapsible** table breakdown for viewing nested distribution metrics for participants.
- [x] 3.4 Add month and continuous date-range selectors for filtering.

## 4. Verification

- [x] 4.1 Verify Accordion expansion, total sum calculations, and filter query load accurately on-screen.
