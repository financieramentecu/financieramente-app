# Spec: Email con resumen de pre-liquidación por usuario

**Feature**: 003-email-resumen-preliquidacion  
**Fecha**: 2026-01-27

## Resumen

Cuando se ejecuta una pre-liquidación, el sistema debe enviar un correo electrónico a cada usuario (agente) que participa en la distribución de comisiones. El correo debe contener un **resumen por usuario**: si un usuario tiene varias pre-liquidaciones en diferentes negocios dentro del mismo flujo (misma ejecución), todas deben ir en **un solo correo** para ese usuario, con filas por negocio (ej.: Negocio 1 | valor | comisión — Fila 1; Negocio 2 | valor | comisión — Fila 2).

## Requisitos funcionales

1. **Disparo**: Al finalizar correctamente `procesarPreLiquidacion` (archivo + rango de fechas), se debe orquestar el envío de correos.
2. **Agrupación por usuario**: Agrupar todas las distribuciones de comisión generadas en esa ejecución por `idUser` (agente del negocio: `SettlementCommission -> Business -> User`).
3. **Un correo por usuario**: Enviar exactamente un correo por usuario que tenga al menos una distribución en esa ejecución.
4. **Contenido del correo**: Resumen con:
   - Identificación del archivo / periodo de pre-liquidación.
   - Tabla (o lista) por negocio: nombre/identificador del negocio, valor de comisión (bruta/final según criterio de negocio), y línea de comisión asociada (categoría o concepto), una fila por negocio del usuario en ese flujo.
5. **Integración con email existente**: Usar el feature `src/features/email` (SendGrid, `sendEmail` o `sendTemplatedEmail`) y la arquitectura por dominios (pre-liquidación en `src/features/pre-liquidacion`, email en `src/features/email`).

## Requisitos no funcionales

- No bloquear la respuesta de la API de pre-liquidación: el envío de correos puede ser asíncrono (queue, job en background o fire-and-forget según stack).
- Reutilizar tipos y servicios existentes (pre-liquidacion.service, email.service).
- Tests unitarios para la lógica de agrupación por usuario y construcción del resumen; opcional integración con el servicio de email (mock).

## Alcance técnico

- **Pre-liquidación**: Ya existe `procesarPreLiquidacion` en `src/features/pre-liquidacion/services/pre-liquidacion.service.ts`; crea registros en `ComissionDistribution` vinculados a `SettlementCommission` -> `Business` -> `User`.
- **Email**: Ya existe `src/features/email` con `sendEmail`, `sendTemplatedEmail`, y tipos en `email.types.ts`.
- **Nuevo**: Servicio o función en el dominio de pre-liquidación (o en email como “notificaciones de pre-liquidación”) que:
  - Reciba el resultado de la pre-liquidación (fileImportId, rango, lista de ids de distribuciones creadas o suficiente contexto para consultarlas).
  - Agrupe por usuario (idUser / email).
  - Construya el cuerpo del correo (HTML o texto) con la tabla por negocio.
  - Invoke el servicio de email una vez por usuario.

## Criterios de aceptación

- [x] Tras una pre-liquidación exitosa, cada usuario con al menos una distribución recibe exactamente un correo.
- [x] El correo incluye el resumen del archivo/periodo y una tabla (o lista) con una fila por negocio: negocio, valor, comisión/categoría.
- [x] Si un usuario tiene varios negocios en la misma ejecución, todas las filas aparecen en el mismo correo.
- [x] El envío no bloquea la respuesta HTTP de la API de pre-liquidación (asíncrono o en background).
- [x] La lógica de agrupación y construcción del resumen tiene tests unitarios.
