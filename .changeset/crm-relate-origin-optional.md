---
'financieramente-app': patch
---

### Mejorado

- Al relacionar un lead ya no es obligatorio elegir un origen para hacer el match.

### Técnico

- `POST /api/leads/:id/relation` accepts a missing `idClientOrigin` and stores a null origin on `lead_link`.
