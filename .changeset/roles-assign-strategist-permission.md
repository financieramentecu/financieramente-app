---
"financieramente-app": minor
---

### Agregado

- Nuevo permiso "Asignar el Money Strategist al crear un negocio" en el módulo Negocios: un rol con alcance Compañía puede elegir a cualquier Money Strategist al crear un negocio, sin depender del alcance de "Ver negocios".

### Técnico

- `negocios.asignar_strategist` (scoped) added to the catalog with defaults `C C C E - P`; `resolveBusinessOwnerId` now decides the owner from it (COMPANY any user, TEAM within self plus subordinates, OWN or no grant forces the session user) and `useAgentPermissions` unlocks the picker only for COMPANY. Run `npm run prisma:seed:permissions` per environment to add the code.
