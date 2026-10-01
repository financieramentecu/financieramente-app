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
