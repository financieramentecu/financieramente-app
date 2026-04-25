## Exploration: Ajustes en Creación de Negocio, Excel y Fondeo

### Current State
1. **Formulario UI**: Existen tres agrupadores principales: `ClientInfoSection`, `ProductInfoSection` y `BusinessInfoSection`. El campo "contrato" está en la sección del cliente; "compañía, producto y plazo" están en producto; y el resto en negocio.
2. **Excel Export**: `map-business-to-export-row.ts` tiene quemadas las columnas "Mes", "Año" y "Es anualidad.". No existe una columna para "Celular" ni filtros de fecha en el archivo de salida, aunque la API (`route.ts`) sí los recibe (`dateFrom`, `dateTo`).
3. **Eliminar Negocios**: Tanto la UI (`ActionCell.tsx`) como el backend (`/api/negocios/[id]/cancel/route.ts`) **ya bloquean** al rol `COACH`. Solo permiten a `ADMIN`, `ANALISTA_SOPORTE` y `ASISTENTE_GERENCIA_OPERATIVA`.
4. **Fondeo de Anualidades**: En `/api/negocios/[id]/fondear-anualidades/route.ts`, la fecha de anclaje (`dateAnchored`) del negocio padre solo se actualiza si el estado previo era `EMITIDO` (el primer fondeo). Fondeos subsecuentes de anualidades solo actualizan la cuota, pero no la fecha del padre.

### Affected Areas
- `src/features/negocios/components/sections/client-info-section.tsx` — Se debe remover el campo "contrato".
- `src/features/negocios/components/sections/product-info-section.tsx` — Se eliminará por completo.
- `src/features/negocios/components/sections/business-info-section.tsx` — Agrupará todos los campos en el orden exacto solicitado (contrato, compañia, producto, periodicidad, plazo, moneda, valor, agente).
- `src/features/negocios/components/create-business-form.tsx` (y edit) — Se debe ajustar para pasar las dependencias correctas al `BusinessInfoSection` y no invocar `ProductInfoSection`.
- `src/features/negocios/lib/map-business-to-export-row.ts` — Modificación de columnas: quitar Mes, Año, Es anualidad; agregar Celular. Las fechas de fondeo requieren que el export reciba el `dateFrom` y `dateTo`.
- `src/app/api/negocios/export/route.ts` — Debe inyectar los valores `dateFrom` y `dateTo` hacia el mapeador.
- `src/app/api/negocios/[id]/fondear-anualidades/route.ts` — La actualización a la tabla `business` (campo `dateAnchored`) debe ejecutarse independientemente de si el negocio ya era `FONDEADO`.

### Approaches

1. **Refactor directo en UI y ajustes de Excel/API**
   - **Pros**: Sencillo y ataca directamente las reglas. En el caso de Excel, inyectar el filtro evita recalcular datos. El tema de eliminación ya está resuelto en código.
   - **Cons**: El refactor de UI obliga a mover bastantes props que antes recibía `ProductInfoSection` hacia `BusinessInfoSection` (e.g. `companiesOptions`, `filteredProducts`).
   - **Effort**: Medium

### Recommendation
Proceder con el **Approach 1**. 
- En la UI, fusionar las propiedades necesarias en `BusinessInfoSectionProps`.
- En Excel, agregar condicionales de array puro `if (dateFrom) base.push(...)` dentro de `negociosExportColumnHeaders` y su respectiva contraparte en el builder de fila.
- En la API de anualidades, hacer un `tx.business.update` fuera del condicional `parentWasEmitido` (que solo dictará el cambio de estado si aplicaba).

### Risks
- **Excel y Layouts**: Agregar columnas dinámicas puede desfasar encabezados si la lógica condicional no es 1:1 entre `headers` y la construcción de `row`.
- **UI Formulario**: "contrato" en modo creación requiere la validación especial (disabled) asociada al número de documento del cliente (5+ chars). Habrá que trasladar esa lógica o prop al `BusinessInfoSection`.

### Ready for Proposal
Yes
