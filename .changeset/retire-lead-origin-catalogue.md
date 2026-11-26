---
'financieramente-app': patch
---

### Corregido

- Los orígenes de lead quedan en el catálogo que ya usaban los negocios. El catálogo duplicado se retiró.

### Técnico

- Added nullable unique `client_origin.code` and copied `lead_origin` rows into `client_origin` without changing existing name, description, or status.
- Copied `lead_origin_assignment` into `lead_client_origin` with `ON CONFLICT DO NOTHING`, then dropped `lead_origin` and `lead_origin_assignment`.
