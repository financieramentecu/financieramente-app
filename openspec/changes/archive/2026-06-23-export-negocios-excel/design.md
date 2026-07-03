# Design: Export Negocios a Excel para Niveles de Jerarquía 2-6

## Technical Approach

Dos cambios ortogonales sobre la exportación existente (H5): (1) un gate de autorización centralizado por `Level.code` que habilita Nivel 2-6 además de los roles admin-like, consumido por cliente y servidor; (2) corregir el bug de scope inyectando `visibleUserIds` en el endpoint de export con un helper compartido reutilizado por `GET /api/negocios`. No se construye exportación nueva ni se tocan columnas/formato.

## Architecture Decisions

### Decision: Mecanismo de gating por nivel

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| (1) Lista fija de `Level.code` (`LEVEL_2..LEVEL_5`, `GENERAL_LEVEL`) | Simple, cero I/O, testeable puro. Frágil si se insertan niveles intermedios | **ELEGIDA** |
| (2) Recorrer cadena `idNextLevel` en runtime | Robusto a cambios de catálogo. Añade query(s) por request y lógica de grafo en hot path de auth | Rechazada |
| (3) Campo numérico `rank` en `Level` (migración) | Comparación trivial `rank>=2 && rank<=6`. Requiere migración + backfill + ERD + mantener rank coherente con `idNextLevel` | Rechazada |

**Choice**: Constante `EXPORT_LEVEL_CODES` con los 5 codes del rango 2-6, comparada contra `user.level.code`.
**Rationale**: El catálogo de niveles es estable (7 codes seedeados, `code` es `@unique`). No existe campo de rank hoy; introducirlo (opción 3) es una migración estructural desproporcionada para un set fijo, y duplica la fuente de verdad del orden (rank vs `idNextLevel`). La opción 2 paga I/O de grafo en cada request de auth sin beneficio real mientras el catálogo no cambie. La lista fija sigue el patrón existente `canX(code)` de `roles.ts` (ej. `ROLES_CAN_FUND_PAYMENTS`). Si en el futuro se insertan niveles, se ajusta una constante de una sola línea — costo de cambio bajo y explícito.

### Decision: Ubicación y forma del helper de gating

**Choice**: Nuevo módulo `src/features/negocios/lib/can-export-business-list.ts` con `canExportBusinessList({ roleCode, levelCode })`. Reglas: `isExportAdminRole(roleCode) || EXPORT_LEVEL_CODES.includes(levelCode)`. Reexporta/reutiliza la noción admin-like ya existente.
**Alternatives considered**: ubicarlo en `src/features/auth/lib/roles.ts` (mezcla niveles con roles, viola ISP); duplicar la lógica en route y componente (la propuesta lo prohíbe explícitamente).
**Rationale**: La regla "quién puede exportar la lista de negocios" es conocimiento del dominio `negocios`, no de `auth` genérico (Screaming Architecture). El helper recibe primitivos (`roleCode`, `levelCode`), no la entidad completa, para ser puro, server/client-safe (sin Prisma) y trivialmente testeable. Cliente (`canExportExcel`) y servidor (`export/route.ts`) importan exactamente la misma función → cero divergencia.

### Decision: Helper compartido para visibleUserIds (fix de scope)

**Choice**: Extraer `resolveVisibleUserIds(prisma, currentUser)` en `src/features/negocios/services/user-hierarchy.service.ts`, que encapsula la regla actual del GET (`isAdmin ? undefined : [self, ...getSubordinateUserIds()]`). GET y export lo consumen.
**Alternatives considered**: copiar el bloque `isAdmin/getSubordinateUserIds` al export (duplicación, riesgo de drift); pasar `visibleUserIds` desde el cliente (inseguro — el cliente no es fuente de verdad de scope).
**Rationale**: Hoy el GET calcula `visibleUserIds` inline (route.ts líneas 122-134) y el export NO lo pasa — ese es el bug crítico de fuga. Centralizar la regla en el service de jerarquía elimina la duplicación y garantiza paridad permanente entre listado y export. El export pasa `{ visibleUserIds }` a `buildBusinessListWhere`, que ya soporta `BuildBusinessListWhereOptions`.

### Decision: Auditoría de la exportación

