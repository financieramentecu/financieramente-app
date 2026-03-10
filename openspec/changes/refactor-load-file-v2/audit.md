# Auditoría del Proceso de Carga de Archivos (Load File) V2

## 1. Análisis del Flujo Actual (`src/features/load-file/services/process-batch.service.ts`)

El servicio actual procesa los registros de manera lineal mediante una única función gigante `processAndSaveRecord`. Posee comprobaciones condicionales dispersas para distinguir si se trata de un archivo de POLIZA o VOLUNTARIA, en lugar de separar los caminos lógicos desde un principio como lo dicta el nuevo diagrama de flujo.

### Hallazgos Principales (vs. Nuevo `flow.mermaid`):

1. **Falta de Separación de Rutas (VOLUNTARIA vs. PÓLIZA)**
   El diagrama exige una división clara inmediatamente después de validar el formato (`V_INIT` vs `P_INIT`). En el esquema actual, la función de procesamiento no hace esta separación hasta muy adentro de la lógica de evaluación (por ejemplo, validando `desdeDate` y `hastaDate` de Voluntaria, mezclado con validaciones de Plan de Póliza).

2. **Ruta VOLUNTARIA: Prevención de Duplicados en el Mismo Mes (CRÍTICO)**
   - **Flujo Esperado:** Si el negocio existe y tiene `> 0` comisiones previas, debe verificar si ya existe una registrada **EN EL MISMO MES**. Si es así, debe lanzar 🛑 `ERROR UI` (estado de error) y abortar el guardado de ese registro.
   - **Código Actual:** **NO realiza esta verificación.** Los registros Voluntaria duplicados entrantes para un mismo contrato simplemente se registrarían como nuevos registros `SYNCHRONIZED` (si las fechas coinciden) lo que podría generar sobrepagos de comisiones.

3. **Ruta VOLUNTARIA: Lógica de Recuperación de LAG**
   - **Flujo Esperado:** Avalúa metódicamente: `Comisiones Previas > 0` -> `Mismo Mes (No)` -> `¿Hay LAG previo?` -> `SÍ (Recuperar antiguo, crear nuevo SYNC) / NO (Crear SYNC)`.
   - **Código Actual:** La búsqueda de registros en estado `LAG` (`existingLag`) se hace preventivamente si existe un `business`. No verifica la jerarquía de duplicados del mismo mes primero. Aunque la lógica de actualizar el `LAG` previo a `SYNCHRONIZED` y crear el nuevo está presente, necesita reorganizarse bajo el nuevo árbol de decisiones.

4. **Ruta VOLUNTARIA: Validación de Fechas (`isDateMatch`)**
   - **Flujo Esperado:** Se debe preguntar explícitamente `¿Dentro del mes de procesamiento?` para comisiones sin historial.
   - **Código Actual:** Compara la fecha de creación del negocio (`createdAt`) contra los campos `Desde` y `Hasta` del excel. Hay una desconexión semántica entre el "mes de procesamiento" de la carga y el rango de fechas en el excel.

5. **Ruta PÓLIZA: Manejo de FRONT19 y CLAW (Clawback)**
   - **Flujo Esperado:**
     - `FRONT19` -> `origin_commission = CARTERA`, `isClawback = false`.
     - `CLAW` -> Guardar monto, `clawback_percentage = 0`, `isClawback = true`, `discount_percentage = 0`. Estado debe ser `SYNCHRONIZED`.
   - **Código Actual:**
     - Maneja la derivación de `FRONT19_OMPEV` a `CARTERA` (Línea 209).
     - **DIVERGENCIA CLAW:** Si es `CLAW`, en vez de forzar porcentajes a `0`, la implementación actual _lee de la configuración activa_ (`snapshots.clawbackPercentage`) y lo asigna. Además, actualmente no existe mapeada explícitamente la idea de vaciar el descuento a `0` como ordena el flujo.

---

## 2. Plan de Refactorización (Hacia V2)

Basado en este análisis, para alinear al 100% la implementación con el nuevo diseño:

1. **Dividir en Estrategias Especializadas:**
   - Aislar el flujo de `processAndSaveRecord` en dos funciones o clases: la estrategia de `Voluntaria` y la estrategia de `Poliza`. Retirando el código espagueti.
2. **Implementar Regla Anti-Duplicados (Voluntaria):**
   - Antes de inferir un `LAG`, consultar si existen comisiones en el mismo mes calendario/periodo. Si la cuenta es mayor a 0, devolver el estado `ERROR UI` evitando doble ingreso de pagos por un mismo contrato `Cto`.

3. **Modificar el Casteo de CLAWBACKs (Poliza):**
   - Al detectar que en la descripción incluye `CLAW`, obligatoriamente sobre-escribir: `discountPercentage = 0`, `clawbackPercentage = 0`, `isClawback = true`.

Estaremos procediendo a actualizar los documentos de Arquitectura (`design.md`, `proposal.md`, `tasks.md`) para reflejar rígidamente esta auditoría como especificaciones oficiales de construcción sin escribir el código final todavía.
