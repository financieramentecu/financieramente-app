# Research: Product Configuration Management

**Feature**: 001-product-config-management  
**Date**: 2026-02-06  
**Status**: Completed

## Research Questions & Findings

### 1. Transactional Creation Pattern (ProductConfiguration + ProductPercentajeCommision)

**Question**: What is the best practice for transactional creation of ProductConfiguration + ProductPercentajeCommision in Prisma when PPC doesn't exist?

**Decision**: Use Prisma Interactive Transaction (`prisma.$transaction`)

**Rationale**:
- Provides full control over multi-step operations with rollback on failure
- Allows conditional logic (check if PPC exists, create if needed, then link)
- Better error handling compared to nested creates
- Explicit transaction boundaries make code easier to test and reason about

**Implementation Pattern**:
```typescript
await prisma.$transaction(async (tx) => {
  // Step 1: Create ProductConfiguration without PPC
  const config = await tx.productConfiguration.create({
    data: { product, origin, category, code, active: true }
  })
  
  // Step 2: Create ProductPercentajeCommision
  const ppc = await tx.productPercentajeCommision.create({
    data: { 
      productConfigurationId: config.id,
      // other fields
    }
  })
  
  // Step 3: Update ProductConfiguration with PPC reference
  return tx.productConfiguration.update({
    where: { id: config.id },
    data: { idProductPercentajeCommisionNewBusinesses: ppc.id }
  })
})
```

**Alternatives Considered**:
- Nested create: Rejected due to circular dependency (ProductConfiguration needs PPC, PPC needs ProductConfiguration)
- Two-phase commit: Rejected due to risk of partial failure without atomicity
- Conditional nested create: Rejected due to Prisma limitations with conditional logic in nested operations

**References**:
- Prisma Docs: Interactive Transactions
- Project pattern: Similar pattern used in existing features

---

### 2. Code Generation Logic (Format Validation)

**Question**: How to handle edge cases in code generation (`PRODUCT_NAME-ORIGIN_NAME-CATEGORY_NAME`)?

**Decision**: Sanitize each segment, validate length, uppercase, replace spaces with `_`, join with `-`

**Rationale**:
- Consistent, predictable format
- URL-safe characters (no special chars except `_` and `-`)
- Readable and grep-friendly
- Prevents collisions from similar names

**Implementation Rules**:
1. **Input**: `product.name`, `originClient.name`, `category.name`
2. **Per segment**:
   - Trim whitespace
   - Replace internal spaces with `_`
   - Remove special characters (keep only alphanumeric, `_`)
   - Convert to uppercase
