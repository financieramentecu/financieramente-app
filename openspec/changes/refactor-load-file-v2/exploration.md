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
