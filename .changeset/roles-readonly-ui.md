---
"financieramente-app": patch
---

### Corregido

- Quien puede ver los roles pero no gestionarlos ya no ve los botones "Crear rol", "Desactivar" ni "Guardar cambios": las pantallas de Roles quedan en solo lectura con un aviso.

### Técnico

- `RolesManager` and `RoleEditor` read `roles.gestionar` through `usePermissions()`; `readOnly = locked || !can('roles.gestionar')` hides write controls and disables switches and selects.
