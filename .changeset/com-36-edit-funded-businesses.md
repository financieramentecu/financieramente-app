---
'financieramente-app': minor
---

### Agregado

- **Editar negocios fondeados:** Quienes ya pueden modificar un negocio emitido (Administrador, Asistente Operativo de Gerencia y Analista de Soporte) ven Editar en las acciones de la lista y pueden corregir los datos de creación de un negocio Fondeado, incluida compañía, producto, plazo y periodicidad. El valor sigue la regla ya habilitada para esos roles. Si el nuevo plazo dejaría por fuera un aporte fondeado, en cartera o pagado, el guardado se rechaza para no perder ese historial.

### Técnico

- The negocios list uses the server role for the edit action, same gate as `EMITIDO`, so Fondeado shows Editar for ADMIN, ASISTENTE_GERENCIA_OPERATIVA and ANALISTA_SOPORTE.
- Privileged roles can edit company, product, term, periodicity, currency and value on a funded business. `PUT /api/negocios/[id]` rebuilds installments only when the count changes, and returns 409 when that rebuild would drop a payment in `FONDEADO`, `EN_CARTERA`, `PAGO_ANTICIPADO` or `CARTERA_PAGADO`. The check locks those rows inside the same transaction. Product-only edits that keep the installment count do not delete payments.
