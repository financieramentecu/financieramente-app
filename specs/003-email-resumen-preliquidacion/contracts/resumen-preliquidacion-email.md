# Contract: Resumen pre-liquidación por email

## Responsabilidades

- **Pre-liquidación**: Tras una ejecución exitosa de `procesarPreLiquidacion`, obtiene las distribuciones creadas, las agrupa por usuario y llama a “enviar resumen por usuario” (fire-and-forget).
- **Email**: Expone una función que recibe “resumen por usuario” (destinatario, asunto, cuerpo HTML/texto) y llama a `sendEmail`.

## Entrada a la función de envío (por usuario)

La función que **construye y envía** un correo de resumen recibe:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `to` | string | Email del usuario (destinatario). |
| `nombreUsuario` | string (opcional) | Nombre para saludo. |
| `archivoNombre` | string | Nombre del archivo de pre-liquidación. |
| `periodo` | string | Ej. "2024-01" o "01/01/2024 - 31/01/2024". |
| `filas` | Array de `{ nombreNegocio, valorComision, categoriaConcepto? }` | Una fila por negocio del usuario en esa ejecución. |

## Salida

- Envío vía `sendEmail({ to, subject, html, text? })` del feature `email`.
- No se espera resultado en la llamada (fire-and-forget); errores se registran (log/console o futuro sistema de errores).

## Asunto sugerido

Ejemplo: `Resumen de pre-liquidación: [archivoNombre] - [periodo]`

## Cuerpo

- HTML: tabla con columnas: Negocio, Valor comisión, Categoría/Concepto (opcional).
- Incluir cabecera con archivo y periodo; pie con nombre de la aplicación.

## Dependencias

- `src/features/email`: `sendEmail`, tipos `SendEmailParams`, `EmailResult`.
- `src/features/pre-liquidacion`: datos de distribuciones y agrupación por usuario; no depende del feature email en tipos de dominio (solo en la capa de orquestación que invoca envío).
