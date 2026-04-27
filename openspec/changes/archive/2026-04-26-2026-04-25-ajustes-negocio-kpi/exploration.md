## Exploration: Refactorización KPIs de Negocio del Coach

### Current State
Actualmente, los KPIs del Coach calculan estadísticas globales de los últimos 12 meses basados en la fecha de creación (`createdAt`) y dividen la vista usando *tabs* de moneda. El estado "Fondeado" no se muestra en el resumen de KPIs; actualmente solo se muestra la reserva de Clawback. Además, el API `GET /api/negocios/stats` agrupa la información mes a mes y no recibe parámetros de filtro de fechas, lo cual es necesario para el nuevo comportamiento dinámico del KPI de Fondeados. El componente visual actual (`StatsCard`) está optimizado para gráficos comparativos y una sola moneda visible a la vez.

### Affected Areas
- `src/app/api/negocios/stats/route.ts` — Necesita cambiar su estructura de respuesta. En lugar de devolver un historial de 12 meses, debe retornar la dupla (o mapa) de valores en moneda local y extranjera junto con el conteo (cantidad) de negocios. Debe aceptar los query params `dateFrom` y `dateTo` para filtrar el cálculo de Fondeados.
- `src/features/negocios/services/business.service.ts` — El método `getStats` debe actualizarse para aceptar los parámetros de fecha.
- `src/features/negocios/hooks/use-business-stats.ts` — Debe recibir las fechas provenientes de la URL o estado y pasarlas al servicio para reactividad.
- `src/app/dashboard/negocios/negocios-page-client.tsx` — Responsable de capturar los filtros de la tabla y pasárselos al hook de stats.
- `src/features/negocios/components/StatsOverview.tsx` — Contenedor de las tarjetas; debe ser rediseñado para mostrar las tres tarjetas (Ventas Efectuadas, Emitido, Fondeados) sin gráficos y con ambas monedas.
- `src/features/shared/ui/StatsCard.tsx` (o un nuevo componente `CoachKpiCard.tsx`) — Debe implementarse un diseño tipo "Data-Dense Dashboard" (como indica ui-ux-pro-max) que elimine los tabs y muestre simultáneamente los montos en COP y USD.

### Approaches
1. **Modificar el `StatsCard` genérico y adaptar la respuesta de la API global**
   - Pros: Reutilización de código existente y menor cantidad de nuevos archivos.
   - Cons: Alto riesgo de romper el dashboard del Administrador, que también consume el mismo endpoint y posiblemente el mismo componente visual. La lógica condicional ensuciaría el componente.
   - Effort: High

2. **Crear `CoachKpiCard` específico y reescribir la lógica en `api/negocios/stats` para uso exclusivo del Coach**
   - Pros: Separa responsabilidades. Permite cumplir exactamente con las reglas de `ui-ux-pro-max` (sin charts, grid data-dense, íconos SVG) sin afectar otras vistas.
   - Cons: Requiere crear un nuevo componente e interfaces de TypeScript dedicadas para la nueva respuesta de la API.
   - Effort: Medium

### Recommendation
Se recomienda el **Enfoque 2**. Dado que la vista del Coach tiene requerimientos específicos (doble moneda simultánea, filtrado dinámico exclusivo para Fondeados, eliminación de gráficos mensuales), crear un componente de UI específico (`CoachKpiCard`) garantiza un diseño limpio e ininterrumpido. Además, el endpoint `/api/negocios/stats` se puede adaptar fácilmente ya que actualmente sirve principalmente al dashboard del Coach.

### Risks
- Al eliminar los datos de 12 meses del endpoint, cualquier otra vista que dependiera de esa tendencia dejará de funcionar (es necesario confirmar que solo el Coach usa este endpoint).
- La consulta agrupada en Prisma (`groupBy` o múltiples `aggregate`) requerirá cuidado para sumar eficientemente los montos por moneda sin penalizar el rendimiento cuando el usuario cambie las fechas de la tabla rápidamente.

### Ready for Proposal
Yes — La exploración está completa. Se ha identificado qué archivos modificar y el enfoque técnico. El orquestador puede indicarle al usuario que proceda con `/sdd-propose` o la siguiente fase de OpenSpec.