3. **Join segments** with `-`
4. **Validation**: Max length 50 characters (database constraint)
5. **Error handling**: If truncation needed, fail with clear error (don't auto-truncate)

**Example**:
- Input: `Crea Patrimonio`, `Propio`, `Junior`
- Output: `CREA_PATRIMONIO-PROPIO-JUNIOR`

**Edge Cases**:
- Special characters (é, ñ): Replace with ASCII equivalent or remove
- Very long names: Reject with error (max 50 chars total)
- Empty segments: Validate at Zod schema level (required fields)

**Implementation**:
```typescript
// src/features/product-config/lib/product-config-utils.ts
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

**Alternatives Considered**:
- Auto-truncation: Rejected due to risk of collisions
- Hashing: Rejected due to loss of human readability
- Slug generation: Rejected due to unnecessary complexity

---

### 3. Uniqueness Validation (Composite Key Strategy)

**Question**: How to enforce uniqueness of product + origin + category combination in Prisma?

**Decision**: Prisma compound unique constraint + application-level validation

**Rationale**:
- Database-level constraint prevents duplicates at source of truth
- Application-level validation provides user-friendly error messages
- Handles race conditions (concurrent creates)

**Prisma Schema**:
```prisma
model ProductConfiguration {
  id                                           String   @id @default(cuid())
  code                                         String   @unique @db.VarChar(50)
  productId                                    String
  originClientId                               String
  categoryId                                   String
  idProductPercentajeCommisionNewBusinesses   String?
  active                                       Boolean  @default(true)
  createdAt                                    DateTime @default(now())
  updatedAt                                    DateTime @updatedAt
  
  product                                      Product          @relation(fields: [productId], references: [id])
  originClient                                 OriginClient     @relation(fields: [originClientId], references: [id])
  category                                     Category         @relation(fields: [categoryId], references: [id])
  productPercentajeCommisionNewBusinesses     ProductPercentajeCommision? @relation("NewBusinessesReference", fields: [idProductPercentajeCommisionNewBusinesses], references: [id])
  
  // Compound unique constraint
  @@unique([productId, originClientId, categoryId], name: "unique_product_origin_category")
}
```

**Application-level Validation**:
```typescript
// In service: Check existence before create
const existing = await prisma.productConfiguration.findUnique({
  where: {
    unique_product_origin_category: {
      productId,
      originClientId,
      categoryId
    }
  }
})

if (existing) {
  throw new DuplicateConfigurationError(...)
}
```

**Error Handling**:
- Prisma `P2002` error → catch and transform to user-friendly message
- Pre-check in service → early validation before transaction

**Alternatives Considered**:
- Application-only validation: Rejected due to race conditions
- Code-based uniqueness: Rejected because code is derived, not primary key
- No validation: Rejected due to data integrity requirements

---

### 4. Pagination Strategy (Cursor vs. Offset)

**Question**: Should we use cursor-based or offset-based pagination for 1000+ configurations?

**Decision**: Offset-based pagination (simpler, sufficient for scale)

**Rationale**:
- Predictable page numbers (UX: users can jump to page 5)
- Simple implementation with Prisma `skip` + `take`
- Scale is moderate (1000 configs = 100 pages at 10/page)
- Data doesn't change frequently (configurations are relatively stable)
- No real-time updates needed

**Implementation**:
```typescript
// Server Action: list-product-configs.ts
const page = 1 // from query params
const pageSize = 10
const skip = (page - 1) * pageSize

const [configs, total] = await Promise.all([
  prisma.productConfiguration.findMany({
    skip,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
    include: { product: true, originClient: true, category: true }
  }),
  prisma.productConfiguration.count()
])

return {
  data: configs,
  pagination: {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize)
  }
}
```

**Trade-offs**:
- Offset can skip records if data changes between pages (acceptable risk)
- Performance degrades with very large offsets (not an issue at 1000 records)

**Alternatives Considered**:
- Cursor-based: Rejected due to UX complexity (no page numbers), overkill for scale
- Infinite scroll: Rejected due to UX requirements (table with pagination controls)

---

### 5. Authorization Pattern (Admin-Only Access)

**Question**: Should authorization be at middleware level or Server Action level?

**Decision**: Server Action level authorization (more granular, easier to test)

**Rationale**:
- Granular control (different actions can have different permissions)
- Easier to test (mock session, test action authorization)
- Clearer error messages (action-specific errors)
- No middleware complexity for simple role check

**Implementation Pattern**:
```typescript
// Server Action: create-product-config.ts
'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function createProductConfig(input: CreateProductConfigInput) {
  // 1. Authenticate
  const session = await getServerSession(authOptions)
  if (!session) {
    return { success: false, error: 'Unauthorized' }
  }
  
  // 2. Authorize (admin only)
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Forbidden: Admin access required' }
  }
  
  // 3. Validate input
  const validated = createProductConfigSchema.safeParse(input)
  if (!validated.success) {
    return { success: false, error: validated.error }
  }
  
  // 4. Execute business logic
  // ...
}
```

**Middleware Option** (rejected for this feature):
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/configurations')) {
    // Check session, redirect if not admin
  }
}
```
- Rejected because: less granular, harder to test, couples routing to authorization

**Alternatives Considered**:
- Middleware-level: Rejected due to lack of granularity and testing complexity
- HOC pattern: Rejected due to Server Actions not supporting HOCs
- Custom hook: Rejected due to Server Components (hooks only work in Client Components)

---

### 6. Form Library Integration (React Hook Form + Zod)

**Question**: How to integrate React Hook Form + Zod with Next.js 15 Server Actions?

**Decision**: React Hook Form + Zod resolver + Server Action submission

**Rationale**:
- Zod schemas define single source of truth for validation
- React Hook Form provides client-side validation + UX
- Server Actions handle server-side validation + mutation
- Type-safe end-to-end (Zod infers TypeScript types)

