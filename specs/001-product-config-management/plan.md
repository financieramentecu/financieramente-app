# Implementation Plan: Administración de Configuración de Producto

**Branch**: `001-product-config-management` | **Date**: 2026-02-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-product-config-management/spec.md`

## Summary

Implementar el CRUD completo de ProductConfiguration siguiendo el patrón exacto de `src/features/categories/`. Incluye: migración Prisma (campo `active`), feature module en `src/features/product-configuration/`, API routes REST, pages Next.js, link en sidebar Administración, y transacción de creación con auto-creación de PPC. El enfoque técnico replica los patrones existentes del proyecto (categories como referencia) para mantener consistencia arquitectónica.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20+
**Primary Dependencies**: Next.js 15, React 19, Prisma ORM, Zod, React Hook Form, Vitest, Testing Library
**Storage**: PostgreSQL 15 (migración: campo `active` en `product_configuration`)
**Testing**: Vitest (unit), Testing Library (component)
**Target Platform**: Web application (Next.js App Router)
**Project Type**: Web application (single project with Next.js App Router)
**Constraints**:
- Seguir Feature-Based Architecture existente
- Replicar patrones de `src/features/categories/` para consistencia
- No gestionar ProductPercentajeCommisionCategory (fuera de alcance)
- No eliminación permanente de configuraciones (soft delete via `active`)
- Código generado automáticamente ≤ 50 caracteres (límite DB)

## Scope

- **In**: Prisma migration, feature module completo (types, schemas, api client, hooks, mappers, components, tests), API routes, Next.js pages, sidebar link, selects Company→Product filtrado, ClientOrigin, Category
- **Out**: Gestión de ProductPercentajeCommisionCategory, administración de Product/ClientOrigin/Category, eliminación permanente

## Existing Code to Reuse

| What | File |
|------|------|
| `buildProductConfigurationCode()` | `src/features/negocios/lib/product-configuration-code.ts` |
| `ApiResponse<T>` type | `src/features/shared/types/api-response.types.ts` |
| `AsyncState<T>` type | `src/features/shared/types/async-state.types.ts` |
| `DashboardLayout` | `src/features/shared/layout/DashboardLayout.tsx` |
| `DataTable` component | `src/features/shared/ui/DataTable.tsx` |
| `DataTableColumn<T>` type | `src/features/shared/ui/types/dashboard.types.ts` |
| `Badge` | `src/features/shared/ui/badge.tsx` |
| `Button` | `src/features/shared/ui/button.tsx` |
| `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` | `src/features/shared/ui/select.tsx` |
| `Input` | `src/features/shared/ui/input.tsx` |
| `Label` | `src/features/shared/ui/label.tsx` |
| `Skeleton` | `src/features/shared/ui/skeleton.tsx` |
| `AlertDialog` (confirmación toggle active) | `src/features/shared/ui/alert-dialog.tsx` |
| `Card` | `src/features/shared/ui/card.tsx` |
| `useDebounce` hook | `src/features/admin/users/hooks/use-debounce.ts` |
| Category feature (reference pattern) | `src/features/categories/` |
| Products API (company filter) | `src/app/api/products/route.ts` (query param `idCompany`) |
| Sidebar menu items | `src/lib/navigation/menu-items.tsx` |
| `auth()` session check | `src/auth.ts` |
| Prisma client | `src/lib/prisma.ts` |

## Project Structure

### Documentation (this feature)

```text
specs/001-product-config-management/
├── spec.md              # Feature specification
├── plan.md              # This file (implementation plan)
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   └── product-configurations/
│   │       ├── route.ts                    # GET (list) + POST (create with auto-PPC)
│   │       └── [id]/
│   │           ├── route.ts                # GET + PUT (PPC ref) + PATCH (toggle active)
│   │           └── ppcs/
│   │               └── route.ts            # GET PPCs for a configuration
│   └── dashboard/
│       └── configuraciones-producto/
│           ├── page.tsx                     # List page (Server Component)
│           ├── crear/
│           │   └── page.tsx                # Create page (Server Component)
│           └── editar/
│               └── [id]/
│                   ├── page.tsx            # Edit page (Server Component)
│                   └── loading.tsx         # Next.js loading UI
│
├── features/
│   └── product-configuration/
│       ├── types/
│       │   └── product-configuration.types.ts
│       ├── lib/
│       │   ├── product-configuration-schemas.ts
│       │   └── product-configuration-api.ts
│       ├── mappers/
│       │   └── product-configuration.mapper.ts
│       ├── hooks/
│       │   ├── use-product-configurations.ts
│       │   ├── use-product-configuration.ts
│       │   └── use-product-configuration-mutations.ts
│       ├── components/
│       │   ├── product-configurations-table.tsx
│       │   ├── product-configuration-form.tsx
│       │   ├── product-configuration-form-skeleton.tsx
│       │   ├── product-configurations-page-client.tsx
│       │   ├── product-configuration-create-client.tsx
│       │   └── product-configuration-edit-client.tsx
│       └── __tests__/
│           ├── fixtures/
│           │   └── mock-product-configuration.ts
│           ├── lib/
│           │   ├── product-configuration-schemas.test.ts
│           │   └── product-configuration-api.test.ts
│           ├── mappers/
│           │   └── product-configuration.mapper.test.ts
│           ├── hooks/
│           │   ├── use-product-configurations.test.ts
│           │   ├── use-product-configuration.test.ts
│           │   └── use-product-configuration-mutations.test.ts
│           └── components/
│               ├── product-configurations-table.test.tsx
│               └── product-configuration-form.test.tsx
│
└── lib/
    └── navigation/
        └── menu-items.tsx                  # Modified: add sidebar link
