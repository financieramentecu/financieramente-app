# 🔍 Auditoría de Arquitectura - Financieramente App

**Fecha:** 28 de Enero, 2026  
**Auditor:** Architecture Enforcer Subagent  
**Objetivo:** Evaluar el estado actual de la arquitectura Next.js y compararla con la arquitectura objetivo (Feature-Based Architecture)

---

## 📊 Resumen Ejecutivo

### Estado General: ⚠️ **PARCIALMENTE ALINEADO**

El proyecto muestra una **transición en curso** hacia Feature-Based Architecture. Se identifican:
- ✅ **Fortalezas:** Estructura de features bien implementada en varios módulos, tests colocalizados
- ⚠️ **Debilidades:** Código legacy en `src/services/` y `src/lib/`, uso de `any`, falta de inmutabilidad
- 🔴 **Crítico:** Servicios legacy que deben migrarse a features

### Métricas Clave

| Métrica | Valor | Estado |
|---------|-------|--------|
| Features bien estructurados | 8/12 | ⚠️ |
| Servicios legacy (`src/services/`) | 5 archivos | 🔴 |
| Código en `src/lib/` (debe migrar) | ~15 archivos | ⚠️ |
| Uso de `any` | 43 ocurrencias | ⚠️ |
| Tests unitarios | 47 archivos | ✅ |
| Features con `__tests__/` | 6/12 | ⚠️ |
| Uso de `readonly` | 1 archivo | 🔴 |

---

## 🏗️ Análisis de Estructura Actual

### 1. Estructura de Directorios

```
src/
├── app/                    ✅ Correcto (Next.js App Router)
│   ├── api/               ✅ Correcto
│   └── dashboard/         ✅ Correcto
│
├── features/              ✅ Estructura principal correcta
│   ├── admin/             ✅ Bien estructurado
│   │   ├── categories/   ✅ Completo (components, hooks, lib, types)
│   │   ├── companies/    ✅ Completo
│   │   ├── currencies/   ✅ Completo
│   │   ├── origins/      ⚠️ Sin components ni hooks
│   │   ├── periodicities/✅ Completo
│   │   ├── products/     ✅ Completo
│   │   └── users/        ✅ Completo (incluye utils/)
│   │
│   ├── auth/              ⚠️ Estructura incompleta (solo components)
│   ├── categories/        ✅ Bien estructurado con tests
│   ├── email/             ✅ Bien estructurado con tests
│   ├── empresas/          ✅ Bien estructurado con tests
│   ├── negocios/          ✅ Bien estructurado
│   ├── origin-client/     ✅ Excelente estructura con tests
│   ├── pre-liquidacion/   ⚠️ Solo services, sin estructura completa
│   ├── product/           ✅ Excelente estructura con tests
│   └── shared/            ✅ Correcto (recursos compartidos)
│
├── lib/                   ⚠️ PROBLEMA: Código que debería estar en features
│   ├── api/               ✅ OK (cliente API global)
│   ├── auth/              🔴 MIGRAR a features/auth/lib/
│   ├── currency/          🔴 MIGRAR a features/admin/currencies/lib/
│   ├── email/             🔴 MIGRAR a features/email/lib/
│   ├── navigation/       ⚠️ Evaluar si debe estar en shared
│   ├── prisma.ts          ✅ OK (cliente global)
│   └── utils.ts           ⚠️ Evaluar si debe estar en shared
│
└── services/              🔴 PROBLEMA CRÍTICO: Servicios legacy
    ├── company.service.ts  🔴 MIGRAR a features/admin/companies/lib/
    ├── currency.service.ts 🔴 MIGRAR a features/admin/currencies/lib/
    ├── origin.service.ts  🔴 MIGRAR a features/admin/origins/lib/
    ├── periodicity.service.ts 🔴 MIGRAR a features/admin/periodicities/lib/
    └── product.service.ts 🔴 MIGRAR a features/admin/products/lib/
```

---

## 🔴 Problemas Críticos Identificados

### 1. Servicios Legacy en `src/services/` (CRÍTICO)

**Problema:** Existen 5 servicios en `src/services/` que violan Feature-Based Architecture.

