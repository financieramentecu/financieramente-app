# Tasks: Indicador de Comentarios en Lista de Negocios

**Status**: Planning  
**Estimado**: 6-8 horas de implementación  
**Criterio**: Todos los tests pasan + Manual QA en navegador

---

## Task 1: API Endpoint para Conteo de Comentarios

### Descripción
Crear endpoint optimizado que retorna solo el conteo de comentarios activos por negocio.

### Detalles Técnicos
- **Endpoint**: `GET /api/businesses/:businessId/comments/count`
- **Response**: `{ count: number }`
- **HTTP Status**: 200 (OK), 404 (negocio no existe)

### Checklist
- [ ] Crear archivo: `src/app/api/businesses/[id]/comments/count/route.ts`
- [ ] Validar `businessId` (número positivo)
- [ ] Llamar `prisma.comment.count({ where: { businessId, status: true } })`
- [ ] Retornar JSON: `{ count: number }`
- [ ] Error handling: 404 si negocio no existe
- [ ] Error handling: 500 para errores de DB
- [ ] Escribir tests unitarios
- [ ] Verificar con Postman/curl

### Archivos Afectados
- Crear: `src/app/api/businesses/[id]/comments/count/route.ts`
- Referencia: `src/features/comments/services/comments.service.ts`

### Estimado
⏱️ 1-2 horas

---

## Task 2: Crear CommentsModal Component

### Descripción
Componente modal que carga y muestra el historial completo de comentarios de un negocio.

### Detalles Técnicos
- **Component**: `CommentsModal.tsx` (React Client Component)
- **Props**: `businessId: number`, `isOpen: boolean`, `onClose: () => void`
- **Hook**: `useComments(businessId)` para cargar datos + SSE
- **UI Base**: Usar `Dialog` compartido de shadcn/UI

### Checklist
- [ ] Crear: `src/features/negocios/components/CommentsModal.tsx`
- [ ] Agregar prop: `businessId: number`
- [ ] Agregar prop: `isOpen: boolean`
- [ ] Agregar prop: `onClose: () => void`
- [ ] Importar: `useComments` de comments feature
- [ ] Llamar: `const { state, refetch } = useComments(businessId)`
- [ ] Render: Dialog header con título
- [ ] Render: Comment list (loading, error, empty, success)
- [ ] Render: Para cada comentario:
  - [ ] Autor (nombre + rol)
  - [ ] Fecha formateada con `formatDateBogota()`
  - [ ] Título
  - [ ] Detalle
- [ ] Styling: Responsive (mobile: full screen, desktop: centered dialog)
- [ ] Accessibility: aria-labels, focus management
- [ ] Tests: Mostrar loading, error, empty, populated states
- [ ] Tests: SSE updates (nuevo comentario aparece)

### Ejemplo de Estructura
```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Comentarios de {businessId}</DialogTitle>
    </DialogHeader>
    
    {state.status === 'loading' && <Spinner />}
    {state.status === 'error' && <ErrorMessage />}
    {state.status === 'success' && (
      <>
        {state.data?.length === 0 ? (
          <p>No hay comentarios</p>
        ) : (
          <CommentList comments={state.data} />
        )}
      </>
    )}
  </DialogContent>
</Dialog>
```

### Archivos Afectados
- Crear: `src/features/negocios/components/CommentsModal.tsx`
- Referencia: `src/features/comments/hooks/use-comments.ts`
- Referencia: `src/features/shared/ui/Dialog/Dialog.tsx`
- Referencia: `src/features/shared/lib/format-date.ts`

### Estimado
⏱️ 2-3 horas

---

## Task 3: Modificar ActionCell para Agregar Indicador

### Descripción
Agregar props `commentCount` y `onViewComments` a ActionCell, renderizar ícono de mensaje con contador.

### Detalles Técnicos
- **Icon**: `MessageCircle` de lucide-react
- **Badge**: Contador en red/orange (error color para destacar)
- **Posición**: Entre botón "Ver" y botón "Fondear"
- **Tooltip**: "X comentarios"

### Checklist
- [ ] Modificar: `src/features/negocios/components/BusinessTable/ActionCell.tsx`
- [ ] Actualizar `ActionCellProps` interface:
  - [ ] Agregar: `commentCount?: number`
  - [ ] Agregar: `onViewComments?: (businessId: number) => void`
- [ ] Importar: `MessageCircle` de lucide-react
- [ ] Render: Condicional si `commentCount > 0`:
  ```tsx
  {commentCount > 0 && (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative"
          onClick={() => onViewComments?.(businessId)}
        >
          <MessageCircle className="h-4 w-4" />
          <Badge className="absolute -top-2 -right-2">
            {commentCount}
          </Badge>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{commentCount} comentarios</p>
      </TooltipContent>
    </Tooltip>
  )}
  ```
- [ ] Styling: Badge visible, contraste suficiente
- [ ] Tests: Mostrar si count > 0, ocultar si = 0
- [ ] Tests: Click dispara onViewComments

### Archivos Afectados
- Modificar: `src/features/negocios/components/BusinessTable/ActionCell.tsx`

### Estimado
⏱️ 1-2 horas

---

## Task 4: Integrar en BusinessTableSection

### Descripción
Modificar BusinessTableSection para cargar conteos, pasar a ActionCell, y manejar CommentsModal.

