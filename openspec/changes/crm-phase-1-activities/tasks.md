# Tasks: CRM Phase 1 — Activities, Agenda & Reminders

Strict TDD: every RED test is written and seen failing before its GREEN implementation.

## Phase 0: Base
- [x] 0.1 Branch `feature/crm-on-basic-crm` from `codex/negocios-basic-crm`; cherry-pick Phase 0 (`05f96a78` → `9b11e16a`), conflicts resolved in `schema.prisma` and `lead-detail-sheet`.
- [ ] 0.2 Agree with Andrés how his commit reaches `develop` (his PR first, or one combined PR).

## Phase 1: Cleanup of existing routes (behavior unchanged)
- [x] 1.1 Extract the shared guard (`src/lib/auth/require-crm-actor.ts`) + test.
- [x] 1.2 Move Prisma queries out of `api/leads/[id]/{activities,tasks,cases}` and `api/crm/{tasks,cases}/[id]` into services; existing route tests stay green.
- [x] 1.3 Extract `src/lib/auth/verify-cron-secret.ts`; migrate `fund-payments`.

## Phase 2: Schema
- [x] 2.1 Migration `extend_lead_activity_and_task`: 4 `LeadActivityType` values, `LeadTaskType`, `LeadTask.type`, `LeadTask.reminderSentAt`, `Lead.lastActivityAt` + indexes; `prisma generate`.
- [x] 2.2 `prisma/ERD.md`: Andrés's models (missing today) + Phase 1 additions.

## Phase 3: Logged activities
- [x] 3.1 RED/GREEN `lead-crm-event.schema.test.ts` — union of 5 client types; `occurredAt` not in the future; lifecycle types rejected.
- [x] 3.2 RED/GREEN `lead-activity.service.test.ts` — `lastActivityAt` bump only for counting types and only when newer.
- [x] 3.3 RED/GREEN route test — POST `CALL_LOGGED` 201; CONSULTOR 403; out of scope 404.

## Phase 4: Timeline with stage changes
- [x] 4.1 RED/GREEN `merge-timeline.test.ts` — order, ties, new cursor, legacy cursor accepted.
- [x] 4.2 RED/GREEN `lead-timeline.service.test.ts`.
- [x] 4.3 RED/GREEN `lead-activity-timeline.test.tsx` — `STAGE_CHANGED` and `*_LOGGED` rendering.

## Phase 5: Tasks, agenda, reminders
- [x] 5.1 RED/GREEN `lead-task.schema.test.ts` — `type`.
- [x] 5.2 RED/GREEN `lead-task.service.test.ts` — `dueAt` change resets `reminderSentAt`.
- [x] 5.3 RED/GREEN `agenda-bucket-range.test.ts` (Bogotá boundaries) and `lead-task-agenda.service.test.ts`.
- [x] 5.4 RED/GREEN `GET /api/crm/tasks` route test.
- [x] 5.5 RED/GREEN `lead-task-reminder.service.test.ts` — once only, overlapping runs, catch-up, failure isolation.
- [x] 5.6 Digest template + test; cron route tests (401, summary).

## Phase 6: UI
- [ ] 6.0 Mockup "CRM — Actividades" in `Financiera.pen`; sign-off.
- [x] 6.1 "Registrar actividad" type selector in the detail sheet + test.
- [x] 6.2 Task type selector + test.
- [x] 6.3 `ActivitiesAgenda` + hook (`AsyncState<T>`) + tests; enable tab behind `crm_tasks`.
- [x] 6.4 `?tab=` / `?lead=` deep link + test.
- [x] 6.5 `InactivityBadge` + server-computed `inactiveDays` on board cards and lead detail + tests.

## Phase 7: Ops, docs, verify
- [x] 7.1 Crontab lines in `deploy-qa.yml` / `deploy-prod.yml`.
- [x] 7.2 `CRM_INACTIVITY_DAYS` and `LOCAL_CRM_FEATURE_FLAGS` documented in `docker/env.example` and `docs/ENVIRONMENT_VARIABLES.md`.
- [x] 7.3 Changesets `crm-phase-1-activities.md` and `crm-basic-timeline-tasks-cases.md` (Andrés's base, which had none).
- [x] 7.4a `npm run type-check`, `lint`, `test:unit` (612 files, 5731 tests).
- [ ] 7.4b `test:integration` and Playwright smoke against a disposable database (not run: the configured databases are remote Neon instances).
