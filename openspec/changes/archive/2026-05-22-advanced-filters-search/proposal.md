# Proposal: Búsqueda en Filtros Avanzados

## Intent
Mejorar la usabilidad del modal de Filtros Avanzados (`AdvancedFiltersModal.tsx`) permitiendo a los usuarios buscar y filtrar en tiempo real las opciones disponibles para Compañía, Producto y Origen. A medida que aumenta el volumen de opciones, el scroll manual se vuelve ineficiente.

## Scope
- Añadir campos de texto para buscar (Input) en cada categoría (Compañía, Producto, Origen).
- Filtrar la lista de opciones (client-side) en base a la entrada de texto, ignorando mayúsculas/minúsculas.
- Restablecer los valores de búsqueda al hacer clic en el botón "Limpiar".

## Out of Scope
- Paginación o virtualización de las listas de filtros.
- Cambios en la API o backend, todo se maneja en el frontend.

## Approach
Se agregarán tres estados `companySearch`, `productSearch` y `originSearch`. Se modificará el bloque donde se mapean las listas de `Checkbox` para aplicar un `filter()` previo que verifique si el nombre incluye la cadena buscada. Se utilizará el componente `Input` nativo del sistema con un ícono `Search` de `lucide-react` para mantener coherencia visual.
