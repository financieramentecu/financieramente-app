# Quickstart: Product Configuration Management

**Feature**: 001-product-config-management  
**Date**: 2026-02-06  
**Status**: Ready for Implementation

## Overview

This guide provides a step-by-step walkthrough for implementing the Product Configuration Management feature. Follow the implementation order to ensure proper dependency management and testability.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 15 running
- Prisma CLI installed (`npm install -g prisma`)
- Access to the Financieramente codebase
- Admin user account for testing

## Architecture Overview

```
src/features/product-config/
├── types/                    # Domain types (readonly interfaces)
├── lib/                      # Schemas (Zod) + utilities
├── services/                 # Data access (Prisma operations)
├── actions/                  # Server Actions (Next.js 15)
├── components/               # UI components (React 19)
├── hooks/                    # React hooks (form management)
└── __tests__/                # Colocalized tests

src/app/(dashboard)/configurations/
├── page.tsx                  # List page (Server Component)
├── new/page.tsx             # Create page
└── [id]/edit/page.tsx       # Edit page

e2e/product-config/           # E2E tests (Playwright)
```

---

## Implementation Steps

### Step 1: Database Migration

**Duration**: ~5 minutes

**Note**: ProductConfiguration and ProductPercentajeCommision tables **already exist** in the schema. We only need to update constraints and indexes.

1. **Create migration file**:

```bash
npx prisma migrate dev --name update_product_configuration_constraints
```

2. **Migration content** (`prisma/migrations/.../migration.sql`):

```sql
-- Update existing NULL codes (if any) before making field required
UPDATE "product_configuration" pc
SET "code" = CONCAT(
  UPPER(REPLACE(p.name, ' ', '_')), '-',
  UPPER(REPLACE(co.name, ' ', '_')), '-',
  UPPER(REPLACE(c.name, ' ', '_'))
)
FROM "product" p
JOIN "client_origin" co ON co."id_client_origin" = pc."id_client_origin"
JOIN "category" c ON c."id_category" = pc."id_category"
WHERE pc."id_product" = p."id_product" AND pc."code" IS NULL;

-- Make code field required
ALTER TABLE "product_configuration" 
  ALTER COLUMN "code" SET NOT NULL;

-- Add unique constraint on code
CREATE UNIQUE INDEX IF NOT EXISTS "product_configuration_code_key" 
  ON "product_configuration"("code");

-- Add performance indexes
CREATE INDEX IF NOT EXISTS "product_configuration_active_idx" 
  ON "product_configuration"("active");
```

3. **Run migration**:

```bash
npx prisma migrate dev
```

4. **Verify constraints created**:

```bash
npx prisma studio
# Check product_configuration table
# Verify: code is NOT NULL, unique constraint on code, indexes on active
```

**Expected Output**: Migration successful, constraints and indexes created.

---

### Step 2: Domain Types & Schemas

**Duration**: ~15 minutes

1. **Create types** (`src/features/product-config/types/product-config.types.ts`):

```typescript
export interface ProductConfiguration {
  readonly id: number
  readonly code: string | null
  readonly idProduct: number
  readonly idClientOrigin: number
  readonly idCategory: number
  readonly idProductPercentajeCommisionNewBusinesses: number | null
  readonly active: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface ProductConfigurationWithRelations extends ProductConfiguration {
  readonly product: {
    readonly idProduct: number
    readonly name: string
    readonly idCompany: number
    readonly company: {
      readonly idCompany: number
      readonly name: string
    }
  }
  readonly clientOrigin: {
    readonly idClientOrigin: number
    readonly name: string
  }
  readonly category: {
    readonly idCategory: number
    readonly code: string
    readonly name: string
  }
  readonly productPercentajeCommisionNewBusinesses: {
    readonly idProductPercentajeCommision: number
  } | null
}
```

2. **Create Zod schemas** (`src/features/product-config/lib/product-config-schemas.ts`):