**Implementation Pattern**:
```typescript
// Component: product-config-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProductConfigSchema } from '../lib/product-config-schemas'
import { createProductConfig } from '../actions/create-product-config'

export function ProductConfigForm() {
  const form = useForm({
    resolver: zodResolver(createProductConfigSchema),
    defaultValues: {
      productId: '',
      originClientId: '',
      categoryId: ''
    }
  })
  
  const onSubmit = async (data) => {
    const result = await createProductConfig(data)
    if (result.success) {
      // Success handling
    } else {
      // Error handling
    }
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

**Server Action** (server-side validation):
```typescript
// Action: create-product-config.ts
'use server'

export async function createProductConfig(input: unknown) {
  // Server-side validation (defense in depth)
  const validated = createProductConfigSchema.safeParse(input)
  if (!validated.success) {
    return { success: false, error: validated.error }
  }
  
  // Business logic
  // ...
}
```

**Benefits**:
- Client-side validation: Immediate feedback, better UX
- Server-side validation: Security, defense in depth
- Single schema: No duplication, type safety
- Progressive enhancement: Form works without JS (falls back to server validation)

**Alternatives Considered**:
- Formik: Rejected due to better TypeScript support in React Hook Form
- Uncontrolled forms: Rejected due to complex validation requirements
- Native form validation: Rejected due to lack of Zod integration

---

---

### 7. Company Filtering Strategy (Product Selection)

**Question**: How should products be filtered by company when creating a ProductConfiguration?

**Decision**: Two-step selection UI - Company first, then Product filtered by selected Company

**Rationale**:
- Product model has `idCompany` foreign key (products belong to companies)
- Prisma schema has unique constraint: `@@unique([idCompany, name])` (product names are unique per company)
- Clear UX: Select company → see only products from that company
- Prevents confusion from duplicate product names across different companies
- Maintains referential integrity (Product must belong to selected Company)

**Implementation Pattern**:
```typescript
// Form flow:
// 1. User selects Company from dropdown
// 2. Product dropdown populates with: WHERE idCompany = selectedCompany
// 3. Continue with Origin and Category selection

// Server Action validation:
export async function createProductConfig(input) {
  // 1. Validate input
  // 2. Verify Product belongs to specified Company
  const product = await prisma.product.findFirst({
    where: { idProduct: input.idProduct, idCompany: input.idCompany }
  })
  
  if (!product) {
    throw new Error('Product does not belong to selected company')
  }
  
  // 3. Continue with creation...
}
```

**UI Component Structure**:
```tsx
<ProductConfigForm>
  <Select name="idCompany" label="Compañía" onChange={handleCompanyChange} />
  <Select name="idProduct" label="Producto" 
    disabled={!selectedCompany}
    options={filteredProducts} // WHERE idCompany = selectedCompany
  />
  <Select name="idClientOrigin" label="Origen" />
  <Select name="idCategory" label="Categoría" />
</ProductConfigForm>
```

**Data Model Impact**:
- ProductConfiguration does NOT store `idCompany` directly (denormalized)
- Company is accessed via: `ProductConfiguration → Product → Company`
- No schema change needed (relationship already exists)

**Query Pattern**:
```typescript
// Fetch products for dropdown (filtered by company)
const products = await prisma.product.findMany({
  where: {
    idCompany: selectedCompanyId,
    status: true // only active products
  },
  select: { idProduct: true, name: true }
})
```

**Alternatives Considered**:
- Store `idCompany` in ProductConfiguration: Rejected due to denormalization (Company already accessible via Product)
- Auto-detect company from user session: Rejected because users might manage configurations for multiple companies
- Show all products, no filtering: Rejected due to confusion from duplicate names across companies

**Benefits**:
- Clear data hierarchy: Company → Product → ProductConfiguration
- Prevents invalid data (product from wrong company)
- Better UX (filtered dropdown, no confusion)
- Maintains normalized schema (no redundant `idCompany` in ProductConfiguration)

---

## Summary

All research questions resolved. Key decisions:

1. **Transactional Creation**: Prisma Interactive Transaction (`$transaction`)
2. **Code Generation**: Sanitize segments, uppercase, max 50 chars, reject if too long
3. **Uniqueness**: Compound unique constraint + application validation
4. **Pagination**: Offset-based (simple, sufficient for scale)
5. **Authorization**: Server Action level (granular, testable)
6. **Forms**: React Hook Form + Zod + Server Actions (type-safe, UX + security)
7. **Company Filtering**: Two-step selection (Company first, then Product filtered by Company)

**Ready for Phase 1**: Data model design, API contracts, and quickstart guide.
