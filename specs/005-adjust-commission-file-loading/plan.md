## Summary

Adjust the file upload and commission distribution engine to handle "Voluntarias" and "Polizas" files. The solution implements a dynamic hierarchical calculation where percentages for Coach, Leader, and Agency are fetched from DB configuration tables. Calculations apply common tax discounts (12%) and retention clawbacks (10% for policies). It also handles "claw" type records to subtract from user reserve balances.

## Technical Context

**Language/Version**: TypeScript 5.8, Next.js 15  
**Primary Dependencies**: Prisma, Zod, XLSX, Shadcn/UI  
**Storage**: PostgreSQL (Prisma ORM)  
**Testing**: Vitest (Unit/Integration), Playwright (E2E)  
**Target Platform**: Web (Next.js App Router)
**Project Type**: Web Application  
**Performance Goals**: Batch process >1k Excel records per minute; <200ms latency for pre-liquidation summaries.  
**Constraints**: Hierarchical integrity (Leader based on Coach Bruta), dynamic discount/percentage lookups (no hardcoding).  
**Scale/Scope**: Handling monthly commission increments across ~50 agents and multiple business origins.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Requirement | Context |
|------|-------------|---------|
| Screaming Architecture | Logic in `src/features/pre-liquidacion` | All new formulas and hierarchy resolution MUST be domain-contained. |
| SOLID | Dependency Inversion for Calc | Calculation services MUST be injected or use factory patterns for testability. |
| Strict Types | Readonly Domain Types | All distribution results MUST use immutable interfaces. |
| Validation | Zod schemas for Excel | Every imported row MUST be validated before processing. |
| Separation | Hook-based logic | UI components (CargarArchivoTab) MUST NOT contain calculation logic. |

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
