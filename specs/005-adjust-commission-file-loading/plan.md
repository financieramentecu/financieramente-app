# Implementation Plan: 005-adjust-commission-file-loading

**Branch**: `005-adjust-commission-file-loading` | **Date**: 2026-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/005-adjust-commission-file-loading/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary
Adjust the file upload and commission distribution engine to handle "Voluntarias" and "Polizas" files. The solution implements a dynamic hierarchical calculation where percentages for Coach, Leader, and Agency are fetched from DB configuration tables. This plan includes a table refactor of `Discount` to `CommissionConfiguration` to host dynamic `discountPercentage` (12% office tax) and `clawbackPercentage` (10% retention, strictly for Polizas), and uses **3-decimal rounding** across calculations.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.8, Next.js 15
**Primary Dependencies**: Prisma, Zod, XLSX, Shadcn/UI
**Storage**: PostgreSQL (Prisma ORM)
**Testing**: Vitest (Unit/Integration), Playwright (E2E)
**Target Platform**: Web (Next.js App Router)
**Project Type**: Web Application
**Performance Goals**: Batch process >1k Excel records per minute; <200ms latency for pre-liquidation summaries.
**Constraints**: Hierarchical integrity (Leader based on Coach Bruta), dynamic discount/percentage lookups. **Standard Rounding to 3 decimals (Half-Up)**.
**Scale/Scope**: Handling monthly commission increments across ~50 agents and multiple business origins.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/005-adjust-commission-file-loading/
├── spec.md              # Requirements and clarifications
├── plan.md              # This file
├── data-model.md        # DB Entity definitions
├── clawback-flow.md     # Logic for retentions/adjustments
├── research.md          # Key technical decisions
├── contracts/           # API Definitions
└── tasks.md             # Actionable engineering tasks
```

### Source Code (Screaming Architecture)

```text
src/features/pre-liquidacion/
├── components/           # UI for summary and progress
├── hooks/                # Data fetching and state
├── lib/                  # Business logic & services
│   ├── calculation-engine.ts
│   ├── hierarchy-resolver.ts
│   └── excel-parser.ts
├── types/                # Domain specific types
└── __tests__/             # Unit/Integration tests

src/app/api/
├── carga-archivos/       # Entry point for imports
└── pre-liquidacion/      # Entry point for calculations
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
