# Proposal: Refactorización de KPIs de Negocio del Coach

## Intent

El objetivo es mejorar la visualización de los KPIs en el Dashboard de Negocios para el rol de Coach, proporcionando una vista más limpia, orientada a la acción y libre de comparativas mensuales. Además, se requiere adaptar el KPI de "Fondeados" para que sus valores reaccionen dinámicamente al rango de fechas seleccionado en la tabla de fondeo, en lugar de mostrar un total histórico acumulado, facilitando el monitoreo operativo y la liquidación.

## Scope

### In Scope

- Creación de un nuevo componente de tarjeta de KPI específico para el Coach que muestre la cantidad total y los montos simultáneos en moneda local y extranjera.
- Remoción de gráficos (sparklines) y de pestañas de selección de moneda en las tarjetas de estadísticas del Coach.
- Modificación del endpoint `/api/negocios/stats` para aceptar parámetros de rango de fechas (`dateFrom`, `dateTo`).
- Aplicación del filtro de fechas exclusivamente para calcular el estado "Fondeados", manteniendo "Ventas Efectuadas" y "Emitido" como totales globales (inventario actual).
- Actualización de los hooks y servicios frontend para integrar los filtros de fecha de la URL hacia el API.
- La carga por default de las fechas solo se aplica el usuario con rol Coach. Los usuarios Administrador no tienen filtro de fechas por default
- Eliminar el KPI de clawback, solo vamos a tener 'VENTA EFECTUADA', 'EMITIDO', 'FONDEADOS'.

### Out of Scope

- Modificación del dashboard o KPIs del rol Administrador.
- Nuevos cálculos de comisión u operaciones de base de datos ajenas a la lectura de estados.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `negocios`: Cambia la forma en la que se calculan y se exponen las estadísticas de los negocios (`GET /api/negocios/stats`), abandonando la agrupación de 12 meses por totales agrupados por moneda.
- `ui-system`: Requiere un nuevo componente tipo Data-Dense `CoachKpiCard` que reemplaza el uso de `StatsCard` en la vista de Negocios.

## Approach

Siguiendo la recomendación de la fase de exploración (Enfoque 2), se creará un componente específico `CoachKpiCard` para satisfacer las reglas de diseño Data-Dense de `ui-ux-pro-max`, aislando los cambios visuales del resto del sistema.

A nivel de backend, el endpoint `/api/negocios/stats` se reescribirá para dejar de agrupar datos por meses. Ejecutará tres sumatorias simples en paralelo (Ventas Efectuadas, Emitidos, Fondeados), pero inyectará una cláusula `createdAt: { gte: dateFrom, lte: dateTo }` en la consulta del estado "Fondeados" cuando estos parámetros estén presentes en la URL.

## Affected Areas

| Area                                                  | Impact   | Description                                                |
| ----------------------------------------------------- | -------- | ---------------------------------------------------------- |
| `src/app/api/negocios/stats/route.ts`                 | Modified | Nueva estructura de retorno; soporte a `dateFrom`/`dateTo` |
| `src/features/negocios/services/business.service.ts`  | Modified | El servicio `getStats` aceptará fechas                     |
| `src/features/negocios/hooks/use-business-stats.ts`   | Modified | Pase de parámetros de fechas al backend                    |
| `src/app/dashboard/negocios/negocios-page-client.tsx` | Modified | Envío de los filtros de tabla al hook                      |
| `src/features/negocios/components/StatsOverview.tsx`  | Modified | Uso del nuevo componente de tarjetas de Coach              |
| `src/features/negocios/components/CoachKpiCard.tsx`   | New      | Tarjeta dual con diseño Data-Dense                         |

## Risks

| Risk                                                   | Likelihood | Mitigation                                                                                                                                                       |
| ------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ruptura de otras vistas que usen `/api/negocios/stats` | Med        | Se validará estáticamente en la base de código si el Admin consume este endpoint. De ser así, se parametrizará la respuesta en lugar de reemplazarla totalmente. |
| Problemas de performance por recalcular con fechas     | Low        | Se utilizará el método `.aggregate` de Prisma con índices existentes (`status`, `idCurrency`, `createdAt`), lo cual es muy eficiente.                            |

## Rollback Plan

Revertir a los commits anteriores mediante Git, ya que la base de datos y sus modelos (`Prisma schema`) no sufren ninguna alteración (es un cambio puramente de lectura de datos y UI).

## Dependencies

- No hay dependencias externas nuevas.

## Success Criteria

- [ ] La tarjeta "Ventas Efectuadas" muestra el conteo y valores simultáneos en COP y USD sin gráficos.
- [ ] La tarjeta "Emitido" muestra el conteo y valores simultáneos en COP y USD sin gráficos.
- [ ] La tarjeta "Fondeados" muestra el conteo y valores simultáneos y se actualiza al cambiar los rangos de fecha en la tabla.
- [ ] El código pasa los validadores de arquitectura y ESLint/TypeScript.
