---
'financieramente-app': patch
---

### Técnico

- Document the `develop → qa → main` release flow and require PRs for `develop`, `qa` and `main` in `CLAUDE.md` and `.cursor/rules/RELEASE.md`.
- Replace obsolete `master` and direct `git push` instructions with the PR flow in `docs/INFRASTRUCTURE.md`, `docs/PRISMA_CHANGES.md`, `docs/PRISMA_MIGRATIONS.md` and `docs/DATABASE_CONNECTION.md`.
- Update the `release:version` next-steps output in `scripts/release/consolidate-changelog.ts` to the `develop → qa → main` sequence.