**Archivos afectados:**
- `src/services/company.service.ts`
- `src/services/currency.service.ts`
- `src/services/origin.service.ts`
- `src/services/periodicity.service.ts`
- `src/services/product.service.ts`

**Ejemplo de violación:**
```typescript
// ❌ src/services/product.service.ts
import { prisma } from '@/lib/prisma'
import { Product } from '@prisma/client'

export const getProducts = async (): Promise<Product[]> => {
	return await prisma.product.findMany({
		where: { status: true },
		orderBy: { name: 'asc' },
	})
}
```

**Impacto:**
- ❌ Organización por tipo técnico, no por dominio
- ❌ Duplicación con código en `features/admin/products/lib/product-api.ts`
- ❌ Dificulta encontrar código relacionado
- ❌ Viola principio de autocontención de features

**Solución:**
- Migrar cada servicio a su feature correspondiente en `lib/[feature]-api.ts`
- Eliminar `src/services/` después de migración
- Actualizar imports en todo el proyecto

---

### 2. Código de Dominio en `src/lib/` (ALTO)

**Problema:** Código específico de dominio está en `src/lib/` en lugar de features.

**Archivos a migrar:**

#### `src/lib/auth/` → `src/features/auth/lib/`
- `user-creation.ts` - Lógica de creación de usuarios
- `user-validation.ts` - Validación de usuarios
- `password-utils.ts` - Utilidades de contraseñas
- `permissions.ts` - Sistema de permisos
- `roles.ts` - Definición de roles
- `audit-logger.ts` - Logging de auditoría

**Justificación:** Todo el código de autenticación debe estar autocontenido en `features/auth/`.

#### `src/lib/currency/` → `src/features/admin/currencies/lib/`
- `index.ts` - Funciones de formateo de moneda

**Justificación:** Utilidades específicas de moneda deben estar en el feature de currencies.

#### `src/lib/email/` → `src/features/email/lib/`
- `admin-notifications.ts` - Notificaciones a administradores
- `user-activation-notification.ts` - Notificaciones de activación

**Justificación:** Ya existe `features/email/`, consolidar todo ahí.

**Archivos que pueden quedarse en `src/lib/`:**
- ✅ `lib/api/client.ts` - Cliente API global (infraestructura)
- ✅ `lib/prisma.ts` - Cliente Prisma global (infraestructura)
- ⚠️ `lib/navigation/` - Evaluar si debe estar en `features/shared/layout/`
- ⚠️ `lib/utils.ts` - Evaluar si debe estar en `features/shared/lib/`

---

### 3. Uso de `any` en TypeScript (MEDIO)

**Problema:** Se encontraron 43 ocurrencias de `any` en el código.

**Archivos más afectados:**
- `src/app/api/negocios/__tests__/business-list.route.test.ts` (5 ocurrencias)
- `src/app/api/negocios/stats/__tests__/route.test.ts` (4 ocurrencias)
- `src/features/shared/ui/__tests__/sonner.test.tsx` (4 ocurrencias)

**Impacto:**
- ❌ Pérdida de type safety
- ❌ Errores en tiempo de ejecución
- ❌ Dificulta refactorización
- ❌ Viola principio de TypeScript estricto

**Solución:**
- Reemplazar `any` con tipos específicos
- Usar `unknown` cuando el tipo es realmente desconocido
- Crear tipos/interfaces apropiados

---

### 4. Falta de Inmutabilidad (`readonly`) (MEDIO)

**Problema:** Solo 1 archivo usa `readonly` en interfaces.

**Impacto:**
- ❌ Interfaces mutables cuando deberían ser inmutables
- ❌ Posibles bugs por mutación accidental
- ❌ No sigue best practices de TypeScript

**Ejemplo esperado:**
```typescript
// ✅ Correcto
export interface Product {
  readonly idProduct: number
  readonly name: string
  readonly createdAt: Date
  status: 'active' | 'inactive' // Campo mutable
}
```

---

### 5. Estructura Incompleta en Algunos Features (BAJO)

**Features con estructura incompleta:**

#### `features/admin/origins/`
- ❌ Falta `components/`
- ❌ Falta `hooks/`
- ✅ Tiene `lib/` y `types/`