**Choice**: SÍ loguear vía `logAuditEvent` con nuevo `AuditAction.BUSINESS_EXPORTED`, tras pasar el gate y resolver el total. `details` incluye total de filas y resumen de filtros; nunca bloquea (logAuditEvent swallow).
**Rationale**: Es lectura masiva de datos comerciales sensibles (clientes, valores, cadena de líderes) por un set ampliado de usuarios. Aunque no muta datos, la convención del proyecto exige trazabilidad de operaciones sensibles y el patrón `ENTITY_ACTION` ya cubre lecturas relevantes. No omitirlo silenciosamente: se decide explícitamente registrarlo.

## Data Flow

    Cliente (negocios-page-client)                Servidor (export/route)
      _currentUser{role,level}                       session → getCurrentUser(+level)
            │                                               │
            ▼                                               ▼
      canExportBusinessList ──── misma fn ────► canExportBusinessList → 403 si no
            │ (habilita botón)                              │
            ▼                                               ▼
      handleExportExcel ─ POST filtros ─► resolveVisibleUserIds(prisma,user)
                                                            │
                                                            ▼
                                          buildBusinessListWhere(user, filters, {visibleUserIds})
                                                            │
                                          count → 404/413 → findMany → xlsx → logAuditEvent(BUSINESS_EXPORTED)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/negocios/lib/can-export-business-list.ts` | Create | `EXPORT_LEVEL_CODES` + `canExportBusinessList({roleCode,levelCode})`; helper puro compartido |
| `src/features/negocios/services/user-hierarchy.service.ts` | Modify | Añadir `resolveVisibleUserIds(prisma,currentUser)` (extrae regla del GET) |
| `src/features/negocios/services/user.service.ts` | Modify | `getCurrentUserByEmail` incluye `level: { select: { code: true } }` |
| `src/features/negocios/types/business.types.ts` | Modify | `UserWithRole` añade `level?: { code: string } | null` (cliente y server) |
| `src/app/api/negocios/export/route.ts` | Modify | Reemplazar `EXPORT_ROLES`/check por `canExportBusinessList`; pasar `visibleUserIds`; `logAuditEvent` |
| `src/app/api/negocios/route.ts` | Modify | GET usa `resolveVisibleUserIds` (elimina bloque inline duplicado) |
| `src/app/dashboard/negocios/negocios-page-client.tsx` | Modify | `canExportExcel` usa `canExportBusinessList` con `role.code`+`level.code` |
| Página servidor de negocios | Modify | Propagar `level.code` al `currentUser` que recibe el client component |
| `src/features/auth/lib/audit-logger.ts` | Modify | Añadir `AuditAction.BUSINESS_EXPORTED` |

## Interfaces / Contracts

```ts
export const EXPORT_LEVEL_CODES = [
  'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5', 'GENERAL_LEVEL',
] as const

export function canExportBusinessList(input: {
  roleCode: string | undefined
  levelCode: string | undefined
}): boolean

// user-hierarchy.service.ts
export function resolveVisibleUserIds(
  prisma: Pick<PrismaClient, 'user'>,
  currentUser: { idUser: number; role?: { code: string } | null }
): Promise<number[] | undefined> // undefined = admin (sin filtro)
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `canExportBusinessList`: admin-role true, level 2-6 true, level 0/1 false, ambos undefined false | Vitest tabla de casos (TDD primero) |
| Unit | `resolveVisibleUserIds`: admin→undefined, scoped→[self,...subs] | Mock `getSubordinateUserIds` |
| Integration | Export Nivel 2-6: filas ⊆ subárbol (sin fuga); paridad con GET; 403 nivel 0/1; 404 sin resultados | Route handler con Prisma mock/test DB |

## Migration / Rollout

No requiere migración Prisma ni cambios en `prisma/ERD.md` (se descartó la opción rank). Cambios aislados y reversibles por revert del PR. El gate por nivel es aditivo: revertir restaura admin-only.

## Open Questions

- [ ] Confirmar el archivo exacto de la página servidor (`src/app/dashboard/negocios/page.tsx`) que arma `currentUser` para inyectar `level.code` — resolver en sdd-tasks/apply.
- [ ] ¿`details` del audit debe truncar filtros largos? Decisión menor para apply.
