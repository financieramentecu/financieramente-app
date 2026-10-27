---
'financieramente-app': patch
---

### Corregido

- **Productos activos en la configuración:** Al crear una configuración de producto, el selector muestra los productos activos de una compañía activa. Antes solo aparecían los primeros 10, así que productos como «Vida Deudor» no se podían elegir aunque estuvieran activos. Un producto activo de una compañía inactiva no entra en la lista.

### Técnico

- `fetchAllActiveCompanyProducts()` pages through `GET /api/products?eligible=true&idCompany=` with `pageSize=100` until `totalPages` is covered. `eligible=true` requires both `product.status` and `company.status`. The configuration form no longer relies on the endpoint default of 10 rows.
