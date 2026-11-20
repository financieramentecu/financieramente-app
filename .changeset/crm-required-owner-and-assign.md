---
'financieramente-app': minor
---

### Agregado

- En el detalle del lead del pipeline hay una acción **Asignar lead**. Muestra los asesores de tu jerarquía y deja elegir uno.

### Mejorado

- El correo del asesor (`ownerEmail`) es obligatorio al recibir un lead. Si no coincide con un usuario activo, el lead queda sin asesor.

### Técnico

- `crmSyncPayloadSchema` and `formSubmissionSchema` require a non-empty `ownerEmail`. An unmatched value still stores the lead with `id_user` null.
- `PATCH /api/leads/[id]/owner` assigns an active in-scope advisor and audits `LEAD_OWNER_ASSIGNED`.
