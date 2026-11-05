---
'financieramente-app': patch
---

### Corregido

- Ya no es posible tener dos descuentos activos del mismo tipo (Impuesto o Clawback) aunque dos personas los creen al mismo tiempo; el segundo intento recibe un aviso claro.

### Técnico

- Migration `20261105160000_commission_discount_one_active_per_type`: partial unique index `UNIQUE(type) WHERE status = 'ACTIVE'` on `commission_discount`, with a pre-check that aborts with a readable error if duplicated ACTIVE rows exist.
- `POST /api/admin/discounts` maps Prisma `P2002` to 409. No schema model change (the index is SQL-only).
