# Proposal: Renombre de Calculadora y Monitoreo con Sentry

## Intent
Mejorar la semántica de la herramienta de comisiones (Simulador -> Calculadora), corregir errores visuales en el renderizado de la UI, y asegurar la observabilidad en producción integrando Sentry sin afectar la experiencia de desarrollo.

## Context
1. La herramienta se llamaba "Simulador" pero ofrece un cálculo determinista; "Calculadora" es más preciso.
2. Un problema en React renderizaba el valor `0` suelto cuando el bono por lead era cero.
3. Se requiere monitoreo para asegurar la estabilidad en producción.

## Proposed Solution
- Migrar archivos y rutas de `simulador` a `calculadora`.
- Refactorizar las condiciones falsy (`&&`) a estrictamente booleanas (`> 0`) en los componentes de React.
- Configurar el SDK de Sentry (`@sentry/nextjs`) condicionado a `NODE_ENV !== "development"` en la capa de instrumentación.
