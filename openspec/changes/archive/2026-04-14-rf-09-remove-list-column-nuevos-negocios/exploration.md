# Exploration: RF-09 — Quitar columna «Distribución para nuevos negocios» del listado A

## Exploration: RF-09 — Listado configuración de producto (M14)

### Current State

- La tabla [`product-configurations-table.tsx`](../../src/features/product-configuration/components/product-configurations-table.tsx) define una columna con `accessorKey: 'newBusinessesDistributionDescription'` y header **«Distribución para nuevos negocios»**, mostrando descripción activa / `ppcNewBusinesses` / «Sin descripción».
- El mapper [`product-configuration.mapper.ts`](../../src/features/product-configuration/mappers/product-configuration.mapper.ts) rellena `newBusinessesDistributionDescription` priorizando la distribución con `active: true`, con fallback al vínculo `idProductPercentageCommissionNewBusinesses`.
- El tipo de dominio [`ProductConfiguration`](../../src/features/product-configuration/types/product-configuration.types.ts) incluye `newBusinessesDistributionDescription: string | null`.
- **Consumo en `src/`:** solo la tabla (tipos, mapper, fixture de tests). No hay otros componentes que lean ese campo.
- El spec principal [`openspec/specs/product-configuration/spec.md`](../../openspec/specs/product-configuration/spec.md) tiene el requirement **«Active Distribution Display»** centrado en esa columna del listado — contradice RF-09 / M14 del PRD.
- Los tests RTL de la tabla [`product-configurations-table.test.tsx`](../../src/features/product-configuration/__tests__/components/product-configurations-table.test.tsx) **no** aserten el texto del header ni del contenido de esa columna; el mock sigue incluyendo el campo.
- La misma tabla se reutiliza en **Config. Producto** y en la página legado [`distribution-commission-page-client.tsx`](../../src/app/dashboard/distribucion-comisiones/distribution-commission-page-client.tsx) — quitar la columna afecta **ambas** vistas que usan `ProductConfigurationsTableSection`.
- El **formulario** de edición [`product-configuration-form.tsx`](../../src/features/product-configuration/components/product-configuration-form.tsx) mantiene el bloque «Distribución de comisión (Nuevos Negocios)» con **Select** — es control operativo (asignar B), no la «columna de texto» del listado; el PRD M14 / RF-09 se refieren al listado (y MAPA indica gestión vía flujo B). No confundir con quitar el select salvo decisión explícita de producto.

### Affected Areas

- `src/features/product-configuration/components/product-configurations-table.tsx` — eliminar definición de columna.
- `openspec/specs/product-configuration/spec.md` — **MODIFIED/REMOVED** requirement «Active Distribution Display» (o reemplazo por requisito RF-09: ausencia de columna); alinear escenarios con PRD.
- `src/features/product-configuration/mappers/product-configuration.mapper.ts` — opcional: dejar de calcular `newBusinessesDistributionDescription` si se elimina del dominio.
- `src/features/product-configuration/types/product-configuration.types.ts` — opcional: quitar propiedad si ya no se usa.
- `src/features/product-configuration/__tests__/fixtures/mock-product-configuration.ts` — alinear fixture si se elimina el campo.
- `src/features/product-configuration/__tests__/mappers/product-configuration.mapper.test.ts` — actualizar expectativas si se elimina el campo del objeto mapeado.
- `src/features/product-configuration/__tests__/components/product-configurations-table.test.tsx` — añadir test opcional de que **no** aparezca el header «Distribución para nuevos negocios» (regresión RF-09).

### Approaches

1. **Solo UI (mínimo)** — Quitar la columna de `ColumnDef`; mantener mapper y tipo por si en el futuro otro consumidor necesita el dato en memoria.
   - Pros: diff pequeño; bajo riesgo; spec + código de dominio se pueden posponer.
   - Cons: campo derivado muerto en dominio; spec principal sigue contradictorio hasta delta.
   - Effort: **Low**

2. **UI + dominio limpio** — Quitar columna, eliminar `newBusinessesDistributionDescription` de tipo, mapper y mocks; simplificar `prismaProductConfigToProductConfig` (menos lógica «active distribution» solo para display).
   - Pros: sin dead code; dominio alineado con PRD; tests reflejan modelo real.
   - Cons: más archivos tocados; revisar que ningún consumidor futuro dependa del campo (hoy no hay).
   - Effort: **Medium**

3. **Feature flag** — Mantener columna detrás de flag/env (no recomendado para RF-09: el PRD pide ausencia sin excepción por rol).
   - Pros: rollback rápido.
   - Cons: complejidad innecesaria; contradice «sin excepción por rol».
   - Effort: **Medium** (y no aporta)

### Recommendation

**Approach 2 (UI + dominio limpio):** RF-09 es estable en producto; el campo solo existía para la columna. Eliminar columna + propiedad derivada + actualizar spec principal (y delta OpenSpec en el change) mantiene una sola fuente de verdad y evita confusiones en revisiones futuras.

### Risks

- **Dos entry points** usan la misma tabla: usuarios de `/dashboard/distribucion-comisiones` dejan de ver la columna igual que en Config. Producto — coherente con RF-09 si el alcance es «cualquier listado A con esa tabla».
- **Regresión documental:** cambios archivados (`fix-product-distribution-description`) describen el arreglo de la columna; el nuevo change debe dejar claro que RF-09 **revierte** ese requisito de visualización a favor del PRD MAPA M14.
- **Formulario:** si stakeholders interpretan RF-09 como «quitar cualquier mención a nuevos negocios en el módulo», habría que revisar copy del formulario; por redacción actual del PRD, el alcance es **columna en listado/detalle de listado**, no el select de asignación.

### Ready for Proposal

**Yes.** Siguiente paso: `sdd-propose` (o `openspec-new-change`) con nombre `rf-09-remove-list-column-nuevos-negocios`, propuesta que cite PRD §6 RF-09, MAPA M14, y decisión de limpieza de dominio (approach 2).