```typescript
import { z } from 'zod'

export const createProductConfigSchema = z.object({
  idCompany: z.number().int().positive('Company is required'),
  idProduct: z.number().int().positive('Product is required'),
  idClientOrigin: z.number().int().positive('Origin is required'),
  idCategory: z.number().int().positive('Category is required')
})

export type CreateProductConfigInput = z.infer<typeof createProductConfigSchema>

export const updateProductConfigSchema = z.object({
  id: z.number().int().positive('Configuration ID is required'),
  idProductPercentajeCommisionNewBusinesses: z.number().int().positive('PPC reference is required')
})

export type UpdateProductConfigInput = z.infer<typeof updateProductConfigSchema>

export const toggleProductConfigSchema = z.object({
  id: z.number().int().positive('Configuration ID is required'),
  active: z.boolean()
})

export type ToggleProductConfigInput = z.infer<typeof toggleProductConfigSchema>

export const listProductConfigsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  activeFilter: z.enum(['all', 'active', 'inactive']).default('all'),
  idCompany: z.number().int().positive().optional() // Optional filter by company
})

export type ListProductConfigsInput = z.infer<typeof listProductConfigsSchema>
```

3. **Test schemas**:

```bash
npm run test:unit -- product-config-schemas.test.ts
```

**Expected Output**: All schema validations pass.

---

### Step 3: Utility Functions

**Duration**: ~10 minutes

1. **Create code generator** (`src/features/product-config/lib/product-config-utils.ts`):

```typescript
export function generateProductConfigCode(
  productName: string,
  originName: string,
  categoryName: string
): string {
  const sanitize = (str: string): string => {
    return str
      .trim()
      .replace(/\s+/g, '_')        // spaces → _
      .replace(/[^a-zA-Z0-9_]/g, '') // remove special chars
      .toUpperCase()
  }
  
  const segments = [
    sanitize(productName),
    sanitize(originName),
    sanitize(categoryName)
  ]
  
  const code = segments.join('-')
  
  if (code.length > 50) {
    throw new Error(`Generated code exceeds 50 characters: ${code}`)
  }
  
  return code
}
```

2. **Test code generator**:

```bash
npm run test:unit -- product-config-utils.test.ts
```

**Expected Output**: Code generation works with various inputs (spaces, special chars, edge cases).

---

### Step 4: Service Layer (Data Access)

**Duration**: ~30 minutes

1. **Create service contract** (`src/features/product-config/services/product-config.contracts.ts`):

```typescript
import type { PrismaClient } from '@prisma/client'
import type { ProductConfigurationWithRelations, CreateProductConfigInput, UpdateProductConfigInput, ListProductConfigsInput } from '../types'

export interface IProductConfigService {
  create(input: CreateProductConfigInput): Promise<ProductConfigurationWithRelations>
  findById(id: string): Promise<ProductConfigurationWithRelations | null>
  findByUnique(productId: string, originClientId: string, categoryId: string): Promise<ProductConfigurationWithRelations | null>
  list(filters: ListProductConfigsInput): Promise<{ data: ProductConfigurationWithRelations[]; total: number }>
  update(input: UpdateProductConfigInput): Promise<ProductConfigurationWithRelations>
  toggle(id: string, active: boolean): Promise<ProductConfigurationWithRelations>
}
```

2. **Implement service** (`src/features/product-config/services/product-config.service.ts`):

