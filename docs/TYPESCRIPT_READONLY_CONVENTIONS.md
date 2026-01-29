# Convenciones de Inmutabilidad con `readonly` en TypeScript

**Propósito**: Guía de convenciones para aplicar `readonly` apropiadamente en interfaces TypeScript del proyecto Financieramente.

**Fecha de creación**: 2026-01-28  
**Basado en**: Phase 7 - User Story 5 del refactor arquitectónico

---

## Principios Generales

### ¿Cuándo usar `readonly`?

Usa `readonly` en campos que **nunca cambian** después de la creación del objeto. Estos campos son típicamente:

1. **IDs**: Identificadores únicos que nunca se modifican
2. **Timestamps de creación**: `createdAt`, `createdDate`, etc.
3. **Referencias inmutables**: IDs de relaciones que no cambian

### ¿Cuándo NO usar `readonly`?

NO uses `readonly` en campos que pueden cambiar durante el ciclo de vida del objeto:

- Campos de estado (`status`, `active`, `enabled`)
- Campos de actualización (`updatedAt` puede cambiar, pero `createdAt` no)
- Campos de negocio mutables (`name`, `description`, `value`)
- Campos calculados o derivados

---

## Reglas Específicas

### 1. IDs siempre son `readonly`

```typescript
// ✅ CORRECTO
export interface Product {
  readonly idProduct: number
  name: string
  status: boolean
}

// ❌ INCORRECTO
export interface Product {
  idProduct: number  // Debe ser readonly
  name: string
}
```

### 2. Timestamps de creación son `readonly`

```typescript
// ✅ CORRECTO
export interface User {
  readonly id: number
  readonly createdAt: Date
  updatedAt: Date  // Puede cambiar, no es readonly
  name: string
}

// ❌ INCORRECTO
export interface User {
  readonly id: number
  createdAt: Date  // Debe ser readonly
  updatedAt: Date
}
```

### 3. IDs en objetos anidados también son `readonly`

```typescript
// ✅ CORRECTO
export interface Product {
  readonly idProduct: number
  company: {
    readonly idCompany: number  // ID en objeto anidado también es readonly
    name: string
  }
}

// ❌ INCORRECTO
export interface Product {
  readonly idProduct: number
  company: {
    idCompany: number  // Debe ser readonly
    name: string
  }
}
```

### 4. Campos de estado NO son `readonly`

```typescript
// ✅ CORRECTO
export interface Product {
  readonly idProduct: number
  readonly createdAt: string
  status: boolean  // Puede cambiar, no es readonly
  active: boolean  // Puede cambiar, no es readonly
}

// ❌ INCORRECTO
export interface Product {
  readonly idProduct: number
  readonly status: boolean  // NO debe ser readonly, puede cambiar
}
```

---

## Ejemplos del Proyecto

### Ejemplo 1: Interface de Producto

```typescript
export interface Product extends Record<string, unknown> {
  readonly idProduct: number           // ✅ ID inmutable
  name: string                         // ❌ Campo mutable
  description: string | null           // ❌ Campo mutable
  status: boolean                      // ❌ Campo mutable (estado)
  readonly idCompany: number           // ✅ ID de relación inmutable
  readonly idTypeProduct: number | null // ✅ ID de relación inmutable
  company: {
    readonly idCompany: number         // ✅ ID en objeto anidado
    name: string                       // ❌ Campo mutable
  }
  readonly createdAt: string          // ✅ Timestamp de creación
  readonly updatedAt: string          // ⚠️ Normalmente mutable, pero en este caso es readonly
}
```

### Ejemplo 2: Interface de Usuario

```typescript
export interface User {
  readonly id: number                  // ✅ ID inmutable
  name: string                         // ❌ Campo mutable
  lastName: string | null              // ❌ Campo mutable
  email: string | null                 // ❌ Campo mutable
  avatar: string | null                // ❌ Campo mutable
  role: UserRole | null                // ❌ Relación mutable
  active: boolean                      // ❌ Campo de estado mutable
  readonly createdAt: Date             // ✅ Timestamp de creación
  lastLogin: Date | null               // ❌ Campo mutable
}
```

### Ejemplo 3: Interface de Origen

```typescript
export interface ProductOrigin {
  readonly idOrigin: number            // ✅ ID inmutable
  name: string                         // ❌ Campo mutable
  description: string | null           // ❌ Campo mutable
  status: boolean                      // ❌ Campo de estado mutable
  readonly createdAt: string          // ✅ Timestamp de creación
  readonly updatedAt: string           // ⚠️ Normalmente mutable
}
```

---

## Validación y Métricas

### Objetivo de Cobertura

- **Mínimo**: 80% de interfaces principales deben usar `readonly` apropiadamente
- **Interfaces principales**: Aquellas que representan entidades de dominio (Product, User, Company, etc.)

### Cómo Validar

1. Identificar interfaces principales en `src/features/`
2. Verificar que IDs y `createdAt` tienen `readonly`
3. Contar interfaces con `readonly` apropiado vs. total
4. Asegurar que al menos 80% cumple con las convenciones

### Comandos Útiles

```bash
# Encontrar interfaces principales
find src/features -name "*.ts" -exec grep -l "interface" {} \;

# Verificar uso de readonly en IDs
grep -r "readonly id" src/features --include="*.ts"

# Verificar uso de readonly en createdAt
grep -r "readonly createdAt" src/features --include="*.ts"
```

---

## Beneficios

1. **Type Safety**: Previene modificaciones accidentales de campos inmutables
2. **Documentación**: Hace explícito qué campos no deben modificarse
3. **Mantenibilidad**: Facilita entender el contrato de las interfaces
4. **Consistencia**: Establece un patrón claro en todo el proyecto

---

## Referencias

- [TypeScript Handbook - Readonly](https://www.typescriptlang.org/docs/handbook/2/classes.html#readonly)
- [TypeScript Deep Dive - Readonly](https://basarat.gitbook.io/typescript/type-system/readonly)
- Feature-Based Architecture Guidelines: `.cursor/rules/ARCHITECTURE.md`
