# Design: Visibilidad jerárquica en negocios

## Technical Approach

Añadimos un servicio de jerarquía (`user-hierarchy.service.ts`) que computa, vía BFS en memoria, los `idUser` descendientes del usuario autenticado a partir de `User.idUserLeader`. El handler de `GET /api/negocios` (y `/api/negocios/stats`) llama a ese servicio para roles "scoped" (hoy `AGENTE`) y pasa el set expandido `[self, ...subordinates]` al `buildBusinessListWhere`. Para roles admin la visibilidad sigue siendo total (sin filtro `idUser`).

No se tocan: `prisma/schema.prisma`, mappers, tipos de respuesta, ni la UI.

## Architecture Decisions

| # | Decisión | Alternativa | Razón |
|---|---|---|---|
| 1 | BFS en aplicación con proyección `{idUser, idUserLeader}` para usuarios `status: true` | Recursive CTE con `$queryRaw` | Volumen bajo (cientos a baja miles), evita SQL crudo, idiomático Prisma, fácil de testear |
| 2 | Nuevo servicio `user-hierarchy.service.ts` en `src/features/negocios/services/` | Colocarlo en `shared/` | Único consumidor hoy es negocios; mover a shared cuando aparezca un segundo caller (YAGNI) |
| 3 | `buildBusinessListWhere` recibe `visibleUserIds?: number[]` (pre-computado) en vez de invocar el servicio | Que el where-builder llame a Prisma | Mantiene `buildBusinessListWhere` puro/sincrónico y testeable sin mocks de Prisma |
| 4 | Roles "scoped": `AGENTE` (mismo criterio actual). Resto de roles autenticados con jerarquía: NO se amplía el set de roles filtrados en este change | Aplicar jerarquía a todos los no-admin | El proposal pide visibilidad jerárquica para "leaders". Hoy el único rol filtrado es `AGENTE` y la jerarquía se aplica al `idUser` autenticado vía `idUserLeader`. Cualquier usuario con subordinados (incluido un `AGENTE` líder) los verá. Roles admin siguen viendo todo |
| 5 | Sin cache. BFS por request | Memo request-scoped o Redis | Diferido hasta tener métricas; volumen actual no lo justifica |
| 6 | Stats endpoint usa el mismo helper de jerarquía y pasa `idUser: { in: ids }` directamente al `where` (no usa `buildBusinessListWhere`) | Refactor de stats para usar el where-builder | Stats tiene shape de `where` distinto (group-by por `idCurrency`); cambio mínimo y consistente |
| 7 | Cycle-safety vía `Set<number>` de visitados; root NO se incluye en el resultado del servicio (lo añade el caller) | Incluir root | Servicio queda semánticamente claro: "descendientes" |

## Data Flow

    GET /api/negocios
         │
         ▼
    auth() → getCurrentUserByEmail
         │
         ▼
    isScoped(role)? ── no ──► where = buildBusinessListWhere(user, filters)  // sin visibleUserIds
         │ yes
         ▼
    getSubordinateUserIds(prisma, user.idUser)         // BFS, retorna number[]
         │
         ▼
    visibleUserIds = [user.idUser, ...subordinates]
         │
         ▼
    where = buildBusinessListWhere(user, filters, { visibleUserIds })
         │
         ▼
    prisma.business.findMany({ where, ... })

## File Changes

| File | Action | Description |
|---|---|---|
| `src/features/negocios/services/user-hierarchy.service.ts` | Create | Exporta `getSubordinateUserIds(prisma, rootIdUser): Promise<number[]>` con BFS cycle-safe sobre `User { idUser, idUserLeader, status: true }` |
| `src/features/negocios/lib/build-business-list-where.ts` | Modify | Acepta tercer arg opcional `{ visibleUserIds?: number[] }`. Si está presente y el usuario es scoped, empuja `{ idUser: { in: visibleUserIds } }` en lugar del actual `{ idUser: currentUser.idUser }` |
| `src/app/api/negocios/route.ts` | Modify | Resuelve `visibleUserIds` para roles scoped antes de construir el where |
| `src/app/api/negocios/stats/route.ts` | Modify | Reemplaza `userFilter = currentUser.idUser` por `userFilter = { in: [self, ...subordinates] }` y propaga al `whereClause` de `calculateAggregateForStatus` |
| `src/features/negocios/__tests__/user-hierarchy.service.test.ts` | Create | Casos: cadena lineal, árbol multi-rama, ciclo A→B→A, root sin subordinados, usuarios inactivos excluidos |
| `src/features/negocios/__tests__/build-business-list-where.test.ts` | Modify | Añadir casos con `visibleUserIds` (scoped + admin + sin ids) |

## Interfaces / Contracts

```ts
// src/features/negocios/services/user-hierarchy.service.ts
import type { PrismaClient } from '@prisma/client'

export async function getSubordinateUserIds(
  prisma: PrismaClient,
  rootIdUser: number
): Promise<number[]>
```

```ts
// src/features/negocios/lib/build-business-list-where.ts
export interface BuildBusinessListWhereOptions {
  visibleUserIds?: number[]   // si está presente y user es scoped → idUser IN ids
}

export function buildBusinessListWhere(
  currentUser: { idUser: number; role?: { code: string } | null },
  filters: BusinessListFilterInput,
  options?: BuildBusinessListWhereOptions
): Prisma.BusinessWhereInput
```

Stats `userFilter` pasa de `number | undefined` a `number[] | undefined`; `calculateAggregateForStatus` aplica `{ idUser: { in: userFilter } }` cuando viene definido.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `getSubordinateUserIds`: cadena, árbol, ciclo, root solo, inactivos | Vitest + mock de `prisma.user.findMany` retornando fixtures |
| Unit | `buildBusinessListWhere` con `visibleUserIds` para scoped y admin | Vitest puro (sin Prisma) — verifica shape del `where` |
| Integration | `GET /api/negocios` devuelve negocios de subordinados para un líder `AGENTE` | Test existente de la ruta + seed con jerarquía 2 niveles |
| Integration | `GET /api/negocios/stats` totales consistentes con la lista | Mismo seed, comparar `count` agregado vs `findMany` |

## Migration / Rollout

No migration required. Cambio backwards-compatible para admin (sin filtro). Para `AGENTE` la lista solo se amplía (nunca se reduce) → no rompe contratos del cliente.

## Open Questions

- [ ] ¿Confirmar que NO existen otros roles que hoy deberían tener visibilidad scoped además de `AGENTE`? (Hoy solo `AGENTE` es filtrado en `buildBusinessListWhere`.)
- [ ] ¿Aplicar la misma expansión a `/api/negocios/[id]` (GET por id) para evitar 404 cuando un líder consulta el detalle de un negocio de su sub-team? (Fuera del scope explícito del proposal — confirmar.)