```

## Action Items

### Step 1 — Prisma Migration

- Edit `prisma/schema.prisma`: add `active Boolean @default(true) @map("active")` to `ProductConfiguration` model (after `code` field, before `idProductPercentajeCommisionNewBusinesses`)
- Run `npx prisma migrate dev --name add-active-to-product-configuration`
- Run `npx prisma generate`
- Update mock fixtures that create full Prisma ProductConfiguration objects (e.g., `mock-prisma-business.ts`) to include `active` field

### Step 2 — Types (`src/features/product-configuration/types/product-configuration.types.ts`)

```
ProductConfiguration interface:
  readonly id: number
  readonly idProduct: number
  readonly idClientOrigin: number
  readonly idCategory: number
  code: string
  active: boolean
  idProductPercentajeCommisionNewBusinesses: number | null
  readonly createdAt: string
  readonly updatedAt: string
  product: { readonly idProduct: number; name: string; company: { readonly idCompany: number; name: string } }
  clientOrigin: { readonly idClientOrigin: number; name: string }
  category: { readonly idCategory: number; name: string }
  ppcNewBusinesses: { readonly id: number; active: boolean } | null

CreateProductConfigurationInput: { idProduct: number; idClientOrigin: number; idCategory: number }
UpdateProductConfigurationInput: { idProductPercentajeCommisionNewBusinesses: number }
ProductConfigurationFilters: { search?: string; active?: string }
ProductConfigurationListResponse: { configurations: ProductConfiguration[]; pagination: { page, pageSize, total, totalPages } }
```

### Step 3 — Zod Schemas (`src/features/product-configuration/lib/product-configuration-schemas.ts`)

- `createProductConfigurationSchema`: z.object({ idProduct: z.number().int().positive(), idClientOrigin: z.number().int().positive(), idCategory: z.number().int().positive() })
- `updateProductConfigurationSchema`: z.object({ idProductPercentajeCommisionNewBusinesses: z.number().int().positive() })
- Export inferred types `CreateProductConfigurationFormData`, `UpdateProductConfigurationFormData`

### Step 4 — Mapper (`src/features/product-configuration/mappers/product-configuration.mapper.ts`)

- `prismaProductConfigToProductConfig(prisma)`: Transform Prisma entity (with includes: product→company, clientOrigin, category, productPercentajeCommisionNewBusinesses) to domain `ProductConfiguration` type. Date→ISO string. Null code→empty string.
- `prismaProductConfigListToProductConfigs(list)`: Batch mapper via `.map()`

### Step 5 — API Client (`src/features/product-configuration/lib/product-configuration-api.ts`)

Object `productConfigurationApi` following exact pattern of `categoryApi`:
- `getProductConfigurations(params?)` → GET `/api/product-configurations` with search, active, page, pageSize query params
- `getProductConfiguration(id)` → GET `/api/product-configurations/{id}`
- `createProductConfiguration(data)` → POST `/api/product-configurations`
- `updateProductConfiguration(id, data)` → PUT `/api/product-configurations/{id}`
- `toggleActive(id, active)` → PATCH `/api/product-configurations/{id}`

All with `credentials: 'include'`, returning `ApiResponse<T>`

### Step 6 — Hooks (`src/features/product-configuration/hooks/`)

Following exact pattern of categories hooks (useState + useEffect, no React Query).
Import and use `AsyncState<T>` from `src/features/shared/types/async-state.types.ts`.

- `use-product-configurations.ts`: `useState<AsyncState<ProductConfigurationListResponse>>`, auto-refetch on dependency change, returns `{ state, refetch }`
- `use-product-configuration.ts`: `useState<AsyncState<ProductConfiguration>>`, single fetch by id, validates id > 0
- `use-product-configuration-mutations.ts`: Three independent `AsyncState` states (createState, updateState, toggleActiveState), returns states + mutation functions

### Step 7 — API Routes

#### `src/app/api/product-configurations/route.ts`

**GET**: Search across code, product.name, clientOrigin.name, category.name (case-insensitive OR). Filter by `active`. Pagination. Include product→company, clientOrigin, category, productPercentajeCommisionNewBusinesses. Use mapper for response.

**POST** (transactional creation):
1. Parse body with `createProductConfigurationSchema`
2. Validate product exists AND is active (status: true)
3. Validate clientOrigin exists AND is active (status: true)
4. Validate category exists AND is active (status: true)
5. Check uniqueness: `@@unique([idProduct, idClientOrigin, idCategory])` — return 409 if duplicate
6. Generate code: `buildProductConfigurationCode(product.name, clientOrigin.name, category.name)`
7. Validate code length ≤ 50 chars
8. Execute `prisma.$transaction()`:
   a. Create ProductConfiguration (active: true, code, no PPC ref yet)
   b. Create ProductPercentajeCommision (idProductConfiguration: config.id, active: true)
   c. Update ProductConfiguration set idProductPercentajeCommisionNewBusinesses = ppc.id
9. Re-fetch with includes, map, return 201

#### `src/app/api/product-configurations/[id]/route.ts`

**GET**: Fetch by id with includes, map, return. 404 if not found.

**PUT**: Parse with `updateProductConfigurationSchema`. Validate PPC belongs to this config (`idProductConfiguration === config.id`). Update only `idProductPercentajeCommisionNewBusinesses`. Return updated.

**PATCH**: Toggle `active` field. Body: `{ active: boolean }`. Return updated.

#### `src/app/api/product-configurations/[id]/ppcs/route.ts`

**GET**: Fetch all ProductPercentajeCommision records for a given configuration ID. Return array of `{ idProductPercentajeCommision, active }`.

### Step 8 — Components (`src/features/product-configuration/components/`)

All components are Client Components (`'use client'`) that reuse shared UI from `src/features/shared/ui/`.

#### `product-configurations-table.tsx`

Presentation component following `CategoriesTableSection` pattern.
- Columns: Código, Producto, Compañía, Origen, Categoría, Estado (Badge active/inactive), Acciones (edit, toggle active)
- Props: data, onAddConfiguration, onEditConfiguration, onToggleActive, onGlobalSearch, pagination, onPageChange, isSearching, selectedActive, onActiveChange
- Search placeholder: "Buscar por código, producto, origen o categoría..."
- Status filter: Select dropdown (Todos, Activo, Inactivo)

#### `product-configuration-form.tsx`

React Hook Form + zodResolver.
- **Create mode**: Company select (fetches active companies) → filters Product select, Product select (filtered by company, active only), ClientOrigin select (active only), Category select (active only). Submit: "Crear Configuración"
- **Edit mode**: Company, Product, Origin, Category shown as readonly/disabled. Code shown as readonly. PPC Reference select: dropdown of available PPCs. Submit: "Guardar Cambios"

#### `product-configuration-form-skeleton.tsx`

Skeleton matching form layout for loading states.

#### `product-configurations-page-client.tsx`

Client Component following `CategoriesPageClient` pattern: debounced search (500ms), active status filter, pagination (10 items/page), toggle active confirmation dialog (AlertDialog), toast notifications, navigate to crear/editar routes.

#### `product-configuration-create-client.tsx`

Client Component: renders form in create mode, on submit → POST → toast → navigate to list.

#### `product-configuration-edit-client.tsx`

Client Component: fetches config by id + available PPCs, renders form in edit mode, error state with back button, on submit → PUT → toast → navigate to list.

### Step 9 — Pages Next.js (`src/app/dashboard/configuraciones-producto/`)

Server Components with `auth()` session check and `DashboardLayout`, importing Client Components.

- `page.tsx`: List page → `ProductConfigurationsPageClient`
- `crear/page.tsx`: Create page → `ProductConfigurationCreateClient`
- `editar/[id]/page.tsx`: Edit page with ID parsing → `ProductConfigurationEditClient`
- `editar/[id]/loading.tsx`: Next.js loading UI with Skeleton

### Step 10 — Sidebar Link

Edit `src/lib/navigation/menu-items.tsx`:
- Import `Sliders` from lucide-react
- Add to Administración subItems (after "Origen Cliente"):
  ```
  { title: 'Config. Producto', url: '/dashboard/configuraciones-producto', icon: <Sliders className="h-4 w-4" /> }
  ```

### Step 11 — Tests (`src/features/product-configuration/__tests__/`)

#### `fixtures/mock-product-configuration.ts`

- `createMockProductConfiguration(overrides?)` — builder with defaults
- `createMockProductConfigurationListResponse(configs?, pagination?)` — list response
- `createMockPrismaProductConfiguration(overrides?)` — Prisma entity mock

#### Test files:

- `lib/product-configuration-schemas.test.ts` — validation happy/error paths, required fields, positive integers
- `lib/product-configuration-api.test.ts` — all API client methods, error handling, query params
- `mappers/product-configuration.mapper.test.ts` — Prisma→domain transformation, dates, nested objects, null handling
- `hooks/use-product-configurations.test.ts` — loading, success, error states, refetch, params passing
- `hooks/use-product-configuration.test.ts` — id validation, fetch states
- `hooks/use-product-configuration-mutations.test.ts` — create/update/toggleActive states, independent state management
- `components/product-configurations-table.test.tsx` — columns rendering, search placeholder, active/inactive badges
- `components/product-configuration-form.test.tsx` — create/edit modes, readonly fields, loading states

### Step 12 — Edge Cases Verification

- [ ] Code length ≤ 50 chars → error with descriptive message
- [ ] Duplicate combo product+origin+category → 409 error
- [ ] Inactive product/origin/category → rejected with descriptive error
- [ ] Transaction rollback if PPC creation fails
- [ ] Toggle active preserves existing business references
- [ ] Product select resets when company changes
- [ ] PPC select in edit mode only shows PPCs belonging to that config

## Verification

1. `npx prisma migrate dev` — migration applies cleanly
2. `npm run type-check` — no TypeScript errors
3. `npm run lint` — no linting errors
4. `npm run test:unit` — all new tests pass (98 tests across 8 files)
5. Manual: navigate to /dashboard/configuraciones-producto, create config, verify code generation, toggle active, edit PPC reference, search/filter/paginate
