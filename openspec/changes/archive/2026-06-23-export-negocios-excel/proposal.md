# Proposal: Export Negocios a Excel para Niveles de Jerarquía 2-6

## Intent

Hoy el botón "Exportar Excel" de la Lista de Negocios solo está habilitado para roles admin-like (gate por `UserRole`). Los usuarios con jerarquía Nivel 2 (Team Leader) a Nivel 6 (MIA) no pueden exportar su propia gestión y dependen de un Analista Operativo. La exportación a Excel YA EXISTE (feature H5: endpoint, hook, cap de filas, empty-state); el problema es de AUTORIZACIÓN y de ALCANCE de datos, no de construir exportación nueva.

Habilitar export para Nivel 2-6 sin más expone un BUG CRÍTICO de fuga de información: `POST /api/negocios/export/route.ts` nunca pasa `visibleUserIds` a `buildBusinessListWhere` (hoy "funciona" porque los exportadores admin resuelven `isAdmin=true` y saltan la rama de scope). Para no-admins, esto exportaría negocios fuera del árbol jerárquico del usuario (viola criterio #2).

## Scope

### In Scope
- Corregir el bug de scope en `POST /api/negocios/export/route.ts`: calcular y pasar `visibleUserIds` (vía `getSubordinateUserIds`) a `buildBusinessListWhere`, igual que `GET /api/negocios/route.ts`.
- Introducir gate de autorización por Nivel de jerarquía (2-6) que habilite la exportación, coexistiendo o reemplazando el gate actual por `UserRole`.
- Centralizar la lógica de gate en un único helper reutilizable por cliente (`canExportExcel` en `negocios-page-client.tsx`) y servidor (`EXPORT_ROLES`/route), eliminando la duplicación actual.

### Out of Scope
- Construir la exportación a Excel desde cero (ya existe — H5).
- Definir el MECANISMO EXACTO de mapeo "Nivel 2-6 → autorización" (lista fija de codes, posición en cadena `idNextLevel`, o campo numérico nuevo). Decisión diferida a **sdd-design**.
- Cambiar columnas, formato del archivo, o lógica de filtros (paridad filtro-export ya garantizada).
- Optimización de performance para árboles grandes (MIA): se valida, no se rediseña aquí.
- Empty-state "No hay registros para exportar" (criterio #4) — ya implementado (404 cuando total===0).

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `negocios`: añade requisito de que la exportación a Excel DEBE estar habilitada para usuarios con jerarquía Nivel 2-6 y DEBE restringir las filas exportadas al alcance del árbol jerárquico del usuario (paridad con la lista visible en `GET /api/negocios`).

## Approach

1. **Fix de scope (bug)**: replicar en el endpoint de export el wiring de `visibleUserIds` que ya hace el endpoint de lista, reutilizando `getSubordinateUserIds` (cacheado) y `buildBusinessListWhere(currentUser, filters, { visibleUserIds })`.
2. **Gate por Nivel**: introducir un helper de autorización centralizado (patrón `canX(...)` de `roles.ts`) que decida la habilitación de export por posición jerárquica. El mecanismo concreto se resuelve en design; la propuesta solo fija que existe UN helper, consumido por cliente y servidor.
3. **Centralización**: cliente y servidor importan el mismo helper para evitar divergencia entre `canExportExcel` (UI) y `EXPORT_ROLES` (route).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/negocios/export/route.ts` | Modified | Pasar `visibleUserIds`; consumir nuevo gate por Nivel |
| `src/features/negocios/lib/build-business-list-where.ts` | Verified | Confirmar rama de scope para no-admin |
| `src/features/negocios/services/user-hierarchy.service.ts` | Reused | `getSubordinateUserIds` (BFS cacheado) |
| `src/features/auth/lib/roles.ts` (o nuevo helper) | New/Modified | Helper centralizado de gate por Nivel |
| `src/app/dashboard/negocios/negocios-page-client.tsx` | Modified | `canExportExcel` consume el helper centralizado |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Fuga de datos si el fix de scope queda incompleto | High | Tests de integración del endpoint export validando rows ⊆ subárbol; paridad con GET lista |
| Mapeo "Nivel 2-6" mal modelado (decisión abierta) | Med | Resolver en sdd-design con opciones evaluadas antes de implementar |
| Performance en árboles grandes (MIA) | Med | Reutilizar cache de `getSubordinateUserIds`; validar con datos reales; cap `EXPORT_MAX_ROWS=5000` ya existe |
| Divergencia cliente/servidor del gate | Med | Helper único compartido; test que cubra ambos consumidores |

## Rollback Plan

Cambios aislados y reversibles por revert del PR. El gate por Nivel se introduce como adición; si falla, revertir a `EXPORT_ROLES` actual restaura el comportamiento admin-only. El fix de scope es independiente y puede mantenerse aunque se revierta el gate (mejora la corrección sin ampliar acceso).

## Dependencies

- Modelo `Level` y cadena `idNextLevel` (seed `prisma/seeds/level.ts`); `User.idUserLeader` para BFS.
- `xlsx-js-style` ya instalado — sin nuevas dependencias.

## Success Criteria

- [ ] Usuario Nivel 2-6 ve habilitado "Exportar Excel" (mismo comportamiento en todo el rango).
- [ ] El archivo exportado contiene SOLO negocios dentro del subárbol jerárquico del usuario (sin fuga).
- [ ] La exportación respeta los filtros avanzados aplicados (paridad con la tabla visible).
- [ ] Sin filtros, exporta el total visible según alcance de jerarquía.
- [ ] Filtros sin resultados muestran "No hay registros para exportar" (ya cubierto).
- [ ] Gate de autorización definido en UN solo lugar, consumido por cliente y servidor.