```typescript
import type { PrismaClient } from '@prisma/client'
import { generateProductConfigCode } from '../lib/product-config-utils'
import type { IProductConfigService } from './product-config.contracts'

export function createProductConfigService(prisma: PrismaClient): IProductConfigService {
  return {
    async create(input) {
      // 1. Fetch related entities and verify product belongs to company
      const [product, origin, category] = await Promise.all([
        prisma.product.findFirst({ 
          where: { 
            idProduct: input.idProduct,
            idCompany: input.idCompany // Verify product belongs to selected company
          },
          include: { company: true }
        }),
        prisma.clientOrigin.findUnique({ where: { idClientOrigin: input.idClientOrigin } }),
        prisma.category.findUnique({ where: { idCategory: input.idCategory } })
      ])
      
      if (!product) {
        throw new Error('Product not found or does not belong to selected company')
      }
      
      if (!origin || !category) {
        throw new Error('Origin or Category not found')
      }
      
      if (!product.status || !origin.status || !category.status) {
        throw new Error('Product, Origin, or Category is not active')
      }
      
      // 2. Check uniqueness
      const existing = await this.findByUnique(input.idProduct, input.idClientOrigin, input.idCategory)
      if (existing) {
        throw new Error('Configuration already exists for this combination')
      }
      
      // 3. Generate code
      const code = generateProductConfigCode(product.name, origin.name, category.name)
      
      // 4. Transactional create
      return prisma.$transaction(async (tx) => {
        // Create ProductConfiguration
        const config = await tx.productConfiguration.create({
          data: {
            code,
            idProduct: input.idProduct,
            idClientOrigin: input.idClientOrigin,
            idCategory: input.idCategory,
            active: true
          }
        })
        
        // Create ProductPercentajeCommision
        const ppc = await tx.productPercentajeCommision.create({
          data: {
            idProductConfiguration: config.id,
            active: true
          }
        })
        
        // Update ProductConfiguration with PPC reference
        return tx.productConfiguration.update({
          where: { id: config.id },
          data: { idProductPercentajeCommisionNewBusinesses: ppc.idProductPercentajeCommision },
          include: {
            product: { 
              select: { 
                idProduct: true, 
                name: true,
                idCompany: true,
                company: { select: { idCompany: true, name: true } }
              } 
            },
            clientOrigin: { select: { idClientOrigin: true, name: true } },
            category: { select: { idCategory: true, code: true, name: true } },
            productPercentajeCommisionNewBusinesses: { select: { idProductPercentajeCommision: true } }
          }
        })
      })
    },
    
    async findById(id) {
      return prisma.productConfiguration.findUnique({
        where: { id },
        include: {
          product: { select: { id: true, name: true } },
          originClient: { select: { id: true, name: true } },
          category: { select: { id: true, code: true, name: true } },
          productPercentajeCommisionNewBusinesses: { select: { id: true } }
        }
      })
    },
    
    async findByUnique(productId, originClientId, categoryId) {
      return prisma.productConfiguration.findUnique({
        where: {
          unique_product_origin_category: {
            productId,
            originClientId,
            categoryId
          }
        },
        include: {
          product: { select: { id: true, name: true } },
          originClient: { select: { id: true, name: true } },
          category: { select: { id: true, code: true, name: true } },
          productPercentajeCommisionNewBusinesses: { select: { id: true } }
        }
      })
    },
    
    async list(filters) {
      const whereClause = {
        AND: [
          filters.search ? {
            OR: [
              { code: { contains: filters.search, mode: 'insensitive' as const } },
              { product: { name: { contains: filters.search, mode: 'insensitive' as const } } },
              { originClient: { name: { contains: filters.search, mode: 'insensitive' as const } } },
              { category: { name: { contains: filters.search, mode: 'insensitive' as const } } }
            ]
          } : {},
          filters.activeFilter !== 'all' ? { active: filters.activeFilter === 'active' } : {}
        ]
      }
      
      const [data, total] = await Promise.all([
        prisma.productConfiguration.findMany({
          where: whereClause,
          skip: (filters.page - 1) * filters.pageSize,
          take: filters.pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            product: { select: { id: true, name: true } },
            originClient: { select: { id: true, name: true } },
            category: { select: { id: true, code: true, name: true } },
            productPercentajeCommisionNewBusinesses: { select: { id: true } }
          }
        }),
        prisma.productConfiguration.count({ where: whereClause })
      ])
      
      return { data, total }
    },
    
    async update(input) {
      // Verify config exists
      const config = await this.findById(input.id)
      if (!config) {
        throw new Error('Configuration not found')
      }
      
      // Verify PPC exists and belongs to this config
      const ppc = await prisma.productPercentajeCommision.findFirst({
        where: {
          id: input.idProductPercentajeCommisionNewBusinesses,
          productConfigurationId: input.id
        }
      })
      
      if (!ppc) {
        throw new Error('ProductPercentajeCommision not found or does not belong to this configuration')
      }
      
      // Update
      return prisma.productConfiguration.update({
        where: { id: input.id },
        data: { idProductPercentajeCommisionNewBusinesses: input.idProductPercentajeCommisionNewBusinesses },
        include: {
          product: { select: { id: true, name: true } },
          originClient: { select: { id: true, name: true } },
          category: { select: { id: true, code: true, name: true } },
          productPercentajeCommisionNewBusinesses: { select: { id: true } }
        }
      })
    },
    
    async toggle(id, active) {
      const config = await this.findById(id)
      if (!config) {
        throw new Error('Configuration not found')
      }
      
      return prisma.productConfiguration.update({
        where: { id },
        data: { active },
        include: {
          product: { select: { id: true, name: true } },
          originClient: { select: { id: true, name: true } },
          category: { select: { id: true, code: true, name: true } },
          productPercentajeCommisionNewBusinesses: { select: { id: true } }
        }
      })
    }
  }
}
```

