# Quickstart: Commission Sync & Pre-liquidation

## Objetivo
Validar el flujo de carga POLIZA/VOLUNTARIA, sincronización de estados y pre‑liquidación con los archivos de ejemplo.

## Requisitos
- Dependencias instaladas (`npm install`)
- Base de datos configurada y migrada

## Pasos
1. Iniciar el servidor:
   - `npm run dev`
2. Ir a `Cargar archivos` en el dashboard.
3. Seleccionar tipo **POLIZA** y cargar `docs/Polizas.xlsx`.
4. Verificar:
   - Validación de headers exitosa.
   - Contadores de sincronización coherentes.
5. Seleccionar tipo **VOLUNTARIA** y cargar `docs/BASE DE VOLUNTARIAS SKANDIA.xlsx`.
6. Verificar:
   - Validación de headers exitosa.
   - Aplicación de regla de fechas (Desde/Hasta).
7. Ejecutar pre‑liquidación sobre un archivo en estado LOAD.
8. Verificar:
   - Distribuciones creadas con base `base_commission`.
   - Descuento y clawback aplicados (según snapshots).
   - Estado final PRELIQUIDADO en `file_import` y `settlement_commission`.

## Validaciones mínimas
- Un registro POLIZA con Plan FRONT19_OMPEV guarda `origin_commission = CARTERA`.
- Un registro POLIZA con CLAW guarda `clawback_percentage`.
- Valores monetarios con formato moneda se normalizan; inválidos generan ERROR y auditoría.
