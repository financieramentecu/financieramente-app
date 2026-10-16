# Explore: Indicador de Comentarios en Lista de Negocios

## Objetivo
Investigar viabilidad técnica de agregar un indicador visual (ícono + contador) de comentarios en la columna de Acciones de la tabla de Negocios.

## Descubrimientos Clave

### ✅ Infraestructura Existente
- **Feature comentarios**: Completamente implementada en `src/features/comments/`
  - Modelo Prisma: `Comment` (vinculado a `Business` y `User`)
  - Servicio: `getCommentsByBusinessId()` disponible
  - Hook: `useComments()` con soporte SSE tiempo real
  - API: Endpoints para crear y listar comentarios
  - Tests: Cobertura completa

- **Tabla de negocios**: `src/features/negocios/components/BusinessTableSection.tsx`
  - Componente `ActionCell.tsx` con botones de acciones (editar, ver, fondear, cancelar)
  - Framework: TanStack React Table
  - Estructura flexible para agregar nuevas acciones

### Arquitectura Base
```
Business (Prisma model)
  ├─ id: Int
  ├─ clientName: String
  ├─ status: BusinessStatus
  └─ comments: Comment[] (relación)
       ├─ author: User
       ├─ title: String
       ├─ detail: String
       └─ createdAt: DateTime
```

### Componentes Disponibles
- UI Components (shared): Dialog, Button, Badge, Icon, Tooltip
- Lucide React Icons: MessageCircle (perfecto para indicador)
- Fecha: `formatDateBogota()` para formatear comentarios

## Solución Propuesta

### 3 Componentes Nuevos/Modificados

**1. API Endpoint (nuevo)**
- Ruta: `GET /api/businesses/:businessId/comments/count`
- Razón: Obtener solo contador sin cargar lista completa
- Respuesta: `{ count: number }`

**2. CommentsModal (nuevo)**
- Componente modal que:
  - Carga comentarios con `useComments(businessId)`
  - Muestra historial ordenado por fecha
  - Maneja SSE para actualizaciones en tiempo real
  - Estados: loading, error, empty, success

**3. Modificaciones Existentes**
- `ActionCell.tsx`: Agregar prop `commentCount` y renderizar ícono + contador
- `BusinessTableSection.tsx`: 
  - Cargar `commentCount` para cada negocio
  - Pasar a ActionCell
  - Manejar estado del modal

## Riesgos y Mitigaciones

| Riesgo | Severidad | Mitigación |
|--------|-----------|-----------|
| Rendimiento: N queries por fila | Media | Usar endpoint optimizado de count, no full list |
| Sincronización en tiempo real | Baja | Ya implementada via SSE en useComments() |
| Permisos | Baja | Reutilizar validación existente de Prisma |
| Mobile responsiveness | Baja | Usar responsive design del proyecto |

## Criterios de Aceptación (Usuario)

✅ Escenario 1: Mostrar ícono + contador si hay comentarios  
✅ Escenario 2: Ocultar si no hay comentarios  
✅ Escenario 3: Click abre modal con historial completo

## Estimación
- **Análisis**: ✅ 2 horas completadas
- **Especificación**: 2 horas (siguiente)
- **Diseño**: 1-2 horas
- **Implementación**: 3-4 tareas (~6-8 horas)
- **Testing**: 1-2 horas
- **Total**: ~12-16 horas

## Recomendación
**Proceder a especificación** — infraestructura base es sólida, riesgos son bajos, arquitectura es clara.

---
Exploración completada: 2026-09-30  
Siguiente artefacto: `proposal.md`

---

## Post-exploration corrections

The following verified facts supersede earlier statements in this file (written in English; the original text above is kept unchanged).

1. The Actions column is rendered by `src/features/negocios/components/BusinessRowActions.tsx` (used by `BusinessTableSection.tsx`), not by `BusinessTable/ActionCell.tsx`. `ActionCell.tsx` is dead code, referenced only by its own test, and MUST NOT be modified.
2. There is no need for `GET /api/businesses/:id/comments/count`: the real API prefix is `/api/negocios`, and a per-row count request would cause N requests. The list endpoint `GET /api/negocios` already uses `businessWithRelations`, whose `_count` selection already provides `payments` and active `supports`. The count is obtained by adding `comments: { where: { status: true } }` to that selection and mapping it to `commentCount` on `BusinessEntity` (via `prismaBusinessToEntity`), then to the table-row model. No new endpoint, no migration, no schema change.
3. The `Comment` model has `status Boolean @default(true)` (soft delete) and `@@index([businessId, createdAt])`; the relation field on `Business` is `comments`.
4. Existing comments feature to reuse: `useComments(businessId)` (with SSE `comment-added`), `CommentThread`, `CommentItem`, and `CommentsSidebar` (state handling reference). `CommentModal` is the CREATE dialog ("Agregar comentario") and must not be repurposed. `GET /api/negocios/[id]/comments` returns active comments ordered oldest first and requires only a session.
5. The shared Dialog lives at `@/features/shared/ui/dialog`; scroll area at `@/features/shared/ui/scroll-area`; badge at `@/features/shared/ui/badge`.
6. The modal is read-only and mounted only while open; the indicator is visible to every role that can see the list, including read-only roles.
7. Additional finding during spec: `formatDateBogota()` formats the date only (no time), and `CommentItem` formats timestamps with `toLocaleString('es-AR')` without a timezone, so the Bogotá date-time requirement needs a decision (spec open question (d)).
8. The proposal's role list (ANALISTA_SOPORTE/AGENTE/ADMIN) was unverified and was removed.