3. **Test service**:

```bash
npm run test:integration -- product-config.service.test.ts
```

**Expected Output**: All service operations pass (create, list, update, toggle).

---

### Step 5: Server Actions

**Duration**: ~30 minutes

1. **Create Server Actions** (`src/features/product-config/actions/`):

Follow the pattern from [contracts/product-config-actions.ts](./contracts/product-config-actions.ts).

Each action should:
1. Authenticate (check session)
2. Authorize (verify admin role)
3. Validate input (Zod schema)
4. Call service method
5. Return `ApiResponse<T>`

Example: `create-product-config.ts`

```typescript
'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createProductConfigService } from '../services/product-config.service'
import { createProductConfigSchema } from '../lib/product-config-schemas'
import type { ApiResponse } from '@/types/api'
import type { ProductConfigurationWithRelations } from '../types'

export async function createProductConfig(
  input: unknown
): Promise<ApiResponse<ProductConfigurationWithRelations>> {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions)
    if (!session) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // 2. Authorize
    if (session.user.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required' }
    }
    
    // 3. Validate
    const validated = createProductConfigSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: 'Validation failed', details: validated.error }
    }
    
    // 4. Execute
    const service = createProductConfigService(prisma)
    const config = await service.create(validated.data)
    
    return { success: true, data: config }
  } catch (error) {
    console.error('createProductConfig error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create configuration'
    }
  }
}
```

2. **Test Server Actions**:

```bash
npm run test:integration -- create-product-config.test.ts
```

**Expected Output**: Actions return correct ApiResponse format, handle errors properly.

---

### Step 6: UI Components

**Duration**: ~60 minutes

1. **Create list page** (Server Component):

`src/app/(dashboard)/configurations/page.tsx`

```tsx
import { listProductConfigs } from '@/features/product-config/actions'
import { ProductConfigList } from '@/features/product-config/components/product-config-list'

export default async function ConfigurationsPage({ searchParams }) {
  const result = await listProductConfigs({
    page: Number(searchParams.page) || 1,
    search: searchParams.search,
    activeFilter: searchParams.status
  })
  
  if (!result.success) {
    return <ErrorState message={result.error} />
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1>Product Configurations</h1>
      <ProductConfigList 
        data={result.data.data} 
        pagination={result.data.pagination} 
      />
    </div>
  )
}
```

2. **Create form component** (Client Component):

`src/features/product-config/components/product-config-form.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProductConfigSchema } from '../lib/product-config-schemas'
import { createProductConfig } from '../actions/create-product-config'
import { getProductsByCompany } from '../actions/get-products-by-company'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

export function ProductConfigForm({ companies, origins, categories }) {
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  
  const form = useForm({
    resolver: zodResolver(createProductConfigSchema)
  })
  
  // Load products when company changes
  useEffect(() => {
    if (selectedCompany) {
      setLoadingProducts(true)
      getProductsByCompany(selectedCompany)
        .then((result) => {
          if (result.success) {
            setProducts(result.data)
          }
        })
        .finally(() => setLoadingProducts(false))
    } else {
      setProducts([])
    }
  }, [selectedCompany])
  
  const onSubmit = async (data) => {
    const result = await createProductConfig({
      ...data,
      idCompany: selectedCompany! // Include for validation
    })
    
    if (result.success) {
      toast.success(`Configuration created: ${result.data.code}`)
      toast.info(`Company: ${result.data.product.company.name}`)
      router.push('/configurations')
    } else {
      toast.error(result.error)
    }
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Select 
        name="idCompany" 
        label="Compañía" 
        options={companies}
        onChange={(value) => setSelectedCompany(value)}
      />
      <Select 
        name="idProduct" 
        label="Producto" 
        options={products}
        disabled={!selectedCompany}
        loading={loadingProducts}
      />
      <Select name="idClientOrigin" label="Origen" options={origins} />
      <Select name="idCategory" label="Categoría" options={categories} />
      <Button type="submit" disabled={!selectedCompany}>
        Create Configuration
      </Button>
    </form>
  )
}
```

