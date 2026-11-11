---
"financieramente-app": patch
---

### Corregido

- Se corrige el fallo del despliegue (build de la imagen) causado por la página de columnas del embudo de leads.

### Técnico

- `dashboard/admin/lead-funnel-columns/page.tsx` exports `dynamic = 'force-dynamic'`: it queries Prisma directly and, since `DashboardRootLayout` stopped calling `auth()`, Next.js prerendered it at build time without `DATABASE_URL`.
