# Exploration: Acentos en columnas Excel (Pólizas) y encoding

## Current State

- **Validación de cabeceras:** `validate-excel-structure.ts` lee el Excel con `file.arrayBuffer()` y `XLSX.read(arrayBuffer, { type: 'array' })`. La primera fila se toma como headers y se compara contra `FILE_TYPE_REQUIRED_HEADERS` (Póliza: "Plan de Compensación", "Valor Comisión", etc.).
- **Comparación insensible a acentos:** Header comparison is accent-insensitive. In `src/features/load-file/lib/header-utils.ts`, `normalizeHeaderValue` (NFD + strip diacritics) and `headerMatchesRequired` compare normalized strings, so "Plan de Compensación" and "Plan de Compensacion" are treated as the same required column. Both accented and non-accented column names in the file are accepted for validation and column mapping.
- **Lectura sin encoding explícito:** No se usa `codepage` ni `TextDecoder` al leer. Para CSV, los bytes se pasan tal cual a SheetJS; si el archivo está en Windows-1252 o UTF-8 sin BOM, puede haber mojibake (ej. "CompensaciÃ³n").
- **Formatos aceptados:** .xlsx, .xls, .csv (CargarArchivoTab). Para .xlsx el contenido interno suele ser UTF-8; el fallo suele aparecer en CSV o en exportaciones con encoding distinto.

## Affected Areas

- `src/features/load-file/lib/validate-excel-structure.ts` — lectura del archivo y obtención de headers; añadir opciones de encoding/codepage si aplica.
- `src/features/load-file/lib/process-excel-file.ts` — misma lectura (`arrayBuffer` + `XLSX.read`); debe alinearse con la estrategia de encoding.
- `src/features/load-file/lib/header-utils.ts` — ya soporta comparación sin acentos; no requiere cambio para “aceptar acentos”, pero conviene documentar que la comparación es normalizada.
- `src/features/load-file/lib/file-types.ts` — definición de cabeceras requeridas (con acentos); se mantienen como referencia canónica.

## Approaches

1. **Encoding explícito al leer (UTF-8 / codepage)**  
   Para CSV (y opcionalmente otros formatos): decodificar `arrayBuffer` con `TextDecoder('utf-8')` y pasar el string a `XLSX.read(..., { type: 'string', codepage: 65001 })`, o usar la opción `codepage` donde SheetJS lo permita para que los caracteres con acento se interpreten bien.  
   - Pros: Corrige mojibake cuando el archivo es UTF-8 y se leía con encoding por defecto; solución estándar.  
   - Cons: Hay que detectar o asumir formato (CSV vs xlsx); en xlsx la codepage puede no aplicarse.  
   - Effort: Medium.

2. **Solo normalización (sin tocar lectura)**  
   Confiar en la comparación normalizada actual y documentar que las columnas pueden llevar o no acentos. Si el problema es solo “Excel tiene sin acento y nosotros con acento” (o al revés), ya está cubierto.  
   - Pros: Sin cambios de lectura; bajo riesgo.  
   - Cons: No soluciona fallos por encoding incorrecto (archivos guardados en Windows-1252/UTF-8 mal interpretado).  
   - Effort: Low (solo docs/tests).

3. **Híbrido: encoding + documentación**  
   Añadir lectura con encoding explícito (UTF-8/codepage) para CSV (y donde aplique) y documentar en diseño que la comparación de cabeceras es insensible a acentos (normalización NFD). Incluir prueba con columnas con/sin acentos y, si es posible, con CSV en UTF-8.  
   - Pros: Aborda tanto acentos como encoding; deja el comportamiento documentado y comprobado.  
   - Cons: Requiere tocar dos flujos (validación y procesamiento) y pruebas.  
   - Effort: Medium.

## Recommendation

**Enfoque híbrido (3):**  
- Asegurar que al leer CSV (y, si la librería lo permite, otros formatos) se use UTF-8 de forma explícita (p. ej. `TextDecoder` + `codepage: 65001` o equivalente en SheetJS) para que columnas con acentos (Pólizas y Voluntaria) no se corrompan.  
- Dejar explícito en diseño que la comparación de cabeceras es insensible a acentos gracias a `normalizeHeaderValue` (NFD + eliminación de diacríticos).  
- Añadir al plan una tarea de “soporte explícito de encoding (UTF-8) y acentos en columnas” con la implementación y una prueba que use columnas con acentos (y, si es posible, CSV UTF-8).

## Risks

- SheetJS (xlsx 0.18.x) puede no exponer `codepage` para todos los tipos de archivo; habría que verificar la API exacta para CSV vs binary.
- Asumir siempre UTF-8 para CSV puede fallar si el usuario sube CSVs en Windows-1252; se puede documentar “CSV en UTF-8” como formato recomendado o añadir detección/heurística más adelante.

## Ready for Proposal

Yes. Las decisiones (encoding explícito para CSV, comparación ya insensible a acentos, documentar y probar) se pueden reflejar en el design y en una nueva tarea del change.

---

## Exploration: Porcentaje de clawback no registrado al sincronizar archivos de póliza

