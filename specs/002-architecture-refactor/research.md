# Research: Mejora de Arquitectura - Refactorización

**Date**: 2026-01-28  
**Feature**: 002-architecture-refactor  
**Purpose**: Documentar investigación y decisiones estratégicas para la migración arquitectónica

## Research Tasks & Findings

### 1. Análisis de Dependencias entre Servicios Legacy

**Task**: Mapear dependencias entre servicios en `src/services/` y con código en `src/lib/`

**Findings**:
- Servicios legacy son independientes entre sí (no hay dependencias circulares)
- Servicios usan `prisma` directamente (cliente global)
- Algunos servicios pueden usar utilidades de `src/lib/` pero no hay dependencias críticas
- Orden de migración recomendado: cualquier orden es válido, pero preferir por frecuencia de uso

**Decision**: Migrar servicios en orden de menor a mayor complejidad/complejidad de uso:
1. `currency.service.ts` (más simple)
2. `periodicity.service.ts`
3. `origin.service.ts`
4. `company.service.ts`
5. `product.service.ts` (más usado)

**Rationale**: Empezar con servicios simples permite validar el proceso antes de migrar servicios críticos.

**Alternatives considered**:
- Orden alfabético: Rechazado - no considera complejidad
- Orden por dependencias: Rechazado - no hay dependencias entre servicios

---

### 2. Análisis de Código Duplicado

**Task**: Comparar servicios legacy vs código existente en features

**Findings**:
- La auditoría indica que ya existen archivos en features (ej: `features/admin/products/lib/product-api.ts`)
- Necesario comparar funcionalidad entre legacy y feature existente
- Posible duplicación parcial o completa

**Decision**: Estrategia de consolidación:
1. Comparar ambas implementaciones línea por línea
2. Identificar diferencias funcionales
3. Mantener la mejor versión (más completa, actualizada, mejor estructurada)
4. Si legacy tiene funcionalidad faltante, integrarla en feature
5. Eliminar código legacy solo después de consolidación completa

**Rationale**: Asegura que no se pierda funcionalidad y mantiene la mejor implementación disponible.

**Alternatives considered**:
- Reemplazar siempre con legacy: Rechazado - puede perder mejoras en features existentes
- Mantener ambos temporalmente: Rechazado - crea duplicación innecesaria

---

### 3. Análisis de Uso de Imports

**Task**: Buscar todas las referencias a servicios legacy

**Findings**:
- Servicios legacy se usan principalmente en páginas del dashboard (`src/app/dashboard/`)
- Archivos afectados:
  - `src/app/dashboard/products/page.tsx`
  - `src/app/dashboard/products/create/page.tsx`
  - `src/app/dashboard/products/editar/[id]/page.tsx`
  - `src/app/dashboard/negocios/crear/page.tsx`
  - `src/app/dashboard/negocios/editar/[id]/page.tsx`
- Patrón de import: `import { getX } from '@/services/x.service'`

**Decision**: Estrategia de actualización de imports:
1. Migrar servicio a feature
2. Buscar y reemplazar imports usando herramientas de búsqueda/reemplazo
3. Actualizar path: `@/services/x.service` → `@/features/admin/x/lib/x-api`
4. Verificar que no hay imports rotos con TypeScript compiler
5. Ejecutar tests para validar

**Rationale**: Actualización sistemática minimiza errores y permite validación incremental.

**Alternatives considered**:
- Actualización manual: Rechazado - propenso a errores
- Actualización después de todas las migraciones: Rechazado - dificulta validación incremental

---

### 4. Análisis de Tests Existentes

**Task**: Identificar tests para servicios legacy

**Findings**:
- Tests para servicios legacy pueden estar en:
  - `src/services/__tests__/` (si existe)
  - `src/app/api/__tests__/` (tests de API routes que usan servicios)
  - Tests de integración que usan servicios indirectamente
- Tests deben migrarse junto con código a `features/[feature]/__tests__/`

**Decision**: Estrategia de migración de tests:
1. Identificar todos los tests relacionados con servicio legacy
2. Migrar tests a `features/[feature]/__tests__/` junto con código
3. Actualizar imports en tests para usar nuevas ubicaciones
4. Verificar que tests pasan después de migración
5. Si tests fallan, investigar y corregir antes de continuar

**Rationale**: Tests colocalizados con código siguen Feature-Based Architecture y facilitan mantenimiento.

**Alternatives considered**:
- Mantener tests en ubicación original: Rechazado - viola arquitectura objetivo
- Migrar tests después de código: Rechazado - dificulta validación inmediata

---

