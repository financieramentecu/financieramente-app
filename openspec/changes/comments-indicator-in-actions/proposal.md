# Proposal: Indicador de Comentarios en Lista de Negocios

## Síntesis

Agregar un **indicador visual de comentarios** (ícono de mensaje + contador exacto) en la columna de Acciones de la tabla de Negocios, permitiendo que los usuarios identifiquen rápidamente cuántos comentarios tiene cada negocio y accedan a su historial mediante un modal, sin necesidad de ingresar al detalle completo del negocio.

## Problema

### Situación Actual
Los usuarios que necesitan consultar notas/comentarios sobre negocios deben:
1. Hacer clic en "Ver" para abrir el detalle del negocio
2. Navegar a la sección de comentarios
3. Revisar el historial completo

Esta fricción es ineficiente cuando:
- Se necesita revisar múltiples negocios rápidamente
- Solo se busca confirmar si existen comentarios
- El usuario está en modo "scanning" de la tabla

### Impacto
- **Usuarios afectados**: ANALISTA_SOPORTE, AGENTE, ADMIN (roles que revisan comentarios frecuentemente)
- **Frecuencia**: Daily workflows en revisión de carteras
- **Oportunidad**: Mejora significativa en UX sin complejidad técnica

## Solución

### Criterios de Aceptación

**CA1: Visualización del indicador con cifra exacta**
```
DADO que un negocio registrado posee 1+ comentarios
CUANDO la tabla se carga o se agregan comentarios
ENTONCES el sistema despliega en la columna Acciones 
  un ícono de mensaje acompañado del número exacto de comentarios
  Ejemplos: "1", "12", "145"
```

**CA2: Ocultamiento cuando no hay comentarios**
```
DADO que un negocio NO tiene comentarios (count = 0)
CUANDO la tabla se carga
ENTONCES el sistema omite completamente el ícono de mensaje
  en la columna Acciones
```

**CA3: Apertura del historial mediante modal**
```
DADO que el usuario visualiza el ícono de mensajes con contador
CUANDO hace clic sobre el ícono
ENTONCES el sistema abre un modal que despliega:
  - Título: "Comentarios de [Contract/BusinessID]"
  - Lista de comentarios ordenados cronológicamente
  - Información de autor (nombre, rol)
  - Fecha y hora formateadas en Bogotá
  - Estados: loading, error, empty, success
```

## Alcance

### Incluido ✅
- Indicador visual con contador en ActionCell
- Modal con historial de comentarios
- API endpoint para obtener conteo optimizado
- Integración con BusinessTableSection
- SSE updates (real-time cuando se agregan comentarios)
- Tests unitarios e integración
- Responsive design (mobile-first)

### Excluido ❌
- Crear/editar comentarios desde el modal (usar detail page)
- Filtros o búsqueda de comentarios
- Exportar comentarios
- Cambios al modelo Prisma

## Arquitectura

### Diagrama de Flujo
```
BusinessTableSection (parent)
  │
  ├─ fetch businesses + commentCounts
  │   └─ GET /api/businesses/[id]/comments/count
  │
  ├─ para cada Business:
  │   └─ ActionCell
  │       ├─ props: { businessId, commentCount, onViewComments }
  │       ├─ render: ícono + contador (si count > 0)
  │       └─ onClick: onViewComments(businessId)
  │
  └─ state: { selectedBusiness, isModalOpen }
      └─ CommentsModal
          ├─ businessId: number
          ├─ useComments(businessId) → { state, refetch }
          └─ render: lista de comentarios + SSE updates
```

### Componentes Arquitectura

| Componente | Ubicación | Tipo | Acción |
|-----------|-----------|------|--------|
| **API Endpoint** | `src/app/api/businesses/[id]/comments/count/route.ts` | Nuevo | Crear |
| **CommentsModal** | `src/features/negocios/components/CommentsModal.tsx` | Nuevo | Crear |
| **ActionCell** | `src/features/negocios/components/BusinessTable/ActionCell.tsx` | Existente | Modificar |
| **BusinessTableSection** | `src/features/negocios/components/BusinessTableSection.tsx` | Existente | Modificar |
| **useComments** | `src/features/comments/hooks/use-comments.ts` | Existente | Reutilizar |

## Dependencias

✅ **Todas disponibles:**
- Feature `comments` (tipos, servicios, hooks, API)
- Prisma ORM con modelo Comment
- React 19 + TypeScript
- TanStack React Table
- Lucide React (ícono MessageCircle)
- Componentes UI compartidos (Dialog, Badge, Button)
- SSE infrastructure (EventSource para updates)

## Riesgos

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|--------|-----------|
| 1 | Rendimiento: N queries por tabla | Media | Bajo | Usar GET /count (no full list) |
| 2 | Desfase SSE vs contador | Baja | Bajo | useComments() ya maneja SSE |
| 3 | Permisos insuficientes en modal | Baja | Medio | Reutilizar validación Prisma |
| 4 | Modal overflow en móviles | Baja | Bajo | Responsive dialog existente |

## Estimación

| Actividad | Horas | Notas |
|-----------|-------|-------|
| Especificación | 2 | Definir requests/responses |
| Diseño | 1-2 | Confirmar ícono, styling, layout modal |
| Implementación | 6-8 | 4 tasks principales |
| Testing | 2-3 | Unit + integration |
| Review + Deploy | 1 | PR + merge |
| **Total** | **12-16** | |

## Costo-Beneficio

### Beneficios
- ✅ Mejora significativa en UX para workflows frecuentes
- ✅ Sin cambios al modelo de datos
- ✅ Bajo riesgo técnico (infraestructura ya existe)
- ✅ Rápido de implementar (~2-3 días)

### Costo
- ⚠ 12-16 horas de desarrollo
- ⚠ Maintenance menor: endpoint + modal tests
- ⚠ No requiere migración DB

**Veredicto**: **Alta prioridad** — ROI alto con riesgo bajo.

## Referencias

- Especificación completa: `spec.md`
- Diseño técnico: `design.md`
- Plan de tareas: `tasks.md`
- Feature comentarios: `src/features/comments/`
- Tabla negocios: `src/features/negocios/components/BusinessTableSection.tsx`

---

**Propuesta completada**: 2026-09-30  
**Estado**: ✅ Listo para especificación  
**Siguiente**: Revisar y aprobar propuesta → Crear `spec.md`
