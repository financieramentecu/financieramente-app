# Migration Validation Checklist

**Purpose**: Checklist reutilizable para validar cada migración durante la refactorización  
**Based on**: `contracts/migration-steps.md`  
**Created**: 2026-01-28

## Pre-Migration Validation

**Inputs**:
- [ ] Servicio/Código a migrar identificado
- [ ] Feature destino determinado
- [ ] Dependencias mapeadas

**Validations**:
- [ ] Feature destino existe o está creado
- [ ] No hay dependencias circulares
- [ ] Tests existentes identificados
- [ ] Imports referenciando código legacy identificados

**Outputs**:
- [ ] Lista de archivos a migrar
- [ ] Lista de archivos a actualizar (imports)
- [ ] Lista de tests a migrar

---

## Step 1: Consolidar Código Duplicado (si aplica)

**Process**:
- [ ] Comparar ambas implementaciones línea por línea
- [ ] Identificar diferencias funcionales
- [ ] Determinar mejor versión (más completa, actualizada, mejor estructurada)
- [ ] Integrar funcionalidad faltante si legacy tiene algo que falta
- [ ] Actualizar código en feature con versión consolidada

**Validations**:
- [ ] Funcionalidad de legacy preservada en feature
- [ ] Funcionalidad de feature existente preservada
- [ ] Código consolidado sigue convenciones del proyecto
- [ ] Tests actualizados para código consolidado

**Outputs**:
- [ ] Código consolidado en feature
- [ ] Tests actualizados

---

## Step 2: Migrar Código a Feature

**Process**:
- [ ] Crear estructura de feature si no existe (lib/, types/, etc.)
- [ ] Copiar código a nueva ubicación
- [ ] Convertir a plain function o factory function según criterios
- [ ] Actualizar imports internos si es necesario
- [ ] Asegurar que código sigue convenciones (readonly, tipos, etc.)

**Validations**:
- [ ] Código migrado a ubicación correcta
- [ ] Imports internos actualizados
- [ ] Código sigue convenciones (no `any`, `readonly` donde corresponde)
- [ ] TypeScript compila sin errores: `npm run type-check`

**Outputs**:
- [ ] Código en nueva ubicación
- [ ] Archivo legacy listo para eliminación (después de actualizar imports)

---

## Step 3: Crear Schemas Zod (si aplica)

**Process**:
- [ ] Crear `lib/[feature]-schemas.ts` si no existe
- [ ] Definir schemas Zod para validación necesaria
- [ ] Exportar tipos usando `z.infer<typeof schema>`
- [ ] Usar schemas en código migrado

**Validations**:
- [ ] Schemas Zod creados en ubicación correcta
- [ ] Tipos inferidos correctamente
- [ ] Schemas usados en validación (cliente y/o servidor)

**Outputs**:
- [ ] `lib/[feature]-schemas.ts` con schemas y tipos

---

## Step 4: Actualizar Imports

**Process**:
- [ ] Buscar todas las referencias al código legacy: `grep -r "from '@/services" src/` o equivalente
- [ ] Reemplazar imports: `@/services/x.service` → `@/features/admin/x/lib/x-api`
- [ ] Verificar que no hay imports rotos con TypeScript compiler
- [ ] Actualizar imports en tests también

**Validations**:
- [ ] Todos los imports actualizados
- [ ] TypeScript compila sin errores de imports: `npm run type-check`
- [ ] No hay imports rotos
- [ ] ESLint pasa sin errores: `npm run lint`

**Outputs**:
- [ ] Archivos con imports actualizados

---

## Step 5: Migrar Tests

**Process**:
- [ ] Identificar todos los tests relacionados
- [ ] Migrar tests a `features/[feature]/__tests__/`
- [ ] Actualizar imports en tests para usar nuevas ubicaciones
- [ ] Actualizar mocks si es necesario
- [ ] Asegurar que tests siguen estructura de feature

**Validations**:
- [ ] Tests migrados a `__tests__/` dentro del feature
- [ ] Imports en tests actualizados
- [ ] Tests compilan sin errores

**Outputs**:
- [ ] Tests en nueva ubicación

---

## Step 6: Ejecutar Validación

**Process**:
- [ ] Ejecutar tests unitarios del feature migrado: `npm run test:unit`
- [ ] Ejecutar tests de integración relacionados: `npm run test:integration`
- [ ] Ejecutar suite completa de tests: `npm run test:all`
- [ ] Validar manualmente flujos críticos de usuario afectados
- [ ] Verificar que no hay regresiones

**Validations**:
- [ ] Todos los tests pasan
- [ ] Flujos críticos funcionan correctamente
- [ ] No hay regresiones funcionales
- [ ] Performance no degradada

**Outputs**:
- [ ] Validación exitosa o lista de issues a corregir

---

## Step 7: Eliminar Código Legacy

**Process**:
- [ ] Verificar que no hay referencias al código legacy: `grep -r "services/" src/` o equivalente
- [ ] Eliminar archivo legacy
- [ ] Si es último archivo en directorio, eliminar directorio (ej: `src/services/`)
- [ ] Actualizar `.gitignore` si es necesario

**Validations**:
- [ ] No hay referencias al código legacy
- [ ] Archivo legacy eliminado
- [ ] TypeScript compila sin errores: `npm run type-check`
- [ ] Tests siguen pasando: `npm run test:all`
- [ ] ESLint pasa sin errores: `npm run lint`

**Outputs**:
- [ ] Código legacy eliminado
- [ ] Directorio limpiado si aplica

---

## Migration Validation Summary

Para cada migración, verificar:

- [ ] Código consolidado (si había duplicación)
- [ ] Código migrado a feature correcto
- [ ] Schemas Zod creados (si aplica)
- [ ] Imports actualizados en todo el proyecto
- [ ] Tests migrados y pasando
- [ ] Validación manual de flujos críticos
- [ ] Código legacy eliminado
- [ ] No hay regresiones funcionales
- [ ] TypeScript compila sin errores
- [ ] ESLint pasa sin errores nuevos

---

## Rollback Strategy

Si una migración falla:

1. **Antes de eliminar legacy**: Revertir cambios y mantener código legacy
2. **Después de eliminar legacy**: Restaurar desde git history
3. **Si hay issues en producción**: Hotfix restaurando código legacy temporalmente

**Prevención**:
- [ ] Hacer commits después de cada paso exitoso
- [ ] No eliminar código legacy hasta validación completa
- [ ] Mantener branch de migración separado hasta completar

---

## Notes

- Usar este checklist para cada servicio/código migrado
- Marcar cada item como completado antes de avanzar al siguiente paso
- Si un item falla, detener y corregir antes de continuar
- Documentar cualquier desviación o decisión especial en la sección Notes
