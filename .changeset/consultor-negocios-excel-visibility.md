---
'financieramente-app': minor
---

### Agregado

- **Consultor puede exportar la Lista de Negocios a Excel:** El rol Consultor mantiene solo lectura (sin crear, editar ni eliminar), pero ahora puede descargar el Excel de negocios con los mismos filtros aplicados en pantalla. Las exportaciones del Dashboard y de Reportes siguen bloqueadas.

### Corregido

- **Consultor no veía negocios en el listado ni en el Excel:** La vista de Negocios y la exportación acotaban al Consultor a su propio usuario, dejando el listado vacío. Ahora ve todos los negocios (cualquier nivel y cualquier persona), y el Excel refleja exactamente ese mismo conjunto respetando los filtros de pantalla.

### Técnico

- `canExportBusinessList()` allows `UserRole.CONSULTOR` before the generic read-only block; Dashboard/Reportes keep using `isReadOnlyRole` to deny their downloads.
- `buildBusinessListWhere()` scopes via `isGlobalVisibilityRole()` so CONSULTOR is not restricted to `idUser` (list + `POST /api/negocios/export` share the same WHERE).
- Role description and seed updated; colocated route/lib tests cover CONSULTOR global visibility and Excel export authorization.
