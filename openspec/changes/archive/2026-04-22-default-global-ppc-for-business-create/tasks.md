# Tasks: PPC global por defecto en creación de negocio

## Phase 1: Foundation (lookup y criterios)

- [x] 1.1 Actualizar `src/features/negocios/services/product-configuration.service.ts` para que `getPpcForNewBusinesses` resuelva prioridad: específico de nuevos negocios y luego fallback global elegible.
- [x] 1.2 Definir en el mismo servicio el criterio de elegibilidad del fallback global (PPC activo y con al menos una categoría activa), con orden de selección determinístico.
- [x] 1.3 Mantener el contrato `GetPpcForNewBusinessesResult` sin cambios de tipos públicos, documentando el cambio semántico de `ppc` cuando `configExists=false`.

## Phase 2: Core Implementation (action y flujo de creación)

- [x] 2.1 Ajustar `src/features/negocios/actions/find-product-percentage-commission.ts` para devolver éxito cuando exista `ppc` (específico o fallback) y conservar errores controlados cuando no exista ninguno.
- [x] 2.2 Verificar en `src/features/negocios/actions/create-business.ts` que no se agregan ramas nuevas; solo consume el resultado de lookup actualizado para persistir `idProductPercentageCommission`.
- [x] 2.3 Revisar mensajes de error de la action para que sigan distinguiendo: sin configuración específica vs sin fallback global disponible.

## Phase 3: Testing (TDD red/green/refactor)

- [x] 3.1 RED: extender `src/features/negocios/__tests__/services/product-configuration.service.test.ts` con caso donde existe comisión específica y no debe usarse fallback global.
- [x] 3.2 RED: agregar test en el mismo archivo para caso sin configuración específica con fallback global elegible.
- [x] 3.3 RED: agregar test para caso sin específica ni fallback global, esperando `ppc: null`.
- [x] 3.4 GREEN: implementar ajustes en servicio para pasar los 3 casos anteriores.
- [x] 3.5 RED: agregar pruebas en `src/features/negocios/__tests__/actions/create-business.test.ts` (o test dedicado de action de lookup) para creación exitosa usando fallback global.
- [x] 3.6 GREEN: ajustar `find-product-percentage-commission` para pasar escenarios de éxito por fallback y error sin fallback.
- [x] 3.7 REFACTOR: limpiar mocks/fixtures duplicados en ambos tests y asegurar naming consistente para escenarios específico/fallback/error.

## Phase 4: Verification & Quality Gates

- [x] 4.1 Ejecutar pruebas focalizadas de `negocios` para `create-business`, `find-product-percentage-commission` y `product-configuration.service`.
- [x] 4.2 Validar que los escenarios del delta spec (`openspec/changes/default-global-ppc-for-business-create/specs/negocios/spec.md`) queden cubiertos por pruebas automatizadas.
- [x] 4.3 Revisar lint/types en archivos modificados y corregir regresiones antes de cerrar el change.

## Phase 5: Ajustes funcionales adicionales en tabla y fondeo

- [x] 5.1 Ajustar orden de lista de negocios por creación reciente con desempate determinístico en `src/app/api/negocios/route.ts` (`createdAt desc`, `idBusiness desc`).
- [x] 5.2 Sincronizar expectativas en `src/app/api/negocios/__tests__/business-list.route.test.ts` para el nuevo `orderBy` compuesto.
- [x] 5.3 Rehabilitar sort en columnas `Estado` y `Fecha creación` en `src/features/negocios/components/BusinessTableSection.tsx`.
- [x] 5.4 Agregar confirmación de usuario previa al fondeo directo en `src/app/dashboard/negocios/negocios-page-client.tsx`.
- [x] 5.5 Agregar estado de procesamiento (loader en botón Confirmar) durante fondeo en `src/app/dashboard/negocios/negocios-page-client.tsx`.
- [x] 5.6 Excluir anualidades del modal de confirmación: cuando `hasAnnualPayments` sea true, abrir flujo anual directamente.

## Phase 6: Cobertura de escenarios UI agregados en spec

- [x] 6.1 Crear `src/app/dashboard/negocios/__tests__/negocios-page-client.fondear-confirmation.test.tsx` para validar que negocios sin anualidades muestran confirmación previa.
- [x] 6.2 En el mismo test, cubrir cancelación de confirmación: no debe ejecutarse `fondearBusiness`.
- [x] 6.3 En el mismo test, cubrir estado de procesamiento: botón Confirmar muestra loader y deshabilita acciones durante la operación.
- [x] 6.4 En el mismo test, cubrir bypass de confirmación para anualidades: al fondear con `hasAnnualPayments`, abre flujo anual directamente.
- [x] 6.5 Agregar prueba de orden estable por creación en `src/app/api/negocios/__tests__/business-list.route.test.ts` para empate de `createdAt` y desempate por `idBusiness`.
- [x] 6.6 Ejecutar suite focalizada de `negocios` (API + UI nuevo) y actualizar `verify-report.md` con evidencia de estos escenarios.
- [x] 6.7 Cubrir en RTL el escenario «últimos creados primero» en `src/app/dashboard/negocios/__tests__/negocios-page-client.business-list-sort.test.tsx` (orden recibido por `MisNegociosPage`).
