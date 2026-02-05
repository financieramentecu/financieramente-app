# Quickstart: Implementación email resumen pre-liquidación

## Objetivo

Después de implementar este plan, al ejecutar una pre-liquidación exitosa cada usuario (agente) con al menos una distribución recibe **un solo correo** con una tabla: una fila por negocio (negocio, valor, comisión).

## Pasos de implementación sugeridos

### 1. Tipos y agrupación (pre-liquidación)

- En `src/features/pre-liquidacion/types/types.ts` (o archivo dedicado), definir:
  - `ResumenFilaPreliquidacion`: `{ idBusiness, nombreNegocio, valorComision, categoriaConcepto? }`
  - `ResumenUsuarioPreliquidacion`: `{ idUser, email, nombreUsuario?, archivoNombre, periodo, filas: ResumenFilaPreliquidacion[] }`
- En `src/features/pre-liquidacion/services/` o `lib/`, implementar:
  - Función que, dado `fileImportId` y el rango de fechas (o lista de `idSettlementCommission` procesados), consulta `ComissionDistribution` con `include` de `settlementCommission.business.user` y de categoría si aplica.
  - Agrupar por `business.user.idUser` y mapear a `ResumenUsuarioPreliquidacion[]`.
  - Tests unitarios con datos mock (array de distribuciones → agrupación esperada).

### 2. Contenido del correo (email)

- En `src/features/email/lib/`, crear p. ej. `preliquidacion-resumen-notification.ts`:
  - Función que recibe `ResumenUsuarioPreliquidacion` y devuelve `{ subject, html, text }` (o llama directamente a `sendEmail` con esos datos).
  - Generar HTML con tabla: Negocio, Valor comisión, Categoría.
  - Usar `sendEmail` del feature email; no bloquear con `await` si se llama desde la orquestación (fire-and-forget).

### 3. Orquestación en procesarPreLiquidacion

- Al final de `procesarPreLiquidacion` (tras actualizar estado del archivo y cuando `registrosProcesados > 0`):
  - Llamar a la función que obtiene `ResumenUsuarioPreliquidacion[]`.
  - Para cada usuario, llamar a la función de envío **sin await** (o en `void fn()` / `Promise.resolve(fn()).catch(log)`).
  - No cambiar el valor de retorno de `procesarPreLiquidacion` por el resultado del envío.

### 4. Variables de entorno

- SendGrid ya configurado: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` (ver `docs/EMAIL_SENDGRID.md`). No se requieren nuevas variables para este plan.

### 5. Tests

- Unit: agrupación de distribuciones por usuario y construcción de `ResumenUsuarioPreliquidacion[]`.
- Unit: generación de HTML (opcional; puede probarse con snapshot o asserts de fragmentos).
- Mock de `sendEmail` en tests de orquestación si se desea verificar “se llamó N veces con estos destinatarios”.

## Archivos a crear/modificar

| Acción | Ruta |
|--------|------|
| Crear/modificar tipos | `src/features/pre-liquidacion/types/types.ts` |
| Crear función agrupación | `src/features/pre-liquidacion/services/` o `lib/` |
| Crear notificación email | `src/features/email/lib/preliquidacion-resumen-notification.ts` |
| Modificar orquestación | `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` |
| Tests | `src/features/pre-liquidacion/__tests__/` y opcional `src/features/email/__tests__/` |

## Orden recomendado

1. Tipos + función de agrupación + tests.  
2. Función de contenido del correo (HTML) + envío.  
3. Integración en `procesarPreLiquidacion` (fire-and-forget).  
4. Prueba manual con un archivo de pre-liquidación y revisión de correos recibidos.
