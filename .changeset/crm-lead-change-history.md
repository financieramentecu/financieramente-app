---
'financieramente-app': patch
---

### Agregado

- El historial del lead muestra cada cambio de Money Strategy y de origen. Si lo hizo el sistema, el historial dice Sistema.

### Corregido

- El historial nombra la relación entre leads. El selector de Money Strategy muestra el asesor que ya tiene el lead.

### Técnico

- Migration `20261120180000_add_lead_change_history`: append-only `lead_change_history` (`OWNER` | `ORIGIN`, `SYSTEM` | `MANUAL`). The CRM timeline merges these rows with activities, stage changes, and ingress.
