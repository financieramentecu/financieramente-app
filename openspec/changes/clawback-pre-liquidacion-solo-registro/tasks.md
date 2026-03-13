# Tasks: Clawback en pre-liquidación — solo registro

## Phase 1: Core Implementation

- [x] 1.1 Modify `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`: Remove the `if (flow !== 'VOLUNTARIA' && totalValorClawback.gt(0) && idUser !== undefined)` block inside the transaction that performs `clawbackBalance.findUnique`, `clawbackBalance.create`, and `clawbackBalance.update`.

## Phase 2: Testing

- [x] 2.1 Modify `src/features/pre-liquidacion/services/pre-liquidacion.service.test.ts`: Find the test for POLIZA with clawback (e.g., "should create Clawback per category and update ClawbackBalance when POLIZA with clawbackPercentage > 0").
- [x] 2.2 In the same test, rename the description to indicate it does _not_ update ClawbackBalance.
- [x] 2.3 In the same test, remove any assertions checking that `prisma.clawbackBalance.findUnique`, `create`, or `update` were called.
- [x] 2.4 In the same test, add assertions expecting that `prisma.clawbackBalance.findUnique`, `create`, and `update` were **NOT** called (`expect(...).not.toHaveBeenCalled()`).
- [x] 2.5 Run the test suite for `pre-liquidacion` to ensure it passes: `npm run test:unit src/features/pre-liquidacion/services/pre-liquidacion.service.test.ts`.

## Phase 3: Cleanup / Documentation

- [x] 3.1 Verify existing `openspec/specs/pre-liquidacion/spec.md` is updated (if not already handled by the spec delta) to reflect that ClawbackBalance is not updated in pre-liquidación.
