# Proposal: CRM Phase 1 — Activities, Agenda & Reminders (on top of `codex/negocios-basic-crm`)

## Intent

Andrés's branch `codex/negocios-basic-crm` (commit `f19b6315`) already ports several features from the reference CRMs: an immutable event timeline (Twenty), tasks (EspoCRM Task / Odoo activities), support cases (EspoCRM / SuiteCRM Cases), lead→business conversion audit (EspoCRM conversion) and a summary report (Odoo pipeline analysis). Phase 0 (menu, CRM page, `LeadStageHistory`, GHL badge) was cherry-picked on top of it.

Phase 1 completes the **activity management** loop that Odoo and EspoCRM provide and that the branch still lacks, **reusing Andrés's model** (`LeadActivity` as an append-only event log, `LeadTask` for scheduled work) instead of introducing a second activity model.

GHL remains the source of truth for synced lead fields. Everything here is CRM-owned data, so it never conflicts with the `crm-sync` webhook.

## Reference mapping

| Feature | Reference | Where it lands |
|---|---|---|
| Log a completed call / meeting / email / WhatsApp | EspoCRM Calls & Meetings, Odoo "Log note / Log activity" | New `LeadActivityType` values, client-submittable |
| Scheduled activity with a type (call, meeting, to-do…) | Odoo `mail.activity` types | `LeadTask.type` |
| "My activities" agenda: overdue / today / upcoming | Odoo Activities view, EspoCRM Activities dashlet | Actividades tab + `/api/crm/tasks` |
| Due reminders | EspoCRM reminders, Odoo deadline notifications | 15-min cron → `Notification` |
| Daily digest | Odoo activity digest | Daily cron → email |
| Stage changes in the timeline | Twenty timeline, Odoo chatter tracking | Read-time merge with `LeadStageHistory` |
| "Stale lead" indicator | Odoo days-in-stage / rotting | `Lead.lastActivityAt` + badge |

## Scope

### In Scope
- `LeadActivityType` += `CALL_LOGGED`, `MEETING_LOGGED`, `EMAIL_LOGGED`, `WHATSAPP_LOGGED`. `leadCrmEventInputSchema` becomes a discriminated union of `NOTE_ADDED` + these four (payload: `summary`, optional `outcome`, `durationMinutes`, `occurredAt`).
- `LeadTask` += `type LeadTaskType` (`TODO`, `CALL`, `MEETING`, `EMAIL`, `WHATSAPP`; default `TODO`) and `reminderSentAt`. Changing `dueAt` resets `reminderSentAt`.
- `Lead` += `lastActivityAt` (CRM-owned), bumped by `appendLeadActivityTx` for user-originated events.
- Timeline merges `LeadStageHistory` rows (kind `STAGE_CHANGED`) at read time; the webhook keeps writing only `LeadStageHistory`.
- `GET /api/crm/tasks?bucket=overdue|today|upcoming|done` — the viewer's agenda.
- Cron `POST /api/leads/cron/task-reminders` (every 15 min) and `POST /api/leads/cron/task-digest` (07:00 Bogotá), Bearer `CRON_SECRET`.
- CRM page: **Actividades** tab enabled behind `crm_tasks`; `?lead=` deep link opens the detail sheet.
- "Sin actividad · N días" badge on open leads (`CRM_INACTIVITY_DAYS`, default 7).
- Cleanup required by `CLAUDE.md`: Andrés's route handlers (`api/leads/[id]/activities|tasks|cases`, `api/crm/tasks|cases/[id]`) import `prisma` directly; move those queries into the feature services.

### Out of Scope
- Sending email/WhatsApp from the CRM (Phase 5). The new types only record what happened outside.
- Changes to support cases and the summary report beyond what the merge needs.
- `crm.*` permissions and `crm_source_of_truth` (Phase 4). Authorization stays on Andrés's `canAccessCrm` / `canManageCrm` + hierarchy scope.

## Flags
- CRM page: `leads_module` (Phase 0).
- Timeline and log types: `crm_timeline`. Tasks, agenda, reminders: `crm_tasks`. Both are Andrés's, default-off.

## Affected modules
`prisma/schema.prisma` + migration + `prisma/ERD.md`; `src/features/leads/{activities,tasks,crm,components,lib,services}`; `src/app/api/{leads,crm}/**`; `src/features/email/lib`; `.github/workflows/deploy-{qa,prod}.yml`; `docker/env.example`, `docs/ENVIRONMENT_VARIABLES.md`.

## Risks
- **Coordination with Andrés:** this branch is based on his unmerged commit. His commit must reach `develop` first (or both go in one PR); any rework on his branch needs a rebase here.
- **Enum additions:** `ALTER TYPE … ADD VALUE` cannot run inside a transaction on older Postgres and cannot be rolled back; Postgres 15 is fine, but rollback leaves the values in place (harmless).
- **Notification noise:** one notification per due task plus one digest; the digest is skipped when empty.

## Rollback
Revert the branch and remove the two crontab lines. The migration is additive (new enum values, a new enum, three nullable/defaulted columns).
