---
'financieramente-app': minor
---

### Agregado

- El detalle del prospecto muestra las respuestas del formulario de la landing de origen, con su etiqueta. Un formulario distinto se ve sin cambiar el CRM.
- Si una respuesta viene vacía, el detalle dice «Sin información». El 0 y el No se muestran tal cual.

### Técnico

- `POST /api/leads/form-submissions` accepts the n8n contract (`x-api-key`, same as crm-sync). Invalid keys (401) and rate-limited requests (429) never write to Postgres. Body validation failures within the authenticated rate limit audit `LEAD_FORM_SUBMISSION_REJECTED` without creating a lead or snapshot.
- `lead_form_submission` stores one snapshot per `submission_id`. A known prospect only gains a snapshot. A new prospect is created in one transaction with stage source `LANDING_FORM`.
