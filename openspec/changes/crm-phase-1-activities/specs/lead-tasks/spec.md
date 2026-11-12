# Lead Tasks Specification (delta over `codex/negocios-basic-crm`)

## ADDED Requirements

### Requirement: Task Type

`LeadTask` MUST have `type` (`TODO` | `CALL` | `MEETING` | `EMAIL` | `WHATSAPP`, default `TODO`).

### Requirement: Agenda

`GET /api/crm/tasks?bucket=` MUST return the viewer's own (`assignedTo = viewer`) tasks on active leads, using America/Bogota days:
- `overdue`: OPEN, `dueAt` before today
- `today`: OPEN, `dueAt` within today
- `upcoming`: OPEN, `dueAt` within the next 14 days or null
- `done`: DONE, completed in the last 7 days

It MUST be gated by `crm_tasks` (404 when off) and `canAccessCrm` (403).

#### Scenario: Overdue task
- GIVEN an OPEN task assigned to the viewer due yesterday
- WHEN `bucket=overdue` is requested
- THEN the task SHALL be returned with the lead's id and display name

### Requirement: Due Reminder

A cron job (Bearer `CRON_SECRET`, constant-time compare, else 401) MUST notify the assignee once per OPEN task whose `dueAt <= now` and `reminderSentAt` is null: claim the task by setting `reminderSentAt`, then create a `Notification` with callback `/dashboard/negocios/crm?tab=actividades&lead={idLead}` and push it over SSE. Changing `dueAt` MUST reset `reminderSentAt` to null.

#### Scenario: Overlapping runs
- GIVEN one due task
- WHEN two job runs execute concurrently
- THEN exactly one notification SHALL exist

#### Scenario: Missed run
- GIVEN the job did not run for 2 hours
- WHEN it runs
- THEN every task that became due in that window SHALL be notified

### Requirement: Daily Digest

A daily job (07:00 Bogotá) MUST email each active user with OPEN overdue or today's tasks a grouped list with a link to the Actividades tab. Users with none SHALL receive nothing; one failed email MUST NOT stop the rest.
