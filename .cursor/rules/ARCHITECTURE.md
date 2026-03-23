# Feature-Based Architecture + TypeScript Best Practices

## 📋 Principios Aplicados

### ✅ Feature-Based Architecture (Screaming Architecture)

- **Organización por feature/dominio** - No por tipo técnico
- **Funcionalidades evidentes** - La estructura refleja qué hace la app
- **Features autocontenidos** - Cada feature contiene todo lo necesario (tipos, schemas, hooks, componentes)
- **Dominios independientes** - Cada carpeta es una funcionalidad de negocio

### ✅ TypeScript Best Practices

- **Immutability** - `readonly` en interfaces cuando sea apropiado
- **Type safety estricto** - No `any`, tipos específicos siempre
- **Functional programming** - Funciones puras, evitar clases estáticas
- **Interface segregation** - Contratos específicos y bien definidos
- **Testing colocalizado** - Tests en `__tests__/` dentro de cada feature

## 🏗️ Estructura del Proyecto

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (simplificados)
│   │   ├── admin/                # Endpoints de administración
│   │   ├── auth/                 # Autenticación
│   │   └── email/                # Servicios de email
│   └── dashboard/                # Páginas del dashboard
│
├── features/                     # 🎯 Feature-Based Architecture
│   ├── admin/                    # Features de administración
│   │   ├── products/             # Feature de productos
│   │   │   ├── components/       # Componentes específicos
│   │   │   ├── hooks/            # Custom hooks
│   │   │   ├── lib/              # Lógica y schemas
│   │   │   │   ├── product-api.ts
│   │   │   │   └── product-schemas.ts
│   │   │   ├── types/            # Tipos TypeScript
│   │   │   └── __tests__/        # Tests del feature
│   │   ├── companies/            # Feature de compañías
│   │   ├── categories/           # Feature de categorías
│   │   ├── currencies/           # Feature de monedas
│   │   ├── periodicities/        # Feature de periodicidades
│   │   ├── origins/              # Feature de orígenes
│   │   ├── users/                # Feature de usuarios
│   │   └── shared/               # Componentes admin compartidos
│   │
│   ├── auth/                     # Feature de autenticación
│   │   ├── components/           # Componentes de auth
│   │   └── __tests__/
│   │
│   ├── email/                    # Feature de email
│   │   ├── lib/
│   │   └── types/
│   │
│   ├── negocios/                 # Feature de negocios
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/             # Servicios del dominio (opcional)
│   │   ├── mappers/              # Mappers de datos (opcional)
│   │   ├── types/
│   │   └── __tests__/
│   │
│   └── shared/                   # Recursos compartidos
│       ├── ui/                   # Componentes UI compartidos
│       ├── layout/               # Componentes de layout
│       ├── hooks/                # Hooks compartidos
│       ├── providers/            # Providers compartidos
│       ├── types/                # Tipos compartidos
│       └── __tests__/
│
├── lib/                          # Utilidades globales
│   ├── api/
│   │   └── client.ts             # Cliente API centralizado
│   ├── auth/                     # Utilidades de autenticación
│   ├── email/                    # Notificaciones de email
│   ├── navigation/               # Navegación y menús
│   └── prisma.ts                 # Cliente Prisma
│
└── types/                        # Tipos globales (solo env.d.ts)
    └── env.d.ts                  # Tipos de variables de entorno
```

## 🎯 Estructura de un Feature

Cada feature debe seguir esta estructura estándar:

```
features/[feature-name]/
├── components/          # Componentes React específicos del feature
├── hooks/               # Custom hooks para data fetching y mutations
├── lib/                 # Schemas Zod y funciones de negocio/API
│   ├── [feature]-api.ts
│   └── [feature]-schemas.ts
├── types/               # Interfaces TypeScript del feature
├── services/            # Servicios del dominio (opcional, solo si es necesario)
├── mappers/             # Mappers de datos (opcional, solo si es necesario)
├── __tests__/           # Tests del feature (unitarios e integración)
└── index.ts             # Barrel exports (opcional)
```

### Separación de Responsabilidades

- **`types/`** - Interfaces TypeScript del dominio
- **`lib/`** - Schemas Zod para validación y funciones de API/negocio
- **`hooks/`** - Custom hooks para data fetching y mutations
- **`components/`** - Componentes React específicos del feature
- **`services/`** - Servicios del dominio (opcional, solo cuando se necesite lógica compleja)
- **`mappers/`** - Mappers de datos entre capas (opcional)
- **`__tests__/`** - Tests colocalizados con el código

### API Routes y acceso a datos (regla obligatoria)

- **NUNCA llamar Prisma desde las API routes** (`src/app/api/`). Las rutas del API Router solo orquestan: validan entrada, llaman a **servicios del feature** correspondiente y devuelven la respuesta.
- **Siempre usar servicios de features** para cualquier acceso a base de datos: los archivos en `src/app/api/**/*.ts` deben importar y usar funciones de `src/features/[feature]/services/` (o `lib/` cuando el feature no tenga carpeta `services/`), nunca importar `prisma` ni ejecutar queries directamente.
- **Responsabilidad**: API Route = HTTP, validación, llamada a servicio. Servicio del feature = Prisma y lógica de dominio.

### Hooks con llamadas asíncronas (regla obligatoria)

- **Siempre usar el tipo `AsyncState<T>`** de `src/features/shared/types/async-state.types.ts` en hooks que hacen llamadas asíncronas (fetch, mutaciones, etc.). No manejar por separado tres estados (p. ej. `isLoading`, `data`, `error` con varios `useState`).
- **Un solo estado discriminado**: el hook debe exponer un estado tipado como `AsyncState<T>` (`idle` | `loading` | `success` | `error`) para permitir type narrowing y UI consistente (loading, error, success, idle).
- **Referencia**: [async-state.types.ts](src/features/shared/types/async-state.types.ts).

## 🎯 Beneficios de la Arquitectura

### **1. Feature-Based Organization**

```
❌ services/auth.service.ts          ✅ features/auth/lib/auth-api.ts
❌ utils/jwt.ts                      ✅ features/auth/lib/token-utils.ts
❌ types/auth.ts                     ✅ features/auth/types/auth.types.ts
❌ components/AuthForm.tsx           ✅ features/auth/components/login-form.tsx
```

### **2. Type Safety**

```typescript
// ❌ Antes - Clase estática, any types
export class ProductService {
  static async getProducts(): Promise<any> {
    // ...
  }
}

