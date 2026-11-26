---
'financieramente-app': minor
---

### Agregado

- **Formulario de origen en el prospecto:** El detalle del lead muestra las preguntas y respuestas de la landing, y conserva cada envío como una foto.

### Técnico

- `POST /api/leads/crm-sync` accepts the landing payload (`submissionId`, `landing`, `lead`, `fields`, `utm_source`) from n8n. `utm_source` is also read from the query string. A repeated `submissionId` does not write again. A new submission attaches to an existing lead by document, then email, then phone, without changing stage or CRM-owned fields, and still links the origin pivot. Snapshots live in `lead_form_submission`.
