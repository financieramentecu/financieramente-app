# Quickstart: Guía de Migración Arquitectónica

**Date**: 2026-01-28  
**Feature**: 002-architecture-refactor  
**Purpose**: Guía paso a paso para ejecutar la migración arquitectónica

## Prerrequisitos

- [ ] Código fuente completo accesible
- [ ] Tests ejecutándose correctamente
- [ ] ESLint configurado
- [ ] TypeScript compilando sin errores
- [ ] Branch de trabajo creado: `002-architecture-refactor`

## Fase 1: Migración de Servicios Legacy

### Paso 1.1: Analizar y Preparar

```bash
# 1. Identificar servicios legacy
ls src/services/

# 2. Buscar referencias a cada servicio
grep -r "from '@/services" src/

# 3. Identificar tests relacionados
find . -name "*.test.ts" -o -name "*.spec.ts" | xargs grep -l "services/"

# 4. Verificar features destino existen
ls src/features/admin/
```

### Paso 1.2: Migrar Servicio (Ejemplo: currency.service.ts)

```bash
# 1. Verificar si existe código duplicado
diff src/services/currency.service.ts src/features/admin/currencies/lib/currency-api.ts

# 2. Si hay duplicación, consolidar primero
# Comparar y mantener mejor versión

# 3. Migrar código (si no hay duplicación o después de consolidar)
# Copiar contenido a features/admin/currencies/lib/currency-api.ts
# Convertir a plain function si es necesario

# 4. Actualizar imports en todo el proyecto
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  "s|from '@/services/currency.service'|from '@/features/admin/currencies/lib/currency-api'|g" {} +

# 5. Migrar tests si existen
# Mover tests a features/admin/currencies/__tests__/
# Actualizar imports en tests

# 6. Validar
npm run test
npm run type-check
npm run lint

# 7. Validar manualmente flujos que usan currency

# 8. Eliminar código legacy
rm src/services/currency.service.ts
```

### Paso 1.3: Repetir para Otros Servicios

Repetir Paso 1.2 para:
1. `periodicity.service.ts` → `features/admin/periodicities/lib/periodicity-api.ts`
2. `origin.service.ts` → `features/admin/origins/lib/origin-api.ts`
3. `company.service.ts` → `features/admin/companies/lib/company-api.ts`
4. `product.service.ts` → `features/admin/products/lib/product-api.ts`

### Paso 1.4: Limpiar Directorio services/

```bash
# Verificar que no quedan archivos
ls src/services/

# Si está vacío, eliminar directorio
rmdir src/services/

# Actualizar .gitignore si es necesario
```

## Fase 2: Migración de Código desde src/lib/

### Paso 2.1: Migrar src/lib/auth/

```bash
# 1. Crear estructura en features/auth/ si no existe
mkdir -p src/features/auth/lib
mkdir -p src/features/auth/types
mkdir -p src/features/auth/hooks
mkdir -p src/features/auth/__tests__

# 2. Migrar archivos
cp src/lib/auth/*.ts src/features/auth/lib/
# (excepto types.ts que va a types/)

# 3. Migrar types si existe
cp src/lib/auth/types.ts src/features/auth/types/auth.types.ts

# 4. Crear auth-schemas.ts si se requiere validación
# Crear schemas Zod y tipos inferidos

# 5. Actualizar imports
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  "s|from '@/lib/auth/|from '@/features/auth/lib/|g" {} +

# 6. Migrar tests
cp -r src/lib/auth/__tests__/* src/features/auth/__tests__/
# Actualizar imports en tests

# 7. Validar
npm run test
npm run type-check

# 8. Eliminar código legacy
rm -rf src/lib/auth/
```

### Paso 2.2: Migrar src/lib/currency/

```bash
# Similar a Paso 2.1 pero destino: features/admin/currencies/lib/
# Migrar funciones de formateo
# Migrar tests
# Actualizar imports
# Validar
# Eliminar código legacy
```

### Paso 2.3: Migrar src/lib/email/

```bash
# Similar a Paso 2.1 pero destino: features/email/lib/
# Consolidar con código existente en features/email/
# Migrar tests
# Actualizar imports
# Validar
# Eliminar código legacy
```

### Paso 2.4: Evaluar src/lib/navigation/ y src/lib/utils.ts

```bash
# 1. Analizar uso de navigation/
grep -r "from '@/lib/navigation" src/

# 2. Contar features que lo usan
# Si 3+ features → features/shared/lib/navigation/
# Si infraestructura → mantener en lib/
# Si layout específico → features/shared/layout/lib/

# 3. Analizar utils.ts
grep -r "from '@/lib/utils" src/

# 4. Si solo tiene cn() → mantener en lib/
# Si tiene más lógica → evaluar destino según uso

# 5. Documentar decisión
```

## Fase 3: Completar Estructura de Features Incompletos

### Paso 3.1: Completar features/admin/origins/

```bash
# 1. Evaluar si necesita components/ y hooks/
# Revisar código existente y funcionalidad

# 2. Crear estructura faltante si es necesaria
mkdir -p src/features/admin/origins/components
mkdir -p src/features/admin/origins/hooks

# 3. Crear schemas si requiere validación
# Crear origins-schemas.ts con Zod

# 4. Validar estructura completa
```

### Paso 3.2: Completar features/auth/

