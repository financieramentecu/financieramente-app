# Data Model: Email resumen pre-liquidación

No se introducen nuevas tablas. Se reutilizan entidades existentes y se definen **tipos en memoria** para el resumen por usuario.

## Entidades existentes involucradas

| Entidad | Uso |
|--------|-----|
| **FileImport** | Archivo y periodo de la pre-liquidación; nombre, fechas para el asunto/cuerpo del correo. |
| **SettlementCommission** | Registro de comisión por negocio; enlace a Business. |
| **ComissionDistribution** | Líneas de distribución (valor bruto, final, descuento); creadas por `procesarPreLiquidacion`. |
| **Business** | Negocio; nombre/identificador para cada fila del resumen. |
| **User** | Agente; agrupación por `idUser`; `email` como destinatario. |
| **ProductPercentajeCommisionCategory** | Opcional: nombre de categoría para la columna “comisión/categoría” en la tabla. |

## Relación para agrupación

```text
ComissionDistribution
  -> settlementCommission (SettlementCommission)
       -> business (Business)
            -> user (User)  [idUser, email]
```

Para cada ejecución de pre-liquidación (mismo `idFileImport` + rango de fechas), se consultan las `ComissionDistribution` recién creadas (por ejemplo por `createdAt` en una ventana reciente o por `idSettlementCommission` en el conjunto procesado), se incluye `settlementCommission.business.user` y se agrupa por `user.idUser`.

## Tipos de dominio (resumen por usuario)

**Resumen por fila (un negocio en el correo)**:

- `idBusiness`: number  
- `nombreNegocio`: string (o identificador del negocio)  
- `valorComision`: number (ej. valueComissionFinal)  
- `categoriaConcepto`: string (opcional; nombre de categoría o concepto)

**Resumen por usuario (un correo)**:

- `idUser`: number  
- `email`: string  
- `nombreUsuario`: string (opcional, para saludo)  
- `archivoNombre`: string  
- `periodo`: string (ej. "2024-01" o rango de fechas)  
- `filas`: Array de “Resumen por fila”

**Validación**: Los datos leídos son internos (Prisma); no se exponen nuevos endpoints públicos que requieran Zod en este plan. Opcional: esquema Zod para tests o para un payload de “preview” en el futuro.
