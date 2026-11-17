---
'financieramente-app': minor
---

### Agregado

- CRM: administración guarda los días de anticipación de las tareas. Con ese plazo, el asesor recibe un aviso dentro de la aplicación antes del vencimiento.
- CRM: el día del vencimiento el aviso llega en la aplicación, con la tarea, la fecha y el acceso al detalle.

### Mejorado

- CRM: el correo de la mañana incluye solo las tareas vencidas que siguen pendientes. Las de hoy y las próximas no se envían por correo. Las tareas completadas no generan aviso.

### Técnico

- `crm_notification_setting` stores anticipation days (0–30, default 1). `lead_task.advance_notified_at` claims the upcoming in-app notice; `reminder_sent_at` claims the day-of notice.
- `GET`/`PUT /api/crm/notification-settings` (CRM managers, `crm_tasks`). Cron `task-reminders` notifies today and the anticipation window; `task-digest` emails overdue open tasks once a day at 07:00 Bogotá.
- In development, `next dev` runs the in-app reminder job on startup and every 15 minutes. The digest email stays on the external crontab.
- In development, when `SENDGRID_API_KEY` is empty, `sendEmail` delivers to a free Ethereal inbox and logs a preview URL.
