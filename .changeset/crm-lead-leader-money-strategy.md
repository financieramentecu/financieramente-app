---
'financieramente-app': patch
---

### Corregido

- Cambiar el Money Strategy y relacionar un lead solo lo ve un admin o quien tiene Money Strategies a cargo.
- La lista de Money Strategy se puede buscar y solo deja elegir uno.

### Técnico

- `PATCH /api/leads/:id/owner` and `POST /api/leads/:id/relation` return 403 unless the actor is `ADMIN` or has someone else in their hierarchy.
- Money Strategy picker uses a single-value searchable select.
