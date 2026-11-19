---
'financieramente-app': minor
---

### Agregado
- CRM: registrar llamadas, reuniones, emails y mensajes de WhatsApp en el timeline del lead, con resultado del contacto.
- CRM: el timeline del lead muestra también los cambios de etapa del embudo (GHL, importación CSV o manual).
- CRM: pestaña **Actividades** con las tareas propias vencidas, de hoy, próximas y completadas, y botón para completarlas.
- CRM: tareas con tipo (tarea, llamada, reunión, email, WhatsApp) y fecha de vencimiento en hora de Bogotá.
- CRM: recordatorio en la app cuando vence una tarea y resumen diario por email a las 7:00 a. m.
- CRM: aviso "Sin actividad · N días" en los leads abiertos sin seguimiento reciente.

### Mejorado
- CRM: las notificaciones abren directamente la ficha del lead en la pestaña Actividades.

### Técnico
- Migration `20261109120000_extend_lead_activity_and_task`: `LeadActivityType` += `*_LOGGED`, new enum `LeadTaskType`, `lead_task.type`, `lead_task.reminder_sent_at`, `lead.last_activity_at` (+ indexes).
- New `requireCrmActor` guard (`src/lib/auth/require-crm-actor.ts`) and CRM command services; CRM route handlers no longer call Prisma and every CRM mutation is audited (`LEAD_ACTIVITY_*`, `LEAD_TASK_*`, `LEAD_SUPPORT_CASE_*`).
- New endpoints: `GET /api/crm/tasks?bucket=`, `PATCH /api/crm/tasks/[id]` `reschedule` action, cron `POST /api/leads/cron/task-reminders` and `POST /api/leads/cron/task-digest` (wired into QA/prod crontabs).
- `verifyCronSecret` extracted to `src/lib/auth/verify-cron-secret.ts` and reused by `fund-payments`.
- Optional env `CRM_INACTIVITY_DAYS` (default 7).
