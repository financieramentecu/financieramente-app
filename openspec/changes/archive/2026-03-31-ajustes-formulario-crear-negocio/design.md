# Design: Ajustes Formulario Crear Negocio

## Context
El formulario de creación de negocios en `src/features/negocios` presenta algunos textos que generan confusión según el feedback de los usuarios. Específicamente, menciones a negocios internacionales cuando no corresponde y instrucciones complejas sobre el cálculo del valor de la prima. Además, se requiere un lenguaje más genérico para las monedas extranjeras.

## Goals / Non-Goals

**Goals:**
- Simplificar el mensaje de ayuda del campo "Valor".
- Eliminar el mensaje de ayuda de "Compañía" sobre registros internacionales.
- Renombrar visualmente "Dólar Americano" a "Moneda Extranjera" en los selectores.

**Non-Goals:**
- No se modificará el esquema de la base de datos ni los valores almacenados.
- No se alterará la lógica de validación de los campos.

## Decisions

### 1. Limpieza de UI en `ProductInfoSection`
Se eliminará el `helperText` del campo `company` en `src/features/negocios/components/sections/product-info-section.tsx`. Este texto está hardcodeado actualmente.

### 2. Simplificación de Instrucciones en `BusinessInfoSection`
En `src/features/negocios/components/sections/business-info-section.tsx`, el bloque informativo debajo del campo moneda será reemplazado por un texto único: "Recuerde que el campo Valor debe ser equivalente al valor de la prima por 12".

### 3. Actualización de Moneda en Base de Datos (Seed)
En lugar de mapeo dinámico en el frontend, se modificará el archivo de seed `prisma/seeds/currency.ts` para que la moneda con símbolo 'USD' tenga el nombre 'Moneda Extranjera'.

Esto garantiza consistencia en todo el sistema y no solo en este formulario.

## Risks / Trade-offs
- **Riesgo:** Si existen otros lugares donde se use "Dólar Americano" y se espere consistencia, podrían verse discrepancias. Sin embargo, el alcance reportado es solo el formulario de creación.
- **Trade-off:** Hacer el cambio en el frontend (mapeo) es más rápido y seguro que una migración de base de datos, aunque añade una pequeña lógica de presentación en el hook de datos.
