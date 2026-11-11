---
'financieramente-app': patch
---

### Mejorado

- **Carga más rápida de Negocios:** La primera página de negocios y los indicadores se cargan desde el servidor al abrir la pantalla, sin una segunda carga en el navegador.
- **Filtros de fecha por rol:** El mes actual se aplica desde el inicio, sin un cambio de URL posterior.

### Técnico

- `negocios/page.tsx` hace streaming de `getNegociosInitialData` (lista y KPIs) con una sola resolución de jerarquía compartida. Los hooks `useBusinesses` y `useBusinessStats` aceptan datos iniciales y solo consultan al cambiar filtros.
- La siembra del filtro de fecha por rol se hace en el servidor (`buildDefaultDateSeedQuery`) en lugar de un `router.replace` en el cliente.
- `businessWithRelations` ya no carga las filas de `business_support`; solo se usa su conteo.
- Consulta de la lista extraída a `business-list.service.ts`; `/api/negocios` y `/api/negocios/stats` mantienen el mismo contrato.