### 5. Análisis de Código en Evaluación

**Task**: Evaluar `src/lib/navigation/` y `src/lib/utils.ts`

**Findings**:
- `src/lib/navigation/`: Probablemente utilidades de navegación de Next.js
- `src/lib/utils.ts`: Probablemente utilidades genéricas (ej: `cn` para className)

**Decision**: Criterios de evaluación:
1. **Para `src/lib/navigation/`**:
   - Si usado por 3+ features → `features/shared/lib/navigation/`
   - Si es configuración específica de Next.js → mantener en `lib/`
   - Si es específico de layout → `features/shared/layout/lib/`

2. **Para `src/lib/utils.ts`**:
   - Si contiene solo `cn` (className utility) → mantener en `lib/` (infraestructura)
   - Si tiene más lógica de dominio → evaluar si va a `features/shared/lib/` o feature específico
   - Si usado por 3+ features → `features/shared/lib/utils.ts`

**Rationale**: Balance entre mantener infraestructura global y mover código de dominio a features.

**Alternatives considered**:
- Migrar todo automáticamente: Rechazado - puede mover infraestructura legítima
- Mantener todo en lib: Rechazado - puede mantener código de dominio incorrectamente

---

## Best Practices Research

### Migración Incremental

**Decision**: Migración incremental por servicio/feature, no big bang

**Rationale**: 
- Permite validación después de cada paso
- Reduce riesgo de romper aplicación completa
- Facilita rollback si es necesario
- Permite desarrollo paralelo en otras áreas

**Pattern**: 
1. Migrar un servicio/feature
2. Actualizar imports
3. Ejecutar tests
4. Validar manualmente flujos críticos
5. Commit y continuar con siguiente

---

### Factory Functions vs Plain Functions

**Decision**: Usar factory functions solo cuando:
- Servicio tiene múltiples dependencias externas (3+)
- Se requiere testing con mocks complejos
- Servicio necesita configuración dinámica

**Rationale**: Plain functions son más simples y preferidas por constitución. Factory functions solo cuando realmente necesario para DI o testing.

**Pattern**:
```typescript
// ✅ Preferido - Plain function
export async function getProducts(): Promise<Product[]> {
  return prisma.product.findMany()
}

// ✅ Cuando se requiere DI/testing
export function createProductService(
  prisma: PrismaClient,
  logger: ILogger
): IProductService {
  return {
    async getProducts() {
      // implementation
    }
  }
}
```

---

### Validación de Regresiones

**Decision**: Tests automatizados + validación manual de flujos críticos

**Rationale**: 
- Tests automatizados cubren mayoría de casos rápidamente
- Validación manual asegura que flujos críticos de usuario funcionan
- Balance entre velocidad y confianza

**Process**:
1. Ejecutar suite completa de tests (unit + integration)
2. Verificar que todos pasan
3. Validar manualmente flujos críticos:
   - Crear/editar productos
   - Crear/editar negocios
   - Operaciones administrativas
4. Si hay fallos, corregir antes de continuar

---

## Technology Decisions

### Type Inference desde Schemas Zod

**Decision**: Usar `z.infer<typeof schema>` para generar tipos TypeScript

**Rationale**: 
- Single source of truth (schema define validación y tipo)
- Reduce duplicación
- Mantiene sincronización entre validación y tipos
- Alineado con constitución

**Pattern**:
```typescript
import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
})

export type Product = z.infer<typeof productSchema>
```

---

### ESLint Rule para `any`

**Decision**: Configurar `@typescript-eslint/no-explicit-any` como error

**Rationale**: 
- Previene nuevos `any` en código
- Fuerza type safety desde el inicio
- Facilita mantenimiento a largo plazo

**Configuration**:
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

---

## Summary of Decisions

| Área | Decisión | Rationale |
|------|----------|-----------|
| Orden de migración | Por complejidad (simple → complejo) | Valida proceso antes de servicios críticos |
| Código duplicado | Consolidar manteniendo mejor versión | No perder funcionalidad |
| Actualización imports | Incremental después de cada migración | Facilita validación |
| Migración tests | Junto con código a `__tests__/` | Sigue arquitectura objetivo |
| Código evaluación | Caso por caso con criterios definidos | Balance infraestructura vs dominio |
| Factory vs Plain | Plain preferido, factory solo cuando necesario | Simplicidad y alineación con constitución |
| Validación regresiones | Tests + validación manual flujos críticos | Balance velocidad y confianza |
| Type inference | `z.infer<typeof schema>` | Single source of truth |
| ESLint `any` | Error level | Previene nuevos `any` |
