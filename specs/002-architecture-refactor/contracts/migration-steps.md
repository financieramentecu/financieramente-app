# Migration Steps Contract

**Date**: 2026-01-28  
**Feature**: 002-architecture-refactor  
**Purpose**: Definir pasos y validaciones para cada migración

## Migration Step Contract

### Pre-Migration Validation

**Inputs**:
- Servicio/Código a migrar identificado
- Feature destino determinado
- Dependencias mapeadas

**Validations**:
- [ ] Feature destino existe o está creado
- [ ] No hay dependencias circulares
- [ ] Tests existentes identificados
- [ ] Imports referenciando código legacy identificados

**Outputs**:
- Lista de archivos a migrar
- Lista de archivos a actualizar (imports)
- Lista de tests a migrar

---

### Step 1: Consolidar Código Duplicado (si aplica)

**Inputs**:
- Servicio legacy
- Código existente en feature

**Process**:
1. Comparar ambas implementaciones línea por línea
2. Identificar diferencias funcionales
3. Determinar mejor versión (más completa, actualizada, mejor estructurada)
4. Integrar funcionalidad faltante si legacy tiene algo que falta
5. Actualizar código en feature con versión consolidada

**Validations**:
- [ ] Funcionalidad de legacy preservada en feature
- [ ] Funcionalidad de feature existente preservada
- [ ] Código consolidado sigue convenciones del proyecto
- [ ] Tests actualizados para código consolidado

**Outputs**:
- Código consolidado en feature
- Tests actualizados

---

### Step 2: Migrar Código a Feature

**Inputs**:
- Código a migrar (servicio legacy o código de lib/)
- Feature destino

**Process**:
1. Crear estructura de feature si no existe (lib/, types/, etc.)
2. Copiar código a nueva ubicación
3. Convertir a plain function o factory function según criterios
4. Actualizar imports internos si es necesario
5. Asegurar que código sigue convenciones (readonly, tipos, etc.)

**Validations**:
- [ ] Código migrado a ubicación correcta
- [ ] Imports internos actualizados
- [ ] Código sigue convenciones (no `any`, `readonly` donde corresponde)
- [ ] TypeScript compila sin errores

**Outputs**:
- Código en nueva ubicación
- Archivo legacy listo para eliminación (después de actualizar imports)

---

### Step 3: Crear Schemas Zod (si aplica)

**Inputs**:
- Feature que requiere validación
- Código que necesita validación

**Process**:
1. Crear `lib/[feature]-schemas.ts` si no existe
2. Definir schemas Zod para validación necesaria
3. Exportar tipos usando `z.infer<typeof schema>`
4. Usar schemas en código migrado

**Validations**:
- [ ] Schemas Zod creados en ubicación correcta
- [ ] Tipos inferidos correctamente
- [ ] Schemas usados en validación (cliente y/o servidor)

**Outputs**:
- `lib/[feature]-schemas.ts` con schemas y tipos

---

### Step 4: Actualizar Imports

**Inputs**:
- Lista de archivos que importan código legacy
- Nueva ubicación del código

**Process**:
1. Buscar todas las referencias al código legacy
2. Reemplazar imports: `@/services/x.service` → `@/features/admin/x/lib/x-api`
3. Verificar que no hay imports rotos con TypeScript compiler
4. Actualizar imports en tests también

**Validations**:
- [ ] Todos los imports actualizados
- [ ] TypeScript compila sin errores de imports
- [ ] No hay imports rotos

**Outputs**:
- Archivos con imports actualizados

---

### Step 5: Migrar Tests

**Inputs**:
- Tests asociados al código migrado
- Nueva ubicación del código

**Process**:
1. Identificar todos los tests relacionados
2. Migrar tests a `features/[feature]/__tests__/`
3. Actualizar imports en tests para usar nuevas ubicaciones
4. Actualizar mocks si es necesario
5. Asegurar que tests siguen estructura de feature

**Validations**:
- [ ] Tests migrados a `__tests__/` dentro del feature
- [ ] Imports en tests actualizados
- [ ] Tests compilan sin errores

**Outputs**:
- Tests en nueva ubicación

---

### Step 6: Ejecutar Validación

**Inputs**:
- Código migrado
- Tests migrados
- Imports actualizados

**Process**:
1. Ejecutar tests unitarios del feature migrado
2. Ejecutar tests de integración relacionados
3. Ejecutar suite completa de tests
4. Validar manualmente flujos críticos de usuario afectados
5. Verificar que no hay regresiones

**Validations**:
- [ ] Todos los tests pasan
- [ ] Flujos críticos funcionan correctamente
- [ ] No hay regresiones funcionales
- [ ] Performance no degradada

**Outputs**:
- Validación exitosa o lista de issues a corregir

---

### Step 7: Eliminar Código Legacy

**Inputs**:
- Código migrado y validado
- Todos los imports actualizados
- Tests migrados y pasando

**Process**:
1. Verificar que no hay referencias al código legacy
2. Eliminar archivo legacy
3. Si es último archivo en directorio, eliminar directorio (ej: `src/services/`)
4. Actualizar `.gitignore` si es necesario

**Validations**:
- [ ] No hay referencias al código legacy
- [ ] Archivo legacy eliminado
- [ ] TypeScript compila sin errores
- [ ] Tests siguen pasando

**Outputs**:
- Código legacy eliminado
- Directorio limpiado si aplica

---

## Migration Validation Checklist

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

## Rollback Strategy

Si una migración falla:

1. **Antes de eliminar legacy**: Revertir cambios y mantener código legacy
2. **Después de eliminar legacy**: Restaurar desde git history
3. **Si hay issues en producción**: Hotfix restaurando código legacy temporalmente

**Prevención**:
- Hacer commits después de cada paso exitoso
- No eliminar código legacy hasta validación completa
- Mantener branch de migración separado hasta completar