#### `features/auth/`
- ✅ Tiene `components/`
- ❌ Falta `lib/` (tiene código en `src/lib/auth/`)
- ❌ Falta `hooks/`
- ❌ Falta `types/`
- ❌ Falta `__tests__/`

#### `features/pre-liquidacion/`
- ❌ Falta `components/`
- ❌ Falta `hooks/`
- ✅ Tiene `services/` (correcto para lógica compleja)
- ❌ Falta `lib/` (schemas Zod)
- ❌ Falta `types/`
- ✅ Tiene `__tests__/`

---

## ✅ Aspectos Positivos

### 1. Features Bien Estructurados

Los siguientes features siguen correctamente la arquitectura:

- ✅ `features/categories/` - Estructura completa con tests
- ✅ `features/product/` - Excelente estructura con tests completos
- ✅ `features/origin-client/` - Estructura modelo con todos los componentes
- ✅ `features/empresas/` - Bien estructurado con tests
- ✅ `features/email/` - Estructura correcta con tests
- ✅ `features/admin/categories/` - Estructura completa
- ✅ `features/admin/companies/` - Estructura completa
- ✅ `features/admin/users/` - Estructura completa con utils

### 2. Tests Colocalizados

- ✅ 47 archivos de tests unitarios
- ✅ Tests organizados en `__tests__/` dentro de features
- ✅ Cobertura en componentes, hooks, lib, mappers

### 3. Uso de Schemas Zod

- ✅ Varios features usan schemas Zod para validación
- ✅ Ejemplos: `product-schemas.ts`, `category-schemas.ts`, `email-schemas.ts`

### 4. Separación de Responsabilidades

- ✅ Componentes separados de lógica de negocio
- ✅ Hooks para data fetching
- ✅ Mappers para transformación de datos

---

## 📋 Análisis de Pruebas Unitarias

### Cobertura por Feature

| Feature | Tests | Cobertura | Estado |
|---------|-------|-----------|--------|
| `categories` | 10 archivos | ✅ Alta | Completo |
| `product` | 9 archivos | ✅ Alta | Completo |
| `origin-client` | 6 archivos | ✅ Alta | Completo |
| `empresas` | 6 archivos | ✅ Alta | Completo |
| `negocios` | 8 archivos | ✅ Media-Alta | Bueno |
| `email` | 1 archivo | ⚠️ Baja | Necesita más tests |
| `admin/users` | 3 archivos | ⚠️ Media | Necesita más tests |
| `pre-liquidacion` | 1 archivo | ⚠️ Baja | Necesita más tests |
| `shared/ui` | 9 archivos | ✅ Alta | Completo |
| `shared/hooks` | 1 archivo | ⚠️ Baja | Necesita más tests |

### Tests en `src/lib/` (Legacy)

- `lib/api/__tests__/client.test.ts` ✅
- `lib/auth/__tests__/user-creation.test.ts` ✅
- `lib/auth/__tests__/user-validation.test.ts` ✅
- `lib/currency/__tests__/currency.test.ts` ✅
- `lib/email/__tests__/admin-notifications.test.ts` ✅

**Nota:** Estos tests deben migrarse junto con el código a sus features correspondientes.

### Tests en `src/app/api/` (API Routes)

- ✅ Tests para rutas de negocios
- ✅ Tests para rutas de productos
- ✅ Tests para rutas de origins

**Estado:** ✅ Correcto - Los tests de API routes pueden quedarse en `app/api/`.

---

## 🎯 Plan de Refactorización Detallado

### Fase 1: Migración de Servicios Legacy (CRÍTICO)

**Prioridad:** 🔴 ALTA  
**Esfuerzo:** Medio  
**Riesgo:** Medio (requiere actualizar imports)

#### Tareas:

1. **Migrar `src/services/product.service.ts`**
   - ✅ Ya existe `features/admin/products/lib/product-api.ts`
   - Verificar si el servicio legacy se usa en algún lugar
   - Si no se usa: Eliminar
   - Si se usa: Migrar lógica y actualizar imports

