---
"financieramente-app": patch
---

### Corregido

- Guardar un rol con muchos permisos activos ya no falla por tiempo de espera: los permisos nuevos se guardan en una sola operación.

### Técnico

- `setRolePermissions` inserts new grants with one `createMany`, updates only existing rows, and runs in an interactive transaction with explicit `timeout`/`maxWait` (the Prisma default of 5s was exceeded by 52 sequential writes against a remote database).
