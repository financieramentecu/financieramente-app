# Design: HU4 — Fondeo con anualidades

## Technical Approach

Dos rutas App Router: **`GET .../annual-payments`** (solo cuotas ordenadas + auth igual que **`GET .../[id]`**) y **`POST .../fondear-anualidades`** (cuerpo Zod, `$transaction`, auditoría **`BUSINESS_ANNUAL_FUNDED`**). **`POST .../fondear`** permanece como HU3 y rechaza si hay filas `AnnualPayment`. Cliente: `business.service` + `use-business-mutation`; **`negocios-page-client`** abre **`AnnualFundingModal`** cuando `hasAnnualPayments`, pasa **`contract`** al título. Listado: **`BusinessTableSection`** (DataTable real) y **`ActionCell`** (RTL) comparten gates **`showFondearDirect` / `showFondearAnnual`** y copy en **`fondear-action-copy.ts`**. Lista API incluye **`hasPendingAnnualFunding`** (`annualPayments` filtradas `SIN_FONDEAR` en mapper).

## Architecture Decisions

| Decision | Choice | Alternativa | Razón |
|----------|--------|-------------|-------|
| Lectura cuotas | `GET .../annual-payments` dedicado | Query shape en `GET [id]` | Menos coupling; listas no cargan cuotas siempre |
| Payload POST | `{ fundedInstallmentIndexes: number[] }` único submit | Snapshot completo | Payload pequeño; servidor ignora índices ya `FONDEADO` |
| Padre admitido | `EMITIDO` ó (`FONDEADO` + existe `SIN_FONDEAR`) | Solo `EMITIDO` | Segundas tandas HU4 |
| `dateAnchored` negocio | Un `now()` por transacción al pasar `EMITIDO→FONDEADO` | Timestamp por cuota distinto | Filtro global PRD |
| Auditoría | `BUSINESS_ANNUAL_FUNDED` | Reusar `BUSINESS_FUNDED` | Traza operativa separada |
| UX listado | «Fondear» vs «Fondear anualidad» + tooltip | Una etiqueta | Dos flujos distintos |
| Toolbar vs tests | **`BusinessTableSection`** + **`ActionCell`** mismas reglas | Solo cell | **`MisNegociosPage`** usa DataTable |
| Modal título | Contrato desde fila lista; fallback id | Solo `#id` | UX acordado |

## Data Flow

```
 Lista (gates directo/anual)
   → clic Fondear / Fondear anualidad
   → GET annual-payments
   → Modal (checkbox SIN_FONDEAR; fechas si FONDEADO)
   → POST fondear-anualidades
   → tx: AnnualPayment + Business opcional → audit → ApiResponse BusinessEntity
   → refetch + toast (hook)
```

## File Changes

| Path | Action | Rol |
|------|--------|-----|
| `api/negocios/[id]/annual-payments/route.ts` | Create | GET ordenado, guard AGENTE |
| `api/negocios/[id]/fondear-anualidades/route.ts` | Create | POST Zod + tx + audit |
| `features/negocios/lib/fondear-anualidades.schema.ts` | Create | Validación body |
| `features/auth/lib/audit-logger.ts` | Modify | `BUSINESS_ANNUAL_FUNDED` |
| `features/negocios/services/business.service.ts` | Modify | Cliente GET/POST |
| `features/negocios/hooks/use-business-mutation.ts` | Modify | `fondearAnualidadesBusiness` |
| `features/negocios/lib/fondear-action-copy.ts` | Create/extend | Labels + tooltips |
| `components/modals/AnnualFundingModal.tsx` | Create | `contractLabel`, installments |
| `BusinessTable/ActionCell.tsx` | Modify | `hasPendingAnnualFunding`, labels |
| `BusinessTableSection.tsx` | Modify | Toolbar DataTable, mismas labels |
| `dashboard/negocios/negocios-page-client.tsx` | Modify | Estado modal + `annualFundingContract` |
| `types/business-prisma.types.ts`, mapper, `business.types` | Modify | `hasPendingAnnualFunding` |
| `**/fondear-anualidades/__tests__/`, annual-payments tests, schema test, action-cell test` | Create/upd | Vitest |

## Interfaces / Contracts

**POST body:** `{ fundedInstallmentIndexes: z.array(z.number().int().min(1)).min(1) }` (dedupe en schema si aplica).

**GET annual-payments:** `ApiResponse<{ businessId, status, installments[] }>` con `installmentIndex`, `status`, `dateAnchored`.

**POST éxito:** `ApiResponse<BusinessEntity>` con mismo include que **`fondear`**.

## Testing Strategy

| Capa | Objetivo | Enfoque |
|------|----------|---------|
| Unit | Zod schema | Vitest |
| Integration | GET/POST rutas (401/400/403/404, txn mock) | Prisma mocks como **`fondear/__tests__`** |
| Component | Botón listado anual/directo | RTL **`ActionCell`** |
| Modal | Título contrato / lista | RTL opcional (gap histórico verify) |

## Migration / Rollout

Sin migración: tabla `annual_payment` existente.

## Open Questions

- [ ] Rol **Líder** vs **AGENTE** en guards: sin cambio; replicar reglas listado hasta definición HU3.
