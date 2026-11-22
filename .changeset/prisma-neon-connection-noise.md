---
'financieramente-app': patch
---

### Corregido

- La sesión sigue activa cuando la base de datos cierra una conexión inactiva y la vuelve a abrir.

### Técnico

- Prisma connection-close noise from Neon (`kind: Closed`, SQLSTATE `57P01`) is not printed.
- Session revalidation retries once on `P1001` and `P1017`.
- In development, a Neon database gets a keepalive query so the compute does not suspend while the dev server is open.