### Regla de negocio

**El clawback es 0 solo cuando el Plan incluye "CLAW".** En todos los demás casos (FRONT19, "Otro", etc.) se debe obtener el porcentaje de clawback de `CommissionConfiguration` y **registrarlo en la comisión** (`SettlementCommission.clawbackPercentage`).

### Current State

- **Flujo (flow.md):** Para PÓLIZA, cuando el plan es FRONT19 o "Otro", el flujo indica: **GET_CONF_P** (Consultar config_comision % Descuento, **% clawback**) → **SAVE_P** (Guardar BD: Estado, Contrato, % Desc, **% Clawback**, type_commission=POLIZA, monto). Solo en el caso **P_CLAW** (Plan incluye "CLAW") se fuerza clawback_percentage=0.
- **process-batch.service.ts:** Obtiene correctamente `discountPercentage` y `clawbackPercentage` de la configuración activa (`CommissionConfiguration`) y los pasa en `snapshots` al processor (líneas 48–65, 87).
- **poliza.processor.ts:** Recibe `snapshots` con `discountPercentage` y `clawbackPercentage`, usa `effectiveDiscount = isClawback ? 0 : snapshots.discountPercentage` para el descuento, pero **nunca usa `snapshots.clawbackPercentage`**. En `createSync` siempre persiste `clawbackPercentage: 0` (línea 166), por lo que el % de clawback de la configuración no se registra en BD para registros SYNCHRONIZED de póliza (FRONT19 u "Otro").
- **Spec (load-file-v2):** "The system SHALL store `discount_percentage` (and, **where applicable**, `clawback_percentage`) from that configuration on the `settlement_commission` record." Poliza CLAW puede sobrescribir; para FRONT19 y "Otro" aplica el "where applicable" y debe guardarse el % de clawback de la config.

### Affected Areas

- `src/features/load-file/services/processors/poliza.processor.ts` — `createSync` siempre escribe `clawbackPercentage: 0`; no recibe ni usa el % de clawback de `snapshots` para los casos no-CLAW (FRONT19, Otro).
- `src/features/load-file/__tests__/process-batch.service.test.ts` — Los tests de Poliza (p. ej. 4.4 CLAW) validan clawback=0 para CLAW; faltaría validar que para FRONT19/Otro se persista `snapshots.clawbackPercentage`.

### Approaches

1. **Pasar clawback efectivo a createSync y persistirlo**  
   Calcular en `process()` un `effectiveClawback`: si `isClawback` (plan CLAW) → 0; si no (FRONT19 u "Otro") → `snapshots.clawbackPercentage ?? 0`. Pasar `effectiveClawback` a `createSync` y usarlo en `data.clawbackPercentage`.  
   - Pros: Alinea con flow y spec; un solo punto de persistencia; pre-liquidación ya usa `r.clawbackPercentage` de la comisión.  
   - Cons: Ninguno relevante.  
   - Effort: Low.

2. **Solo documentar y no persistir % clawback para póliza**  
   Dejar siempre 0 en póliza y documentar que el flujo "GET_CONF_P / % Clawback" no se implementa.  
   - Pros: Sin cambios de código.  
   - Cons: Incumple flow y spec; pre-liquidación seguiría usando 0 para póliza no-CLAW salvo que se tome de config en tiempo de pre-liquidación (no es el diseño actual).  
   - Effort: Low (solo docs).

3. **Obtener clawback en pre-liquidación en lugar de en sync**  
   No guardar clawback en `SettlementCommission` para póliza y en pre-liquidación leer siempre de `CommissionConfiguration`.  
   - Pros: Un solo lugar de verdad para el %.  
   - Cons: Cambia el diseño (spec pide guardar snapshot en el registro); historial de cargas no mostraría el % aplicado en el momento del sync.  
   - Effort: Medium.

### Recommendation

**Enfoque 1 (pasar clawback efectivo a createSync):**  
- **Solo cuando el Plan incluye "CLAW"** → `clawbackPercentage = 0`.  
- **En todos los demás casos** → obtener el % de clawback de `CommissionConfiguration` (ya viene en `snapshots.clawbackPercentage`) y registrarlo en la comisión.  
- En `poliza.processor.ts`: calcular `effectiveClawback = isClawback ? 0 : (snapshots.clawbackPercentage ?? 0)` y pasarlo a `createSync`; en `createSync` usar ese valor en `data.clawbackPercentage` en lugar del literal `0`.  
- Añadir/ajustar test que verifique: (1) plan con "CLAW" → clawback 0; (2) plan FRONT19 u otro sin CLAW → `clawbackPercentage` igual al de la configuración activa.

### Risks

- Si `snapshots.clawbackPercentage` es `null` (config sin clawback), usar `?? 0` evita null en BD; confirmar con negocio si 0 es aceptable o si debe rechazarse el sync cuando falte config de clawback para póliza no-CLAW (hoy no se rechaza).

### Ready for Proposal

Yes. La causa es que el procesador de póliza no propaga el % de clawback de la configuración al crear el registro; el cambio es acotado (poliza.processor + test) y coherente con flow y spec.
