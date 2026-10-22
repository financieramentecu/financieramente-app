---
'financieramente-app': patch
---

### Corregido

- **Productos activos en la configuración:** Al crear una configuración de producto, el selector muestra todos los productos activos de la compañía. Antes solo aparecían los primeros 10, así que productos como «Vida Deudor» no se podían elegir aunque estuvieran activos.

### Técnico

- `fetchAllActiveCompanyProducts()` pages through `GET /api/products?status=active&idCompany=` with `pageSize=100` until `totalPages` is covered. The configuration form no longer relies on the endpoint default of 10 rows.
