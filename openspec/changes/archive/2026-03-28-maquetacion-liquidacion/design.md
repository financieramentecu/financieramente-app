## Context

The platform manages commission settlement. Currently, the `pre-liquidacion` feature calculates distributions and also executes the settlement. However, there is no interface to view the history of past settlements with flexible date filtering in a unified view.

## Goals / Non-Goals

**Goals:**
- Create a cohesive UI at `/dashboard/liquidaciones` for read-only Accordion-based lookup of `SETTLED` items.
- Focus explicitly on displaying the total amount settled in a period, total clawbacks, and the breakdown grid of distributions.
- Support reactive months/date range queries on lists.
- Avoid building dense custom components by relying on existing tables where possible.

**Non-Goals:**
- Modifying financial calculation formulas.
- Providing batch-aggregation or executing actual settlements (this already happens in pre-liquidación).

## Decisions

### 1. Component Placement & Setup
- **Decision**: Create a dedicated `src/features/liquidaciones` folder.
  - *Rationale*: Pre-liquidación is for calculations and execution; Liquidación is for historical consultation and review. Keeps features cohesive.

### 2. Service Extension
- **Decision**: Create `src/features/liquidaciones/services/liquidacion.service.ts` to query `SETTLED` items.
  - *Rationale*: Providing isolation via distinct service query methods keeps API Router interaction decoupled.

### 3. Date Filtering Interaction
- **Decision**: Introduce range or month pickers in the top-bar and pipe into list queries.
  - *Rationale*: Standard Shadcn/UI popovers are accessible. Centralizing state in page level is compliant.

### 4. Database Schema Update
- **Decision**: Add `settledDate DateTime? @map("settled_date")` to `SettlementCommission` model (if tracking precise settlement is strictly required separately from creation date).
  - *Rationale*: Enables accurate historical filtering by settlement time rather than create time.

## Risks / Trade-offs

- **[Risk] Performance breakdown on large date listings** → **Mitigation**: Rely strictly on Prisma `.findMany({ where: { status, settledDate: { gte, lte } } })` backed by query-level limits or existing indexing.
