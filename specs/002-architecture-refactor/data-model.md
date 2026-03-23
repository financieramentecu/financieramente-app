# Data Model: Entidades de Migración

**Date**: 2026-01-28  
**Feature**: 002-architecture-refactor  
**Purpose**: Documentar entidades y relaciones involucradas en la migración arquitectónica

## Entidades de Migración

### Servicio Legacy

**Descripción**: Código de negocio organizado por tipo técnico en `src/services/` que debe migrarse a features.

**Atributos**:
- `name`: string - Nombre del servicio (ej: "company", "currency")
- `sourcePath`: string - Ruta actual (ej: "src/services/company.service.ts")
- `targetFeature`: string - Feature destino (ej: "features/admin/companies")
- `targetPath`: string - Ruta objetivo (ej: "features/admin/companies/lib/company-api.ts")
- `dependencies`: string[] - Lista de dependencias (otros servicios, código en lib/)
- `hasDuplication`: boolean - Si existe código duplicado en feature existente
- `testFiles`: string[] - Archivos de tests asociados
- `importReferences`: string[] - Archivos que importan este servicio

**Relaciones**:
- Puede tener código duplicado en Feature Existente
- Tiene Tests asociados
- Es referenciado por múltiples Archivos de Código

**Estado de Migración**:
- `pending` - No migrado
- `in_progress` - Migración en curso
- `consolidated` - Consolidado con código existente
- `migrated` - Migrado completamente
- `validated` - Migrado y validado

---

### Feature Existente

**Descripción**: Feature que ya tiene código relacionado con servicio legacy.

**Atributos**:
- `name`: string - Nombre del feature (ej: "admin/products")
- `existingApiPath`: string - Ruta de API existente (ej: "features/admin/products/lib/product-api.ts")
- `structure`: object - Estructura actual del feature
  - `hasComponents`: boolean
  - `hasHooks`: boolean
  - `hasLib`: boolean
  - `hasTypes`: boolean
  - `hasTests`: boolean
- `needsConsolidation`: boolean - Si requiere consolidación con legacy

**Relaciones**:
- Puede tener código duplicado con Servicio Legacy
- Requiere completar Estructura si está incompleto

---

### Código de Dominio en lib/

**Descripción**: Código específico de dominio ubicado incorrectamente en `src/lib/`.

**Atributos**:
- `domain`: string - Dominio del código (ej: "auth", "currency", "email")
- `sourcePath`: string - Ruta actual (ej: "src/lib/auth/")
- `targetFeature`: string - Feature destino (ej: "features/auth")
- `files`: string[] - Lista de archivos a migrar
- `testFiles`: string[] - Archivos de tests asociados
- `evaluationStatus`: string - Para código marcado como "evaluar"
  - `infrastructure` - Mantener en lib/
  - `shared` - Migrar a features/shared/
  - `domain` - Migrar a feature específico

**Relaciones**:
- Pertenece a un Feature destino
- Puede tener Tests asociados

---

### Feature Incompleto

**Descripción**: Feature que no tiene estructura completa según Feature-Based Architecture.

**Atributos**:
- `name`: string - Nombre del feature (ej: "admin/origins", "auth", "pre-liquidacion")
- `currentStructure`: object - Estructura actual
  - `components`: boolean
  - `hooks`: boolean
  - `lib`: boolean
  - `types`: boolean
  - `services`: boolean
  - `mappers`: boolean
  - `tests`: boolean
- `targetStructure`: object - Estructura objetivo según necesidades
- `missingSchemas`: boolean - Si falta schemas Zod
- `missingTypes`: boolean - Si falta types/

**Relaciones**:
- Requiere completar con Estructura faltante

---

### Ocurrencia de `any`

**Descripción**: Uso de tipo `any` que elimina type safety.

**Atributos**:
- `file`: string - Archivo donde ocurre
- `line`: number - Línea donde ocurre
- `context`: string - Contexto del uso (función, variable, etc.)
- `suggestedType`: string - Tipo sugerido para reemplazo
- `isInTest`: boolean - Si está en archivo de test
- `priority`: string - Prioridad de reemplazo
  - `high` - Código de producción crítico
  - `medium` - Código de producción no crítico
  - `low` - Tests (permitido si justificado)

**Relaciones**:
- Pertenece a un Archivo de Código

---

### Interface sin `readonly`

**Descripción**: Interface que debería usar `readonly` en campos inmutables.

**Atributos**:
- `name`: string - Nombre de la interface
- `file`: string - Archivo donde está definida
- `immutableFields`: string[] - Campos que deberían ser readonly (IDs, createdAt, etc.)
- `mutableFields`: string[] - Campos que pueden mutar (status, updatedAt, etc.)

**Relaciones**:
- Pertenece a un Feature o Archivo de Código

---

### Schema Zod Faltante

**Descripción**: Código que requiere validación pero no tiene schema Zod.

**Atributos**:
- `feature`: string - Feature donde debe crearse
- `validationTarget`: string - Qué requiere validación (API endpoint, form, etc.)
- `validationType`: string - Tipo de validación necesaria
  - `input` - Validación de entrada
  - `output` - Validación de salida
  - `both` - Ambos
- `targetPath`: string - Ruta donde crear schema (ej: "features/auth/lib/auth-schemas.ts")

**Relaciones**:
- Pertenece a un Feature

---

## Relaciones entre Entidades

```
Servicio Legacy
  ├── puede tener → Código Duplicado → Feature Existente
  ├── tiene → Tests
  ├── es referenciado por → Archivos de Código
  └── migra a → Feature

Código de Dominio en lib/
  ├── pertenece a → Feature
  └── tiene → Tests

Feature Incompleto
  └── requiere → Estructura faltante

Ocurrencia de `any`
  └── pertenece a → Archivo de Código

Interface sin `readonly`
  └── pertenece a → Feature o Archivo

Schema Zod Faltante
  └── pertenece a → Feature
```

## Validación y Reglas

### Reglas de Migración

1. **Servicio Legacy**:
   - Debe tener `targetFeature` definido antes de migrar
   - Si `hasDuplication = true`, debe consolidar antes de eliminar
   - Todos los `importReferences` deben actualizarse antes de eliminar

2. **Código de Dominio**:
   - `evaluationStatus` debe determinarse antes de migrar
   - Todos los `files` deben migrarse juntos
   - Tests deben migrarse junto con código

3. **Feature Incompleto**:
   - `targetStructure` debe definirse según necesidades del feature
   - Si requiere validación, debe tener `Schema Zod Faltante` asociado

4. **Ocurrencia de `any`**:
   - `suggestedType` debe definirse antes de reemplazar
   - Prioridad `high` debe reemplazarse primero

5. **Schema Zod Faltante**:
   - Debe crearse antes de usar en validación
   - Tipos deben inferirse usando `z.infer<typeof schema>`

## Estado de Migración Global

**Métricas**:
- Total servicios legacy: 5
- Total código en lib/ a migrar: ~15 archivos
- Total ocurrencias de `any`: 43
- Features incompletos: 3
- Schemas Zod faltantes: Variable según features

**Progreso**:
- Servicios migrados: 0/5
- Código lib/ migrado: 0/~15
- `any` eliminados: 0/43
- Features completados: 0/3
