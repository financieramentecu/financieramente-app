---
'financieramente-app': minor
---

### Agregado

- Un mismo cliente que entra por otro origen queda como un lead distinto, con el mismo asesor.
- Si los datos no coinciden, en el detalle se puede validar un origen del sistema y relacionar el lead con otro.
- El historial del CRM muestra cuándo ingresó ese lead nuevo.

### Técnico

- Added `lead_link` (`AUTO` | `MANUAL`) and timeline kind `lead_ingress`.
- Form ingest creates a second lead when the person matches and the `client_origin` is new, copying `id_user`.
- `POST /api/leads/[id]/relation` assigns the origin, shares the advisor, and stores the link.