2. **Migrar `src/services/company.service.ts`**
   - ✅ Ya existe `features/admin/companies/lib/company-api.ts`
   - Verificar uso y migrar/eliminar

3. **Migrar `src/services/currency.service.ts`**
   - ✅ Ya existe `features/admin/currencies/lib/currency-api.ts`
   - Verificar uso y migrar/eliminar

4. **Migrar `src/services/origin.service.ts`**
   - ✅ Ya existe `features/admin/origins/lib/origin-api.ts`
   - Verificar uso y migrar/eliminar

5. **Migrar `src/services/periodicity.service.ts`**
   - ✅ Ya existe `features/admin/periodicities/lib/periodicity-api.ts`
   - Verificar uso y migrar/eliminar

6. **Eliminar directorio `src/services/`**
   - Después de migrar todos los servicios
   - Actualizar `.gitignore` si es necesario

**Criterios de éxito:**
- ✅ No hay archivos en `src/services/`
- ✅ Todos los imports actualizados
- ✅ Tests pasando
- ✅ No hay referencias al directorio legacy

---

### Fase 2: Migración de Código de Dominio desde `src/lib/` (ALTO)

**Prioridad:** 🟡 ALTA  
**Esfuerzo:** Alto  
**Riesgo:** Alto (muchos archivos afectados)

#### 2.1 Migrar `src/lib/auth/` → `src/features/auth/lib/`

**Archivos a migrar:**
- `user-creation.ts` → `features/auth/lib/user-creation.ts`
- `user-validation.ts` → `features/auth/lib/user-validation.ts`
- `password-utils.ts` → `features/auth/lib/password-utils.ts`
- `permissions.ts` → `features/auth/lib/permissions.ts`
- `roles.ts` → `features/auth/lib/roles.ts`
- `audit-logger.ts` → `features/auth/lib/audit-logger.ts`
- `config.ts` → `features/auth/lib/config.ts`
- `types.ts` → `features/auth/types/auth.types.ts`
- `nextauth.ts` → `features/auth/lib/nextauth.ts` (o mantener en `lib/` si es configuración global)

**Tests a migrar:**
- `lib/auth/__tests__/user-creation.test.ts`
- `lib/auth/__tests__/user-validation.test.ts`

**Tareas:**
1. Crear estructura `features/auth/lib/` y `features/auth/types/`
2. Mover archivos manteniendo estructura
3. Actualizar imports en todo el proyecto
4. Migrar tests
5. Verificar que todo funciona

#### 2.2 Migrar `src/lib/currency/` → `src/features/admin/currencies/lib/`

**Archivos a migrar:**
- `currency/index.ts` → `features/admin/currencies/lib/currency-formatters.ts`

**Tests a migrar:**
- `lib/currency/__tests__/currency.test.ts`

**Tareas:**
1. Mover funciones de formateo a `features/admin/currencies/lib/`
2. Actualizar imports
3. Migrar tests

#### 2.3 Migrar `src/lib/email/` → `src/features/email/lib/`

**Archivos a migrar:**
- `admin-notifications.ts` → `features/email/lib/admin-notifications.ts`
- `user-activation-notification.ts` → `features/email/lib/user-activation-notification.ts`

**Tests a migrar:**
- `lib/email/__tests__/admin-notifications.test.ts`

**Tareas:**
1. Consolidar en `features/email/lib/`
2. Actualizar imports
3. Migrar tests

#### 2.4 Evaluar `src/lib/navigation/`

**Opciones:**
- Opción A: Mover a `features/shared/layout/lib/` (si es específico de layout)
- Opción B: Mover a `features/shared/lib/navigation/` (si es utilidad compartida)
- Opción C: Mantener en `lib/` si es configuración global de Next.js

**Recomendación:** Mover a `features/shared/layout/lib/` ya que está relacionado con navegación del layout.

#### 2.5 Evaluar `src/lib/utils.ts`

**Opciones:**
- Opción A: Mover a `features/shared/lib/utils.ts`
- Opción B: Mantener en `lib/` si contiene utilidades muy genéricas (cn, etc.)

**Recomendación:** Si contiene solo `cn` (className utility), mantener en `lib/`. Si tiene más lógica, mover a `features/shared/lib/`.

