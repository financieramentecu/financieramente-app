---
'financieramente-app': patch
---

### Corregido

- Si el mismo cliente entra por el CRM con otro origen, queda una ficha nueva referenciada a la del formulario y conserva el Money Strategy.

### Técnico

- `upsertLeadFromCrm` matches document, then email, then phone. A new `client_origin` writes `lead_link` with source `AUTO` and keeps the existing `id_user`.