3. **Create status badge** (`product-config-status-badge.tsx`)
4. **Create filters** (`product-config-filters.tsx`)

---

### Step 7: E2E Tests

**Duration**: ~30 minutes

Create E2E tests in `e2e/product-config/`:

```typescript
// e2e/product-config/create-product-config.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Create Product Configuration', () => {
  test('admin can create new configuration', async ({ page }) => {
    await page.goto('/configurations/new')
    
    await page.selectOption('[name="productId"]', 'prod-123')
    await page.selectOption('[name="originClientId"]', 'origin-456')
    await page.selectOption('[name="categoryId"]', 'cat-789')
    
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/configurations')
    await expect(page.locator('text=CREA_PATRIMONIO-PROPIO-JUNIOR')).toBeVisible()
  })
})
```

Run E2E tests:

```bash
npm run test:e2e
```

---

## Testing Checklist

- [ ] Unit tests: Schemas validation
- [ ] Unit tests: Code generator utility
- [ ] Integration tests: Service layer (create, list, update, toggle)
- [ ] Integration tests: Server Actions (auth, validation, error handling)
- [ ] E2E tests: Create configuration flow
- [ ] E2E tests: Search and filter configurations
- [ ] E2E tests: Update configuration
- [ ] E2E tests: Toggle active status

---

## Manual Testing

1. **Create Configuration**:
   - Navigate to `/configurations/new`
   - **Step 1**: Select Company: "Skandia" → Product dropdown enables
   - **Step 2**: Select Product: "Crea Patrimonio" (filtered by Skandia)
   - **Step 3**: Select Origin: "Propio"
   - **Step 4**: Select Category: "Junior"
   - Submit → Verify code generated: `CREA_PATRIMONIO-PROPIO-JUNIOR`
   - Verify company shown in success message: "Skandia"

2. **List & Search**:
   - Navigate to `/configurations`
   - Search "patrimonio" → Verify filtered results
   - Search "skandia" → Verify configurations for Skandia company shown
   - Filter by "Active" → Verify only active configs shown
   - Filter by Company → Verify only configurations for selected company shown

3. **Update Configuration**:
   - Navigate to `/configurations/[id]/edit`
   - Change PPC reference
   - Submit → Verify change persists

4. **Toggle Status**:
   - In list, click toggle inactive
   - Confirm action
   - Verify status badge changes to "Inactive"

5. **Verify Company Validation**:
   - Attempt to create configuration with mismatched company-product
   - Verify error: "Product does not belong to selected company"

---

## Deployment Checklist

- [ ] Run migrations in production: `npx prisma migrate deploy`
- [ ] Verify database constraints created
- [ ] Verify indexes created for performance
- [ ] Run smoke tests in production
- [ ] Monitor error logs for first 24 hours
- [ ] Verify authorization (admin-only access)

---

## Troubleshooting

### Issue: Migration fails with foreign key constraint error

**Solution**: Verify that Product, OriginClient, and Category tables exist and have correct schema.

### Issue: Code generation exceeds 50 characters

**Solution**: Check product/origin/category names. Consider shortening names or implementing truncation strategy.

### Issue: Duplicate configuration error even with unique combination

**Solution**: Check for existing inactive configurations. The unique constraint applies regardless of `active` status.

### Issue: Transaction fails when creating PPC

**Solution**: Verify ProductPercentajeCommision schema is correct and has `productConfigurationId` field.

---

## Performance Tips

1. **Indexes**: Ensure indexes are created on `active` and `code` fields
2. **Pagination**: Monitor query performance with 1000+ records
3. **Caching**: Consider caching active configurations list (TTL: 5 minutes)
4. **N+1 Queries**: Use Prisma `include` to avoid N+1 queries in list view

---

## Next Steps

After completing this feature:

1. Integrate ProductConfiguration with Negocio creation flow
2. Implement ProductPercentajeCommisionCategory management (separate feature)
3. Add audit logs for configuration changes
4. Implement export functionality (CSV/Excel)

---

## Support

- **Spec**: [spec.md](./spec.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contracts**: [contracts/product-config-actions.ts](./contracts/product-config-actions.ts)
- **Constitution**: [.specify/memory/constitution.md](../../.specify/memory/constitution.md)

For questions, contact the feature lead or refer to the spec clarifications.
