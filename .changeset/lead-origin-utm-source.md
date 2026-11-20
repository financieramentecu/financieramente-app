---
'financieramente-app': minor
---

### Agregado

- **Origen del lead en el CRM:** El webhook de leads guarda el origen que llega en `utm_source` y lo asigna como etiqueta del lead.

### Técnico

- `POST /api/leads/crm-sync` accepts `utm_source` in the JSON body or as a query parameter. The value is normalized into `lead_origin.code`, created when missing, and linked through `lead_origin_assignment`. The catalogue name is copied to `lead.origin_tag`. An inactive origin is not reactivated and does not reject the webhook.

- Landing forms on `crm-sync` reuse the validated contract, snapshot table, UI and idempotent ingestion from #423. The existing `form-submissions` endpoint remains compatible; only the origins migration is added here. Source assignment and the snapshot commit together.
