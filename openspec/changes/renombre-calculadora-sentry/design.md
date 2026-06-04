# Design: Calculadora y Sentry

## Architecture Decisions

### 1. Renombre y Organización (Screaming Architecture)
Se movieron los dominios de la carpeta `src/features/simulador` a `src/features/calculadora`. Las *Server Actions* asociadas y los clientes de React ahora prefijan sus nombres con `calculadora-`.

### 2. Renderizado Condicional Seguro en React
El renderizado `leadBonus && <Component />` expone el riesgo de pintar "0" en el DOM porque en Javascript `0` es un valor falsy válido que React no omite. La solución implementada es:
```tsx
{result.leadBonus > 0 && <Component />}
```
Forzando una evaluación estrictamente booleana, React omite el renderizado limpiamente.

### 3. Sentry Next.js SDK Integrations
Sentry ha sido implementado utilizando la versión compatible con Turbopack y App Router de Next.js.
- **next.config.ts**: `withSentryConfig` inyecta plugins para mapas de origen durante el build.
- **instrumentation**: Intercepta todo el ciclo de vida del servidor de Node.js y Edge Runtime con la condición explícita `process.env.NODE_ENV !== 'development'`.
