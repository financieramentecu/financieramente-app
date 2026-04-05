## Context

The system maintains a `ClawbackBalance` table with `idUser` and `totalAmount`. This amount represents the accumulated balance for an agent.
Currently, this is not displayed on the front end.

## Goals / Non-Goals

**Goals:**
- Display total accumulated Clawback balance in the Agent Dashboard.
- Display total accumulated Clawback balance in the Business Registration Form.
- Include testing data for this KPI in the database seed.

**Non-Goals:**
- Recalculate or modify Clawback balances (this is handled by settlement processing).

## Decisions

### 1. Data Fetching Strategy

**Decision:** Update `getAgentDashboardStats` to return `clawbackBalance` and create `getClawbackBalance` in `agent.service.ts`.
**Alternatives Consider:**
- Fetching directly using inline queries on the page. Rejection reason: Violates Service responsibility split.

### 2. Form Integration

**Decision:** Fetch `clawbackBalance` in the Server Component page (`/negocios/crear/page.tsx`) and pass it down as a prop through `BusinessWrapper` to `BusinessForm`.
**Alternatives Consider:**
- Expanding `UserWithRole` payload. Rejection reason: Safer and more modular to iterate props than updating core type payloads across high usage.

### 3. Database Seeding

**Decision:** Create a new seed function `seedClawbackBalance` in `prisma/seeds/clawback.ts` running after users are seeded. Add an Agent user to `prisma/seeds/user.ts`.
**Alternatives Consider:**
- Standardizing with manual database updates during manual test review. Rejection reason: Slows down automated and local setups.

## Risks / Trade-offs

- **Risk:** `ClawbackBalance` is null for new agents.
- **Mitigation:** Services must return a `Decimal` representing zero when no record is found without throwing.
