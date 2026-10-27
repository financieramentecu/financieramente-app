---
'financieramente-app': minor
---

### Agregado

- **Editar negocios fondeados:** Quienes ya pueden modificar un negocio emitido (Administrador, Asistente Operativo de Gerencia y Analista de Soporte) pueden corregir cliente, contrato, moneda y valor de un negocio Fondeado. Compañía, producto, plazo y periodicidad siguen bloqueados cuando ya hay aportes fondeados, en cartera o pagados, para no perder ese historial.

### Técnico

- Funded businesses use the same list edit gate as `EMITIDO`. Privileged roles can edit value and currency; company, product, term and periodicity stay read-only in the form.
- `PUT /api/negocios/[id]` returns 409 when a funded business with payments in `FONDEADO`, `EN_CARTERA`, `PAGO_ANTICIPADO` or `CARTERA_PAGADO` changes term, periodicity, product or installment count. The check locks those payment rows inside the same transaction as the rebuild, so a concurrent funding transition cannot land between the count and `deleteMany`. Premium-only updates do not rebuild payments.
