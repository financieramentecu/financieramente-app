# Design Document: Búsqueda en Filtros Avanzados

## Architecture / File changes
- `src/features/negocios/components/modals/AdvancedFiltersModal.tsx`: Se modifica este componente para incluir los estados locales (`companySearch`, `productSearch`, `originSearch`) y renderizar los campos de texto `Input` junto con el ícono `Search` de `lucide-react`.

## UX / UI Design
Se utiliza el componente `Input` importado de `@/features/shared/ui/input`, con clase `pl-8` para hacer espacio al icono `Search` absoluto a la izquierda.
Se renderiza un `div` con clase `relative` para envolver el buscador y el icono.
El contenedor `ScrollArea` no se modifica en sus clases de altura, solo el contenido del render es filtrado por la búsqueda antes de iterar el mapeo de `Checkbox`.

## Data flow
1. Usuario abre modal. Todos los strings de búsqueda en `''`.
2. Escribe en "Compañía": `companySearch` se actualiza.
3. El componente se vuelve a renderizar, el array `companiesState.data.companies` es filtrado por `companySearch` ignorando case (`toLowerCase()`).
4. Si la longitud de las coincidencias es 0, muestra texto plano informando la falta de resultados.
5. El botón `Limpiar` setea estos tres estados de búsqueda también en `''`.
