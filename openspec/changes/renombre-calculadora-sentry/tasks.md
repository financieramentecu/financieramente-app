# Tasks: Calculadora y Sentry

## Phase 1: Renombre (Calculadora)
- [x] Renombrar `src/features/simulador` a `src/features/calculadora`.
- [x] Renombrar componentes y server actions internos.
- [x] Ajustar la ruta a `/dashboard/calculadora`.
- [x] Actualizar `menu-builder.ts` y textos de Sidebar.

## Phase 2: Bugfix Visual (0% Rendering)
- [x] Identificar línea causante en `calculadora-resultados.tsx`.
- [x] Refactorizar la condición a `result.leadBonus > 0`.

## Phase 3: Observabilidad (Sentry)
- [x] Confirmar outputs del Wizard `@sentry/nextjs`.
- [x] Modificar `instrumentation.ts` para deshabilitar en modo 'development'.
- [x] Modificar `instrumentation-client.ts` para deshabilitar en modo 'development'.
- [x] Proveer setup de `.env` (DSN y Token de Organización `org:ci`).