**Criterios de éxito:**
- ✅ `src/lib/` solo contiene infraestructura global (api/client, prisma)
- ✅ Todo el código de dominio está en features
- ✅ Todos los imports actualizados
- ✅ Tests migrados y pasando

---

### Fase 3: Completar Estructura de Features Incompletos (MEDIO)

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** Medio  
**Riesgo:** Bajo

#### 3.1 Completar `features/admin/origins/`

**Tareas:**
1. Crear `components/origins-table.tsx` (si se necesita UI)
2. Crear `hooks/use-origins.ts` y `hooks/use-origin-mutations.ts`
3. Verificar que `lib/` y `types/` estén completos
4. Agregar tests si es necesario

#### 3.2 Completar `features/auth/`

**Tareas:**
1. ✅ Ya se migrará `lib/` en Fase 2
2. Crear `hooks/use-auth.ts`, `hooks/use-session.ts` (si no existen)
3. Crear `types/auth.types.ts` (migrar desde `lib/auth/types.ts`)
4. Crear `__tests__/` con tests básicos
5. Verificar estructura completa

#### 3.3 Completar `features/pre-liquidacion/`

**Tareas:**
1. Crear `lib/pre-liquidacion-schemas.ts` (schemas Zod para validación)
2. Crear `types/pre-liquidacion.types.ts` (si no existe)
3. Evaluar si necesita `components/` o `hooks/`
4. Agregar más tests

**Criterios de éxito:**
- ✅ Todos los features tienen estructura mínima completa
- ✅ `components/`, `hooks/`, `lib/`, `types/` según necesidad
- ✅ Tests básicos implementados

---

### Fase 4: Eliminar Uso de `any` (MEDIO)

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** Medio-Alto  
**Riesgo:** Bajo-Medio

#### Tareas:

1. **Auditar todos los usos de `any`**
   - Listar archivos con `any`
   - Categorizar por tipo (tests, implementación, etc.)

2. **Reemplazar en tests**
   - Usar tipos específicos o `unknown`
   - Crear mocks tipados

3. **Reemplazar en implementación**
   - Crear interfaces/tipos apropiados
   - Usar generics cuando sea necesario
   - Usar `unknown` y type guards cuando el tipo es realmente desconocido

4. **Configurar ESLint**
   - Habilitar regla `@typescript-eslint/no-explicit-any`
   - Configurar como error o warning

**Archivos prioritarios:**
- `src/app/api/negocios/__tests__/business-list.route.test.ts` (5 ocurrencias)
- `src/app/api/negocios/stats/__tests__/route.test.ts` (4 ocurrencias)
- `src/features/shared/ui/__tests__/sonner.test.tsx` (4 ocurrencias)

**Criterios de éxito:**
- ✅ 0 ocurrencias de `any` en código de producción
- ✅ Mínimas ocurrencias en tests (solo cuando sea necesario)
- ✅ ESLint configurado para prevenir nuevos `any`

---

### Fase 5: Implementar Inmutabilidad con `readonly` (BAJO)

**Prioridad:** 🟢 BAJA  
**Esfuerzo:** Bajo-Medio  
**Riesgo:** Bajo

#### Tareas:

1. **Auditar interfaces principales**
   - Revisar interfaces en `types/` de cada feature
   - Identificar campos que deberían ser `readonly`

2. **Aplicar `readonly`**
   - IDs y campos de auditoría (createdAt, updatedAt)
   - Campos que vienen de la base de datos y no deben mutarse
   - Campos calculados

3. **Documentar convenciones**
   - Agregar a guía de arquitectura
   - Ejemplos de uso

**Ejemplo:**
```typescript
// ✅ Correcto
export interface Product {
  readonly idProduct: number
  readonly name: string
  readonly createdAt: Date
  status: 'active' | 'inactive' // Campo mutable
  updatedAt: Date // Campo mutable
}
```

**Criterios de éxito:**
- ✅ Interfaces principales usan `readonly` apropiadamente
- ✅ Convenciones documentadas
- ✅ Código nuevo sigue las convenciones

---

