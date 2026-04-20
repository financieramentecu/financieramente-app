# Tasks: `date_issued` / HU2

## Phase 1: Infrastructure

- [x] 1.1 Add `dateIssued DateTime? @map("date_issued")` to `Business` in `prisma/schema.prisma`.
- [x] 1.2 Generate and apply migration (`npx prisma migrate dev` — name e.g. `add_business_date_issued`).

## Phase 2: Types and validation

- [x] 2.1 Add `dateIssued: string | null` to `BusinessEntity` in `business-entity.types.ts`.
- [x] 2.2 Extend `businessEntitySchema` in `business-api.schemas.ts` with nullable `dateIssued` (string ISO or null).

## Phase 3: Persistence (write paths)

- [x] 3.1 In `create-business.ts`, pass `dateIssued: new Date()` into `tx.business.create` when `status === EMITIDO` (with contract path).
- [x] 3.2 In `src/app/api/negocios/[id]/route.ts` contract `update`, set `dateIssued` to `existingBusiness.dateIssued ?? new Date()` only when transitioning `VENTA_EFECTUADA` → `EMITIDO` with contract; omit or leave unchanged otherwise.

## Phase 4: Read path (mapper)

- [x] 4.1 Map `dateIssued` in `prismaBusinessToEntity` (`business-entity.mapper.ts`) via `?.toISOString() ?? null`.

## Phase 5: Tests and fixtures

- [x] 5.1 Add `dateIssued` to `createMockBusiness` / mocks in `__tests__/fixtures/mock-business.ts`.
- [x] 5.2 Extend `business-entity.mapper.test.ts`: null Prisma date → null; defined date → ISO string.
- [x] 5.3 Extend `__tests__/actions/create-business.test.ts`: assert `create` data includes `dateIssued` when contract present; absent when no contract (spec scenarios: create with/without contract).
- [x] 5.4 Extend `src/app/api/negocios/[id]/__tests__/route.test.ts`: PUT from `VENTA_EFECTUADA` with contract sets `data.dateIssued`; second PUT changing contract keeps same `dateIssued` (spec: contract edit after EMITIDO).

## Phase 6: Verify

- [x] 6.1 Run targeted tests: `npm run test -- --run` scoped to negocios paths above; fix lint on touched files.