### Detalles Técnicos
- **Data fetch**: Incluir `commentCount` para cada negocio
- **State**: Manejar `selectedBusinessForComments` y `isCommentsModalOpen`
- **Props**: Pasar `commentCount` y `onViewComments` a ActionCell

### Checklist
- [ ] Modificar: `src/features/negocios/components/BusinessTableSection.tsx`
- [ ] Agregar estado:
  ```tsx
  const [selectedBusinessForComments, setSelectedBusinessForComments] = useState<Business | null>(null)
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false)
  ```
- [ ] Modificar data fetch para incluir `commentCount`:
  - [ ] Opción 1: Incluir en la query principal (si es server action)
  - [ ] Opción 2: Agregar useEffect para cargar counts después
- [ ] Pasar a ActionCell:
  ```tsx
  <ActionCell
    // ... props existentes
    commentCount={business.commentCount}
    onViewComments={(businessId) => {
      const business = data.find(b => b.id === businessId)
      setSelectedBusinessForComments(business)
      setIsCommentsModalOpen(true)
    }}
  />
  ```
- [ ] Renderizar CommentsModal al final:
  ```tsx
  {selectedBusinessForComments && (
    <CommentsModal
      businessId={selectedBusinessForComments.id}
      isOpen={isCommentsModalOpen}
      onClose={() => setIsCommentsModalOpen(false)}
    />
  )}
  ```
- [ ] Tests: Verificar datos cargados
- [ ] Tests: Modal abre al hacer click en ícono
- [ ] Tests: Modal cierra al hacer click en X

### Archivos Afectados
- Modificar: `src/features/negocios/components/BusinessTableSection.tsx`
- Importar: `CommentsModal` del nuevo componente

### Estimado
⏱️ 1-2 horas

---

## Task 5: Tests Unitarios e Integración

### Descripción
Escribir tests completos para validar comportamiento de todos los componentes.

### Escenarios de Test

**ActionCell Tests**
- [ ] Render ícono si `commentCount > 0`
- [ ] No render ícono si `commentCount = 0` o undefined
- [ ] Tooltip muestra texto correcto
- [ ] Click dispara `onViewComments` con businessId correcto

**CommentsModal Tests**
- [ ] Render loading spinner mientras carga
- [ ] Render lista de comentarios cuando datos disponibles
- [ ] Render empty message si no hay comentarios
- [ ] Render error message si falla la carga
- [ ] Cerrar modal al hacer click en X
- [ ] Formatear fechas con `formatDateBogota()`
- [ ] Mostrar autor (nombre + rol) para cada comentario

**API Endpoint Tests**
- [ ] GET /api/businesses/123/comments/count retorna { count: N }
- [ ] Retorna 404 si negocio no existe
- [ ] Retorna 0 si no hay comentarios
- [ ] Solo cuenta comentarios con status: true
- [ ] Maneja errores DB gracefully

**Integration Tests**
- [ ] BusinessTableSection carga datos + commentCounts
- [ ] Click en ícono abre modal
- [ ] Modal desaparece al cerrar

### Files to Create
- Crear: `src/features/negocios/components/__tests__/CommentsModal.test.tsx`
- Crear: `src/app/api/businesses/__tests__/comments-count.test.ts`

### Checklist
- [ ] Escribir ActionCell tests
- [ ] Escribir CommentsModal tests
- [ ] Escribir API endpoint tests
- [ ] Escritura integración tests
- [ ] Run: `npm run test:unit` ✅
- [ ] Verificar coverage > 80%
- [ ] No hay console warnings

### Estimado
⏱️ 2-3 horas

---

## Task 6: QA y Validación Manual

### Descripción
Pruebas manuales en navegador para validar UX y funcionalidad.

### Checklist
- [ ] Abrir página de negocios
- [ ] Verificar ícono solo aparece si hay comentarios
- [ ] Verificar contador muestra número correcto
- [ ] Click abre modal
- [ ] Modal muestra comentarios en orden cronológico
- [ ] Modal muestra info de autor
- [ ] Modal muestra fechas formateadas (Bogotá)
- [ ] Agregar comentario en detail → ícono se actualiza
- [ ] Probar en mobile viewport
- [ ] Verificar a11y: Tab navigation, ARIA labels
- [ ] No hay errores en console

### Estimado
⏱️ 1 hora

---

## Summary

| # | Task | Hours | Status |
|---|------|-------|--------|
| 1 | API Endpoint | 1-2 | ⏳ |
| 2 | CommentsModal | 2-3 | ⏳ |
| 3 | ActionCell Mod | 1-2 | ⏳ |
| 4 | BusinessTableSection Int | 1-2 | ⏳ |
| 5 | Tests | 2-3 | ⏳ |
| 6 | Manual QA | 1 | ⏳ |
| **TOTAL** | **8-13** | |

---

## Definition of Done

Tarea completada cuando:
- ✅ Código escrito siguiendo convenciones del proyecto
- ✅ Todos los tests pasan (`npm run test:all`)
- ✅ Tipos TypeScript válidos (`npm run type-check`)
- ✅ Lint passa (`npm run lint`)
- ✅ Manual QA completada sin issues
- ✅ Commit creado con mensaje descriptivo
- ✅ PR abierto hacia `develop`

---

**Tareas creadas**: 2026-09-30  
**Próximo paso**: Implementación de Task 1 (API Endpoint)
