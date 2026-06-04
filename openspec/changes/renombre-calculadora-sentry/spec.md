# Specification: Calculadora y Sentry

## Requirements

### Funcionales
- **Navegación**: La URL del feature pasa a ser `/dashboard/calculadora`.
- **UI Menu**: El Sidebar muestra "Calculadora" en la sección operativa.
- **Visualización de Bonos**: La tarjeta "Comisión por fuente de leads" es completamente invisible si el monto o porcentaje es 0 (no debe renderizar el número "0").

### Técnicos (Sentry)
- **Activación Condicionada**: Sentry SDK inicia y reporta errores y replays únicamente en ambientes de staging, QA y producción.
- **Ambiente Local**: Ejecutar `npm run dev` no debe inicializar Sentry, evitando ruidos y problemas de latencia en desarrollo.
- **Configuración Completa**: `next.config.ts`, `instrumentation.ts` y `instrumentation-client.ts` deben contar con los wrappers y bindings de Sentry provistos por el Wizard.

## Edge Cases Handled
- Bono de lead `undefined` y nulo ocultados correctamente.
- Sentry Auth Token centralizado en variables de entorno.
