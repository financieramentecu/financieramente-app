# Exploration: Historial vacío tras preliquidar — manejo de estados

## Current State

- **Prisma / BD**: `SettlementCommission.status` usa valores en inglés: `PENDING`, `SYNCHRONIZED`, `LAG`, `PRE-SETTLED`, `SETTLED` (schema línea 395). La migración `20260224212108_update_load_file_states` ya migró datos de `PRELIQUIDADO` → `PRE-SETTLED`.
- **Procesamiento**: `procesarPreLiquidacion` actualiza cada registro a `status: 'PRE-SETTLED'` correctamente.
- **Listado de archivos**: `obtenerArchivosDisponiblesPreliquidacion` solo devuelve `FileImport` con `status: 'LOAD'` y que tengan **al menos un** `SettlementCommission` con `status: 'SYNCHRONIZED'`. El campo `registrosPreliquidados` es `_count.settlementCommissions` con `where: { status: 'SYNCHRONIZED' }`.
- **API resultados**: `GET /api/pre-liquidacion/resultados/[fileId]` filtra por `status: 'PRELIQUIDADO'`.
- **API exportar**: `POST /api/pre-liquidacion/exportar/[fileId]` filtra por `status: 'PRELIQUIDADO'`.
- **UI**: La página de pre-liquidación separa "Pendientes" (LOAD y `sincronizados > 0`) e "Histórico" (LOAD y `registrosPreliquidados > 0`).

## Root Cause: Inconsistencia de estados

1. **Historial de resultados vacío**  
   Las rutas de resultados y exportar buscan `PRELIQUIDADO`, pero en BD solo existe `PRE-SETTLED`. Por eso al abrir "Historial" o exportar, no se encuentran registros.

2. **Archivo desaparece de la lista tras preliquidar**  
   Tras preliquidar, todos los registros pasan a `PRE-SETTLED`, por lo que ya no hay ningún `SYNCHRONIZED`. El servicio solo incluye archivos con `some { status: 'SYNCHRONIZED' }`, así que el archivo deja de cumplir el filtro y desaparece de la lista. Además, `registrosPreliquidados` cuenta solo `SYNCHRONIZED`, por lo que después de preliquidar sería 0; la pestaña "Histórico" depende de `registrosPreliquidados > 0`, así que no mostraría ese archivo aunque se incluyera.

## Affected Areas

| Archivo | Impacto |
|--------|---------|
| `src/app/api/pre-liquidacion/resultados/[fileId]/route.ts` | Filtro `status: 'PRELIQUIDADO'` → debe ser `'PRE-SETTLED'`. |
| `src/app/api/pre-liquidacion/exportar/[fileId]/route.ts` | Mismo filtro `status: 'PRELIQUIDADO'` → debe ser `'PRE-SETTLED'`. |
| `src/features/pre-liquidacion/services/pre-liquidacion.service.ts` | `obtenerArchivosDisponiblesPreliquidacion`: (1) incluir archivos con registros PRE-SETTLED además de SYNCHRONIZED; (2) `registrosPreliquidados` debe contar PRE-SETTLED, no SYNCHRONIZED. |

## Approaches

### 1. Corregir solo el nombre del estado (resultados + exportar)

- **Descripción**: En las dos rutas API reemplazar `'PRELIQUIDADO'` por `'PRE-SETTLED'`.
- **Pros**: Mínimo cambio; el historial de resultados y la exportación vuelven a mostrar datos.
- **Cons**: El listado de archivos sigue excluyendo archivos 100 % preliquidados (solo muestra archivos con al menos un SYNCHRONIZED).
- **Effort**: Low.

### 2. Corregir estados y ampliar listado de archivos

- **Descripción**: (1) Cambiar `PRELIQUIDADO` → `PRE-SETTLED` en resultados y exportar. (2) En `obtenerArchivosDisponiblesPreliquidacion`: incluir archivos LOAD que tengan `some SYNCHRONIZED` **o** `some PRE-SETTLED`; y definir `registrosPreliquidados` como count de `PRE-SETTLED` (p. ej. con un segundo `_count` o una query que devuelva ambos conteos).
- **Pros**: Historial de resultados correcto y archivos preliquidados visibles en la lista e "Histórico".
- **Cons**: Requiere ajustar la query y la forma del `_count` (o dos conteos) en el servicio.
- **Effort**: Medium.

### 3. Centralizar constantes de estado

- **Descripción**: Igual que 2, más definir constantes (p. ej. en tipos o en un módulo compartido) para los estados de `SettlementCommission` (`SYNCHRONIZED`, `PRE-SETTLED`, etc.) y usarlas en servicio y rutas para evitar futuras discrepancias.
- **Pros**: Evita volver a mezclar PRELIQUIDADO/PRE-SETTLED; código más claro.
- **Cons**: Un poco más de código y refactor.
- **Effort**: Medium.

## Recommendation

- **Corto plazo**: Aplicar **Approach 2** (corregir estados en resultados y exportar + ampliar listado y conteo de preliquidados) para que el historial y la pestaña Histórico funcionen bien.
- **Opcional**: Añadir constantes de estado (Approach 3) en el mismo cambio o en uno posterior.

## Risks

- Cambiar el `where` del listado de archivos puede aumentar el número de archivos devueltos; conviene revisar que la UI y el rendimiento sigan siendo aceptables.
- Cualquier otro uso de la cadena `'PRELIQUIDADO'` en el repo (p. ej. en docs o specs) debería actualizarse a `PRE-SETTLED` para consistencia; no afecta el comportamiento de la app pero evita confusión.

## Ready for Proposal

**Yes.** Con el enfoque 2 (y opcionalmente 3) se puede escribir una propuesta corta de cambio: "Fix: historial de pre-liquidación vacío por uso de estado PRELIQUIDADO y filtro de listado solo SYNCHRONIZED" y tareas: actualizar resultados + exportar a `PRE-SETTLED`, ampliar y ajustar `obtenerArchivosDisponiblesPreliquidacion` para incluir archivos con PRE-SETTLED y contar `registrosPreliquidados` por PRE-SETTLED.
