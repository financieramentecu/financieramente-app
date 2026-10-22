---
'financieramente-app': minor
---

### Agregado

- **Editar negocios fondeados:** Quienes ya pueden modificar un negocio emitido (Administrador, Asistente Operativo de Gerencia y Analista de Soporte) pueden abrir la edición de un negocio en estado Fondeado y corregir los mismos datos del formulario: cliente, contrato, compañía, producto, plazo, periodicidad, moneda y valor.

### Técnico

- Funded businesses use the same list edit gate as `EMITIDO` (`canEditContractWhenBusinessEmitido`) and the same financial-field permissions; `FONDEADO` no longer forces those fields read-only.
- `PUT /api/negocios/[id]` already accepted funded updates for privileged roles; colocated tests cover admin success and agent rejection.
