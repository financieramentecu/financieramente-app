---
'financieramente-app': minor
---

### Agregado

- **Confirmación del Valor de Negocio:** El Analista de Soporte puede corregir el valor del negocio en Venta Efectuada, Emitido y Fondeado. Si cambia ese valor y pulsa Actualizar Negocio, debe confirmar el mensaje de que la acción afectará futuros aportes y liquidaciones. Cancelar no guarda nada. Confirmar guarda el valor y deja trazabilidad con el negocio, el usuario, la fecha y los valores anterior y nuevo.

### Técnico

- Support analysts get a confirmation dialog in the business edit form when `value` changes. `PUT /api/negocios/[id]` writes `BUSINESS_VALUE_CHANGED` with previous and new amounts only for that role.
