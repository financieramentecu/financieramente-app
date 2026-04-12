## Why

Actualmente, la búsqueda de negocios en la plataforma es siempre parcial (utilizando `contains`). Esto puede generar ruido y confusión cuando un usuario desea encontrar un negocio específico mediante su número de contrato o ID exacto, especialmente en listados extensos con numeraciones similares.

## What Changes

Se añadirá una opción de "Coincidencia exacta" (Exact Match) a la funcionalidad de búsqueda de negocios. Esto implica:
- Una actualización en la API para aceptar un parámetro `exactMatch`.
- Un cambio en la lógica de filtrado del backend para aplicar igualdad estricta en campos identificadores.
- La adición de un control (checkbox) en la interfaz de usuario dentro de la sección de tabla de negocios.

## Capabilities

### New Capabilities
- `exact-match-search`: Capacidad de realizar búsquedas por coincidencia exacta en campos clave.

### Modified Capabilities
- `negocios`: La funcionalidad de listado y búsqueda de negocios ahora soporta un modo de filtrado estricto opcional.

## Impact

- **API**: `/api/negocios` (parámetros de consulta).
- **Frontend**: Componentes `BusinessTableSection`, `MisNegociosPage` y `NegociosPageClient`.
- **Hooks/Services**: `useBusinesses` y `businessService`.