### Fase 6: Mejorar Cobertura de Tests (MEDIO)

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** Alto  
**Riesgo:** Bajo

#### Tareas:

1. **Identificar gaps de cobertura**
   - Features sin tests: `auth`, algunos `admin/*`
   - Hooks sin tests
   - Funciones de `lib/` sin tests

2. **Priorizar tests**
   - Funciones críticas de negocio primero
   - Hooks de data fetching
   - Componentes complejos

3. **Implementar tests**
   - Unit tests para funciones puras
   - Integration tests para hooks
   - Component tests para UI

**Features que necesitan más tests:**
- `features/auth/` - Agregar tests después de migración
- `features/pre-liquidacion/` - Agregar más tests
- `features/admin/origins/` - Agregar tests si se agregan componentes/hooks
- `features/shared/hooks/` - Agregar tests para hooks faltantes

**Criterios de éxito:**
- ✅ Cobertura mínima del 70% en código crítico
- ✅ Todos los hooks tienen tests
- ✅ Funciones de negocio tienen tests

---

## 📈 Métricas de Calidad del Código

### Estado Actual

| Métrica | Valor Actual | Objetivo | Gap |
|---------|--------------|----------|-----|
| Features bien estructurados | 67% (8/12) | 100% | -33% |
| Código en ubicación correcta | ~75% | 100% | -25% |
| Type safety (sin `any`) | ~95% | 100% | -5% |
| Inmutabilidad (`readonly`) | ~5% | 80% | -75% |
| Cobertura de tests | ~60% | 80% | -20% |

### Objetivos Post-Refactorización

| Métrica | Objetivo | Timeline |
|---------|----------|----------|
| Features bien estructurados | 100% | Fase 3 |
| Código en ubicación correcta | 100% | Fase 2 |
| Type safety (sin `any`) | 100% | Fase 4 |
| Inmutabilidad (`readonly`) | 80% | Fase 5 |
| Cobertura de tests | 80% | Fase 6 |

---

## 🚀 Roadmap de Implementación

### Sprint 1 (Semana 1-2): Migración Crítica
- ✅ Fase 1: Migrar servicios legacy
- ✅ Inicio Fase 2.1: Migrar `lib/auth/`

### Sprint 2 (Semana 3-4): Consolidación
- ✅ Completar Fase 2: Migrar todo `lib/` de dominio
- ✅ Fase 3: Completar features incompletos

### Sprint 3 (Semana 5-6): Calidad
- ✅ Fase 4: Eliminar `any`
- ✅ Fase 5: Implementar `readonly`
- ✅ Fase 6: Mejorar tests

---

## 📝 Recomendaciones Adicionales

### 1. Configuración de ESLint

Agregar reglas estrictas:
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/prefer-readonly": "warn"
  }
}
```

### 2. Pre-commit Hooks

Agregar validaciones:
- Verificar que no se creen archivos en `src/services/`
- Verificar que no se use `any`
- Verificar estructura de features nuevos

### 3. Documentación

- Actualizar `ARCHITECTURE.md` con ejemplos de migración
- Crear guía de "Cómo migrar código legacy"
- Documentar convenciones de `readonly`

### 4. Code Review Checklist

Agregar a PR template:
- [ ] ¿El código está en el feature correcto?
- [ ] ¿No se usa `any`?
- [ ] ¿Las interfaces usan `readonly` apropiadamente?
- [ ] ¿Hay tests para el código nuevo?

---

## ✅ Conclusión

El proyecto está en una **transición saludable** hacia Feature-Based Architecture. La mayoría de los features ya siguen la estructura correcta, pero hay trabajo pendiente en:

1. **Migrar código legacy** (servicios y lib de dominio)
2. **Completar estructura** de algunos features
3. **Mejorar calidad** (eliminar `any`, agregar `readonly`, más tests)

Con la ejecución del plan de refactorización, el proyecto alcanzará un **100% de alineación** con la arquitectura objetivo en **6 semanas**.

---

**Próximos Pasos:**
1. Revisar y aprobar este plan
2. Priorizar fases según necesidades del negocio
3. Asignar recursos para ejecución
4. Establecer métricas de seguimiento
