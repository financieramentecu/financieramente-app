# Notas de Arquitectura — Filtros de Negocios (lista)

**Propósito**: registrar bugs no obvios encontrados en el pipeline de filtros de `/dashboard/negocios` y la convención que evita que se repitan.

**Fecha de creación**: 2026-06-17

---

## Bug: filtrar mientras se está en página 2+ devuelve "sin datos"

**Síntoma reportado**: al aplicar un filtro (fechas, estado, soportes, cualquiera) desde `AdvancedFiltersSheet`, la lista a veces mostraba 0 resultados aunque sí había negocios que cumplían el filtro.

**Causa raíz**: `page` vive en estado local de React (`searchParams.page` en `NegociosPageClient`), **separado** de los filtros que vienen de la URL (`urlFilterParams`, escritos por `AdvancedFiltersSheet`). El Sheet sí resetea `page=1` en la URL al aplicar, pero nada sincronizaba ese reset al estado local que realmente alimenta `useBusinesses(mergedParams)`.

Si el usuario estaba en la página 2+ de una lista más grande y aplicaba un filtro que reduce el resultado a menos páginas, la consulta seguía pidiendo el `skip` de la página vieja → Prisma devolvía 0 filas aunque sí existieran negocios que cumplían el filtro, visibles en la página 1.

**Por qué no era evidente que fuera "cualquier filtro"**: el síntoma se reproducía con cualquier combinación de filtros (no solo fechas) — dependía únicamente de en qué página estuviera el usuario al momento de aplicar, lo cual hacía que pareciera intermitente / específico de una combinación de filtros.

**Fix**: `src/app/dashboard/negocios/negocios-page-client.tsx` — `useEffect` que resetea `searchParams.page` a `1` cada vez que `urlFilterParams` cambia (mismo patrón que ya existía para búsqueda con debounce, cambio de `pageSize` y cambio de orden).

**Test de regresión**: `src/app/dashboard/negocios/__tests__/negocios-page-client.page-reset-on-filter.test.tsx`.

## Convención: cualquier cambio de filtro/búsqueda/orden DEBE resetear `page`

`NegociosPageClient` combina dos fuentes de estado para listar negocios:

1. **Estado local** (`searchParams`: `page`, `pageSize`, `search`, `sortBy`, `sortOrder`).
2. **Estado en la URL** (`urlFilterParams`: todo lo que escribe `AdvancedFiltersSheet` — fechas, estado, soportes, catálogos).

Ambos se combinan en `mergedParams`, que es lo que realmente se le pasa a `useBusinesses`. **Cualquier acción que cambie qué subconjunto de negocios se está mirando (un filtro nuevo, una búsqueda nueva, un orden distinto) debe resetear `page` a `1`** — de lo contrario se puede pedir un `skip` mayor que el total de filas filtradas.

Los puntos que ya cumplen esto (y deben seguir cumpliéndolo si se tocan):
- `handleSortingChange` → `page: 1`
- `handlePageSizeChange` → `page: 1`
- Efecto de búsqueda con debounce → `page: 1`
- Efecto de filtros de `AdvancedFiltersSheet` (`urlFilterParams` change) → `page: 1`

Si se agrega una nueva fuente de filtrado (otro dimensión de `AdvancedFiltersSheet`, otro control fuera del Sheet, etc.), verificar que termine pasando por `urlFilterParams` (para heredar el reset automático) o agregar su propio reset explícito de `page`.
