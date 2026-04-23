# Design: `date_issued` en negocio emitido (HU2)

## Technical Approach

Añadir `dateIssued` nullable en `Business`, rellenarlo **solo** en la primera vez que el registro queda **`EMITIDO`** (misma regla que el proposal: crear con contrato **o** `PUT` desde `VENTA_EFECTUADA`). Reutilizar `determineBusinessStatus` y la rama existente del `PUT` que calcula `newStatus`; extender `data` del `create`/`update` de Prisma. Serializar como ISO string en `BusinessEntity`, igual que `createdAt`.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|----------------|-----------|
| Semántica | Set once at first `EMITIDO`; never overwrite on contract typo fix | Actualizar en cada cambio de contrato | Conserva “fecha de emisión” como hito; acuerdo PRD HU2/H6 |
| Timestamp | `new Date()` en servidor en el mismo request que persiste emisión | Solo fecha Colombia sin hora | Consistente con Prisma UTC; formato local en UI después |
| Nullabilidad | `dateIssued` opcional permanente | NOT NULL tras backfill | Migración sin bloquear deploy; históricos pueden quedar null |
| API JSON | Propiedad `dateIssued` (camelCase) | `date_issued` | Alineado a `createdAt`, `business-entity.types` |

## Data Flow

```
Cliente / Form
    → createBusiness (Server Action) o PUT /api/negocios/:id
        → prisma.business.create | update
            ← dateIssued si transición/regla EMITIDO inicial
    → prismaBusinessToEntity (GET lista/detalle)
        ← { ..., dateIssued: string | null }
```

No nuevo endpoint: cualquier lista/detalle que ya usa `prismaBusinessToEntity` expone el campo.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | `dateIssued DateTime? @map("date_issued")` en `Business` |
| `prisma/migrations/**` | Create | Migración SQL añade columna nullable |
| `src/features/negocios/actions/create-business.ts` | Modify | En `business.create`, si `status === EMITIDO`, `dateIssued: new Date()` |
| `src/app/api/negocios/[id]/route.ts` | Modify | En `update` de contrato: si `VENTA_EFECTUADA` → `EMITIDO`, `dateIssued: existing.dateIssued ?? new Date()` |
| `src/features/negocios/types/business-entity.types.ts` | Modify | `dateIssued: string \| null` |
| `src/features/negocios/mappers/business-entity.mapper.ts` | Modify | `dateIssued: prisma.dateIssued?.toISOString() ?? null` |
| `src/features/negocios/lib/business-api.schemas.ts` | Modify | `businessEntitySchema`: `dateIssued: z.string().datetime().nullable()` o equivalente opcional |
| `src/features/negocios/__tests__/fixtures/mock-business.ts` | Modify | Añadir `dateIssued` en factory |
| `__tests__/mappers/business-entity.mapper.test.ts` | Modify | Casos null / ISO |
| `__tests__/actions/create-business.test.ts` | Modify | Assert `dateIssued` cuando hay contrato |
| `src/app/api/negocios/[id]/__tests__/route.test.ts` | Modify | PUT primera emisión setea fecha |

## Interfaces / Contracts

```typescript
// business-entity.types.ts (añadir)
dateIssued: string | null // ISO 8601; null si nunca emitido o legacy sin backfill
```

`UpdateBusinessRequest` sin cambios: `dateIssued` no es input del cliente.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | Mapper null y con fecha | `business-entity.mapper.test.ts` |
| Unit | Create con/sin contrato | `create-business.test.ts` mockea Prisma y revisa `data` del `create` |
| Integration | PUT transición VE→EMITIDO | `business-id.route.test.ts` JSON `data.dateIssued` definido una vez |

E2E: opcional en esta historia (UI columna fuera de scope).

## Migration / Rollout

1. Deploy migración antes o con código que solo **lee** columna nueva (nullable).
2. Opcional posterior: SQL `UPDATE business SET date_issued = updated_at WHERE status = 'EMITIDO' AND date_issued IS NULL` si producto exige densidad en reporting — documentar fuera del MVP implementación core.

Rollback: revert migración según `proposal.md`; código nuevo incompatible sin columna — evitar rollback de esquema sin revertir app.

## Open Questions

- [ ] ¿Backfill automático en la misma migración o tarea manual? — **Producto / datos** (no bloquea implementación).
- [ ] ¿Listado debe ordenar/filtrar por `dateIssued` en v1? — **Fuera de scope** propuesta; solo exposición en entidad.
