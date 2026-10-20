---
name: financieramente-codereview
description: "Trigger: review de PR, revisar pull request, code review, PR ready to merge, mezclar PR. Reviews a financieramente-app PR against its real base branch, checks fit with this repo's architecture/SOLID/Next.js/React rules, runs tests and lint, and reports a merge verdict."
license: Apache-2.0
metadata:
  author: "johnagudelo"
  version: "1.0"
---

# Financieramente Code Review

## Activation Contract

Load when asked to review a pull request of **this repo** (financieramente-app): a PR URL/number, "revisar PR", "code review", or "¿se puede mezclar esto?". Not for ad-hoc file review outside a PR context.

## Hard Rules

- You are a senior reviewer producing a **report**. Never edit code, never merge, never post PR comments until the user explicitly accepts.
- Rules come from **this repo only**: `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`, `docs/`. Never import another product's conventions.
- Diff is computed against the PR's **actual base branch**, never `main`/`develop` by habit: `gh pr diff <number>` or `git diff origin/<base>...origin/<head>` (three dots — see [references/hosts.md](references/hosts.md)).
- Judge impact from the **base branch**'s code around the diff (callers, hooks, services, shared Context/cache, styles) — the patch alone never proves regression or safety.
- Apply only the stack skills this repo actually uses for the touched area: `react-19`, `typescript`, `nextjs-16`, `screaming-architecture` (see project skill `financieramente`). Never demand Redux/MUI/patterns the repo doesn't have.
- Enforce this repo's architecture rules from `CLAUDE.md`: SOLID, Feature-Based/Screaming Architecture, actions-call-services (never Prisma in actions/routes/components), soft delete only (no `.delete()`), `logAuditEvent` on mutations, `AsyncState<T>` in async hooks, Bogotá date helpers for business dates.
- A failing unit test on touched code is always **Crítico** — never claim coverage you didn't run.
- No Medio/Bajo finding is ever posted as a PR comment.

## Decision Gates

| Severidad | Cuándo |
|---|---|
| Crítico | Rompe producción/seguridad/datos o funcionalidad existente de la base; test unitario de lo tocado falla. |
| Alto | Error funcional, contrato roto, regla de `CLAUDE.md` violada (capas, soft delete, audit log, fechas), alcance del PR sin cubrir. |
| Medio | Lógica de negocio en el componente, estado duplicado, hook con 2+ responsabilidades, función compleja, nombre opaco, re-render evitable, DRY real. |
| Bajo | Limpieza menor, lint warning no bloqueante. |

## Execution Steps

1. Resolve host/owner/repo/number from the given PR reference (see [references/hosts.md](references/hosts.md)).
2. Read PR title, description, `head` and `base` branch.
3. Get the diff against that exact `base` (three-dot). If huge, say so, prioritize what can break existing screens/state/data, and declare what was left out.
4. In the base branch, read the code the diff touches and its callers/hooks/services/shared state (Grep/codegraph, not the patch alone).
5. Load project context only for the touched paths: index files first (`AGENTS.md`, `CLAUDE.md`), then the matching `docs/` page or `.cursor/rules/` glob, stopping once it covers the diffed files.
6. Run `npm run test:unit` (or the scoped test command for touched files). Any failing test on touched code → Crítico.
7. Run `npm run lint` and `npm run type-check` on the diff; map ESLint errors / `tsc` errors to Alto, warnings to Bajo — never report a result you didn't actually run.
8. Write the report per [references/report-format.md](references/report-format.md).
9. If there is ≥1 Crítico/Alto, close with: "¿Agrego al PR los comentarios de los hallazgos Crítico y Alto para su revisión?" and STOP. Otherwise state the merge verdict and don't ask.
10. Only on explicit acceptance, post one comment per Crítico/Alto finding using the host commands in [references/hosts.md](references/hosts.md); anchor to file:line in the diff, else a general PR comment. Never approve/request-changes formally — comment only.

## Output Contract

Return, in the user's language: the PR summary (2–4 lines: URL, repo, `head→base`, scope fit), then the verdict line (merge or not, impact on existing code, counts by severity), then findings most-severe-first using the template in [references/report-format.md](references/report-format.md). End with the accept/decline question only when Crítico/Alto findings exist.

## References

- [references/report-format.md](references/report-format.md) — finding template and severity rubric.
- [references/hosts.md](references/hosts.md) — `gh` CLI commands for PR metadata, diff, and comments.
