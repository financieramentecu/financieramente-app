---
"financieramente-app": patch
---

### Corregido

- El selector de Money Strategist al crear un negocio ya no queda bloqueado hasta escribir el documento del cliente: depende solo del permiso de asignación.

### Técnico

- `CoachInfoSection` no longer receives `isBlocked`; the picker is disabled only by `isAgentUser` or `isAgentLocked`.