```bash
# 1. Ya migrado lib/ en Fase 2
# 2. Crear hooks/ si es necesario
mkdir -p src/features/auth/hooks
# Crear hooks necesarios (useAuth, useSession, etc.)

# 3. Asegurar types/ completo
# Migrar types desde lib/auth/types.ts si no se hizo

# 4. Crear __tests__/ si no existe
mkdir -p src/features/auth/__tests__
# Migrar tests desde lib/auth/__tests__/

# 5. Validar estructura completa
```

### Paso 3.3: Completar features/pre-liquidacion/

```bash
# 1. Crear lib/ con schemas
mkdir -p src/features/pre-liquidacion/lib
# Crear pre-liquidacion-schemas.ts con Zod

# 2. Crear types/ si no existe
mkdir -p src/features/pre-liquidacion/types
# Definir tipos o inferir desde schemas

# 3. Validar estructura completa
```

## Fase 4: Eliminar Uso de `any`

### Paso 4.1: Auditar Ocurrencias

```bash
# 1. Encontrar todas las ocurrencias
grep -r ":\s*any" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v ".test.ts"

# 2. Categorizar por prioridad
# High: código de producción crítico
# Medium: código de producción no crítico
# Low: tests (permitido si justificado)

# 3. Crear lista de tareas para cada ocurrencia
```

### Paso 4.2: Reemplazar `any` en Código de Producción

```bash
# 1. Empezar con prioridad High
# 2. Para cada ocurrencia:
#    - Analizar contexto
#    - Determinar tipo apropiado
#    - Reemplazar con tipo específico o `unknown` + type guard
#    - Validar que TypeScript compila
#    - Ejecutar tests relacionados

# 3. Continuar con prioridad Medium
# 4. Revisar Low (tests) - mantener solo si justificado
```

### Paso 4.3: Configurar ESLint

```bash
# 1. Actualizar eslint.config.mjs
# Agregar regla:
# "@typescript-eslint/no-explicit-any": "error"

# 2. Validar que previene nuevos `any`
npm run lint
```

## Fase 5: Implementar `readonly`

### Paso 5.1: Auditar Interfaces

```bash
# 1. Encontrar interfaces principales
find src/features -name "*.ts" -exec grep -l "interface" {} \;

# 2. Identificar campos inmutables (IDs, createdAt, etc.)
# 3. Crear lista de interfaces a actualizar
```

### Paso 5.2: Aplicar `readonly`

```bash
# 1. Para cada interface:
#    - Identificar campos inmutables
#    - Agregar `readonly` a campos apropiados
#    - Validar que TypeScript compila
#    - Ejecutar tests

# 2. Documentar convenciones
# Crear guía sobre cuándo usar `readonly`
```

## Fase 6: Mejorar Cobertura de Tests

### Paso 6.1: Identificar Gaps

```bash
# 1. Ejecutar cobertura
npm run test:coverage

# 2. Identificar features con baja cobertura
# 3. Priorizar: business logic (utilidades, servicios, hooks)
```

### Paso 6.2: Implementar Tests Faltantes

```bash
# 1. Para features sin tests (ej: auth después de migración):
#    - Crear __tests__/ básicos
#    - Tests para funciones principales
#    - Tests para schemas Zod

# 2. Para hooks sin tests:
#    - Crear integration tests
#    - Tests para data fetching

# 3. Para schemas Zod:
#    - Tests de validación
#    - Tests de edge cases

# 4. Validar cobertura alcanza 80% en business logic
```

## Validación Final

```bash
# 1. Ejecutar todos los tests
npm run test:all

# 2. Type checking
npm run type-check

# 3. Linting
npm run lint

# 4. Validar manualmente flujos críticos:
#    - Crear/editar productos
#    - Crear/editar negocios
#    - Operaciones administrativas
#    - Autenticación

# 5. Verificar métricas:
#    - 0 archivos en src/services/
#    - src/lib/ solo tiene infraestructura global
#    - 0 `any` en producción
#    - 80% cobertura en business logic
#    - Features completos según estructura
```

## Checklist de Completación

- [ ] Todos los servicios legacy migrados
- [ ] Directorio `src/services/` eliminado
- [ ] Código de dominio migrado desde `src/lib/`
- [ ] `src/lib/` solo contiene infraestructura global
- [ ] Features incompletos completados
- [ ] Schemas Zod creados donde se requiere
- [ ] 0 `any` en código de producción
- [ ] ESLint configurado para prevenir `any`
- [ ] `readonly` aplicado en interfaces principales
- [ ] Convenciones de `readonly` documentadas
- [ ] Cobertura de tests ≥ 80% en business logic
- [ ] Todos los tests pasando
- [ ] No hay regresiones funcionales
- [ ] Validación manual de flujos críticos completada

## Troubleshooting

### Imports Rotos

```bash
# Buscar imports rotos
npm run type-check 2>&1 | grep "Cannot find module"

# Actualizar imports faltantes
```

### Tests Fallando

```bash
# Ejecutar tests específicos
npm run test -- features/admin/companies/__tests__/

# Revisar mocks y actualizar si es necesario
```

### Dependencias Circulares

```bash
# Analizar dependencias
npm run type-check 2>&1 | grep "circular"

# Refactorizar para eliminar dependencias circulares
```
