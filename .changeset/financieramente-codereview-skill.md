---
'financieramente-app': patch
---

### Técnico

- New project + global skill `financieramente-codereview`: reviews a PR against its real base branch (three-dot diff), reads base-branch callers/hooks/services for impact, applies this repo's architecture/SOLID/soft-delete/audit-log rules and the matching stack skills (`react-19`, `typescript`, `nextjs-16`), runs `test:unit` and `lint`/`type-check`, and reports a severity-ranked merge verdict. Files: `skills/financieramente-codereview/SKILL.md`, `skills/financieramente-codereview/references/report-format.md`, `skills/financieramente-codereview/references/hosts.md`. Registered in `AGENTS.md`.
