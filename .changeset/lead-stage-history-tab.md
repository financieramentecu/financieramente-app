---
'financieramente-app': patch
---

### Mejorado

- **Historial del lead:** La pestaña Historial muestra la línea de tiempo de lo que ha pasado con el lead.

### Técnico

- `GET /api/leads/[id]/stage-history` derives stage stays from `lead_stage_history` via `buildStageStays`.
