## 1. Backend & Services

- [x] 1.1 Crear función `getClawbackBalance(userId: number)` en `src/features/shared/services/agent.service.ts` que devuelva el `totalAmount` de `ClawbackBalance`.
- [x] 1.2 Actualizar `getAgentDashboardStats` en `agent.service.ts` para incluir `clawbackBalance` en el objeto de retorno.

## 2. Dashboard del Agente

- [x] 2.1 Modificar `src/app/dashboard/agente/page.tsx` para agregar una tarjeta KPI "Reserva de Clawback" usando `stats.clawbackBalance`.

## 3. Formulario de Registro de Negocio

- [x] 3.1 Modificar `src/app/dashboard/negocios/crear/page.tsx` para obtener `clawbackBalance` del usuario actual y pasarlo a `BusinessWrapper`.
- [x] 3.2 Modificar `src/features/negocios/components/business-wrapper.tsx` para recibir `clawbackBalance` y renderizar una tarjeta KPI antes del formulario.

## 4. Actualización del Seed

- [x] 4.1 Modificar `prisma/seeds/user.ts` para crear un usuario de prueba con rol `AGENTE`.
- [x] 4.2 Crear `prisma/seeds/clawback.ts` con la función `seedClawbackBalance` para insertar un registro en `ClawbackBalance`.
- [x] 4.3 Modificar `prisma/seed.ts` para importar y ejecutar `seedClawbackBalance` al final.