// ✅ Después - Funcional, tipos estrictos
// src/features/admin/products/lib/product-api.ts
import { apiClient } from '@/lib/api/client'
import type { Product } from '../types/product.types'

export async function getProducts(): Promise<Product[]> {
  return apiClient.get<Product[]>('/api/admin/products')
}
```

### **3. Immutability**

```typescript
// ✅ Interfaces con readonly cuando sea apropiado
export interface Product {
  readonly idProduct: number
  readonly name: string
  readonly createdAt: Date
  // Campos mutables no llevan readonly
  status: 'active' | 'inactive'
}
```

### **4. Schemas Zod para Validación**

```typescript
// src/features/admin/products/lib/product-schemas.ts
import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
```

### **5. Testing Colocalizado**

```typescript
// src/features/admin/products/__tests__/lib/product-api.test.ts
import { describe, it, expect } from 'vitest'
import { getProducts } from '../lib/product-api'

describe('product-api', () => {
  it('should fetch products', async () => {
    // Test implementation
  })
})
```

## 📊 Comparación

| Aspecto             | ❌ Antes                   | ✅ Después             |
| ------------------- | -------------------------- | ---------------------- |
| **Organización**    | Por tipo técnico           | Por feature/dominio    |
| **Type Safety**     | Parcial                    | Estricta               |
| **Testability**     | Tests dispersos            | Tests colocalizados    |
| **Maintainability** | Código acoplado            | Features autocontenidos |
| **Scalability**     | Limitada                   | Alta                   |
| **Domain Clarity**  | Confusa                    | Evidente               |

## 💡 Principios de Desarrollo

1. **Feature-Driven** - Cada carpeta = feature/dominio de negocio
2. **Autocontenido** - Cada feature contiene todo lo necesario
3. **Type-Safe** - TypeScript estricto, no `any`
4. **Testable** - Tests colocalizados en `__tests__/`
5. **Maintainable** - Separación clara de responsabilidades
6. **Shared Resources** - Solo componentes/hooks/tipos realmente compartidos en `features/shared/`

## 📝 Ejemplo Completo de Feature

```typescript
// src/features/admin/products/types/product.types.ts
export interface Product extends Record<string, unknown> {
  idProduct: number
  name: string
  description?: string
  status: 'active' | 'inactive'
}

// src/features/admin/products/lib/product-schemas.ts
import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']),
})

export type CreateProductInput = z.infer<typeof createProductSchema>

// src/features/admin/products/lib/product-api.ts
import { apiClient } from '@/lib/api/client'
import type { Product } from '../types/product.types'
import type { CreateProductInput } from './product-schemas'

export async function getProducts(): Promise<Product[]> {
  return apiClient.get<Product[]>('/api/admin/products')
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  return apiClient.post<Product>('/api/admin/products', input)
}

// src/features/admin/products/hooks/use-products.ts
import { useQuery } from '@tanstack/react-query'
import { getProducts } from '../lib/product-api'

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  })
}

// src/features/admin/products/components/products-table.tsx
import { useProducts } from '../hooks/use-products'

export function ProductsTable() {
  const { data: products, isLoading } = useProducts()
  
  if (isLoading) return <div>Loading...</div>
  
  return (
    <table>
      {/* Table implementation */}
    </table>
  )
}
```

## 🚀 Reglas de Ubicación

### ✅ DO

- Crear nuevos features en `src/features/[feature-name]/`
- Colocar componentes específicos del feature en `components/`
- Colocar hooks específicos en `hooks/`
- Colocar schemas Zod y funciones de API en `lib/`
- Colocar tipos TypeScript en `types/`
- Colocar tests en `__tests__/` dentro del feature
- Usar `features/shared/` solo para recursos realmente compartidos (3+ features)

### ❌ DON'T

- Crear archivos sueltos en `src/services/`, `src/utils/`, `src/types/` (deben estar en features)
- Colocar lógica de negocio en componentes (usar hooks o lib/)
- Colocar componentes compartidos en features específicos (usar `features/shared/`)
- Usar `any` en TypeScript
- Crear clases estáticas para servicios (usar funciones)


- `typescript` - Const types, flat interfaces
- `react-19` - No useMemo/useCallback, compiler
- `nextjs-16` - App Router, Server Actions
- `financieramente` - Project overview and structure
- `components` - buenas praticas de componentes

