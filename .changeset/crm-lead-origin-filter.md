---
'financieramente-app': minor
---

### Agregado

- CRM: filtro **Origen del lead** en el pipeline y en la tabla de leads. Se puede elegir uno o varios orígenes del catálogo de clientes y se ven las tarjetas que entraron por alguno de ellos.

### Técnico

- Migration `20261120143000_add_lead_client_origin`: pivot `lead_client_origin` between `lead` and the existing `client_origin` catalogue (`unique (id_lead, id_client_origin)`, soft unlink via `active=false`).
- `utm_source` matches `client_origin.name` through the same normalization as `normalizeUtmSource`.
- `GET /api/crm/origins` lists active `client_origin` rows for signed-in CRM users.
- `GET /api/leads` and the lead table query accept repeated `origin` params and filter through the pivot. The table also applies them to CSV export and saved views.
