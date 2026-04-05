## Why

Coaches and agents need to visualize their accumulated Clawback reserve in real-time to understand how much money is being retained. Currently, there is no visual indicator for this metric in their dashboard or during business registration.

## What Changes

- **Dashboard**: Add a "Reserva de Clawback" KPI card showing the total accumulated amount for the logged-in agent.
- **Business Form**: Add a "Reserva de Clawback" KPI card above the business registration form.
- **Services**: Update backend services to fetch `totalAmount` from `ClawbackBalance`.
- **Seed**: Update seed files to include an Agent user and a testing `ClawbackBalance` record.

## Capabilities

### New Capabilities
- `clawback-kpi`: Displays the accumulated clawback reserve for the agent in the dashboard and business form.

### Modified Capabilities
<!-- No requirement changes to existing specs -->

## Impact

- **Backend**: `agent.service.ts` to include clawback balance fetching.
- **Frontend**: Dashboard (`/dashboard/agente`) and Business Creation (`/dashboard/negocios/crear`).
- **Data**: `ClawbackBalance` table querying.
- **Seed**: `prisma/seeds/user.ts` and new `prisma/seeds/clawback.ts`.
