# API Router Documentation

This document serves as a reference for agents working with the Next.js API Router in `src/app/api`.

## Overview

The API is built using Next.js App Router Route Handlers.

- **Location**: `src/app/api`
- **Authentication**: Most routes require authentication via NextAuth.js.
- **Response Format**: strictly follows `ApiResponse<T>` (see below).
- **Validation**: Zod is used for runtime validation of request bodies and query parameters.

## Standard Response Format

All API responses **MUST** follow the `ApiResponse<T>` generic type defined in `@/features/shared/types/api-response.types.ts`.

```typescript
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export interface ApiSuccessResponse<T> {
	data: T
}

export interface ApiErrorResponse {
	data: null
	error: string
	details?: unknown
}
```

### Usage Pattern

```typescript
import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

export async function GET(): Promise<NextResponse<ApiResponse<Data>>> {
	try {
		const data = await fetchData()
		return NextResponse.json({ data })
	} catch (error) {
		return NextResponse.json(
			{ data: null, error: 'ErrorMessage' },
			{ status: 500 }
		)
	}
}
```

## Authentication

Authentication is handled by `auth()` from `@/auth` (or `@/lib/auth/nextauth`).
Routes typically start with:

```typescript
const session = await auth()
if (!session?.user) {
	return NextResponse.json(
		{ data: null, error: 'Unauthorized' },
		{ status: 401 }
	)
}
```

## Route Reference

### 1. Business Logic (Negocios)

Core domain for managing business/commission records.

| Method | Endpoint                          | Description                                |
| :----- | :-------------------------------- | :----------------------------------------- |
| `GET`  | `/api/negocios`                   | List businesses with pagination & filters. |
| `POST` | `/api/negocios`                   | Create a new business record.              |
| `GET`  | `/api/negocios/[id]`              | Get business details.                      |
| `PUT`  | `/api/negocios/[id]`              | Update business details.                   |

For `PUT` with a **contract** on a business in **EMITIDO**, only **ADMIN** and **ASISTENTE_GERENCIA_OPERATIVA** are allowed; other roles receive 403.
| `POST` | `/api/negocios/[id]/cancel`       | Cancel a business.                         |
| `GET`  | `/api/negocios/stats`             | Get business statistics.                   |
| `POST` | `/api/negocios/validate-contract` | Check if a contract exists.                |

#### Example: List Negocios (`GET /api/negocios`)

- **Query Params**:
  - `page`: number (default: 1)
  - `pageSize`: number (default: 10)
  - `search`: string (matches identity, name, email, contract, id)
  - `status`: 'VENTA_EFECTUADA' | 'EMITIDO' | 'CANCELADO'
- **Response**: `ApiResponse<BusinessListResponse>`

### 2. Product Configuration

Manages the configuration linking Products, Companies, and Commissions.

| Method | Endpoint                                | Description                                      |
| :----- | :-------------------------------------- | :----------------------------------------------- |
| `GET`  | `/api/product-configurations`           | List configurations.                             |
| `POST` | `/api/product-configurations`           | Create a new configuration.                      |
| `GET`  | `/api/product-configurations/[id]`      | Get configuration details.                       |
| `GET`  | `/api/product-configurations/by-code/[code]` | Get configuration by unique `code` (URL-encoded segment). |
| `PUT`  | `/api/product-configurations/[id]`      | Update configuration.                            |
| `GET`  | `/api/product-configurations/[id]/ppcs` | Get Product Percentage Commissions for a config. |
| `GET`  | `/api/product-configurations/[id]/distribution-commission` | List commission rules (paginated). Rules include `hasPortfolio` and optional per-line `porcentajePortfolio` (0–100 in JSON). |
| `POST` | `/api/product-configurations/[id]/distribution-commission` | Create commission rule. Body: `description`, `hasPortfolio` (boolean, default false), `categories[]` with `percentage` and `portfolioPercentage` (0–100 each; API stores fractions). |
| `GET`  | `/api/product-configurations/[id]/distribution-commission/[ruleId]` | Get one rule. |
| `PUT`  | `/api/product-configurations/[id]/distribution-commission/[ruleId]` | Update rule and optional category lines. If `hasPortfolio` is false after save, prior `porcentaje_portfolio` per category is preserved when lines are recreated (RF-04). |
| `PATCH` | `/api/product-configurations/[id]/distribution-commission/[ruleId]` | Toggle `active` only. |

#### Example: Create Config (`POST /api/product-configurations`)

- **Body**: `{ idCompany, idProduct, idClientOrigin, idCategory }`
- **Response**: `ApiResponse<ProductConfiguration>`

### 3. Catalogs (Public/Shared)

Read-only or shared access to system catalogs.

| Method | Endpoint               | Description             |
| :----- | :--------------------- | :---------------------- |
| `GET`  | `/api/products`        | List active products.   |
| `GET`  | `/api/products/[id]`   | Get product details.    |
| `GET`  | `/api/categories`      | List active categories. |
| `GET`  | `/api/categories/[id]` | Get category details.   |
| `GET`  | `/api/clients/search`  | Search clients.         |
| `GET`  | `/api/companies`       | List active companies.  |
| `GET`  | `/api/companies/[id]`  | Get company details.    |
| `GET`  | `/api/origins`         | List client origins.    |

### 4. Admin Management (`/api/admin/*`)

Administrative endpoints for managing system entities (CRUD).

| Endpoint                     | Description                |
| :--------------------------- | :------------------------- |
| `/api/admin/users`           | Manage system users.       |
| `/api/admin/roles`           | Manage user roles.         |
| `/api/admin/companies`       | Manage companies info.     |
| `/api/admin/products`        | Manage products catalog.   |
| `/api/admin/categories`      | Manage categories catalog. |
| `/api/admin/client-origins`  | Manage client origins.     |
| `/api/admin/currencies`      | Manage currencies.         |
| `/api/admin/product-origins` | Manage product origins.    |

### 5. File Processing

Handling file uploads and batch processing.

| Endpoint                                 | Description             |
| :--------------------------------------- | :---------------------- |
| `/api/carga-archivos/file-import`        | File upload import.     |
| `/api/carga-archivos/process-batch`      | Process specific batch. |
| `/api/pre-liquidacion/archivos`          | Pre-liquidation files.  |
| `/api/pre-liquidacion/procesar`          | Trigger processing.     |
| `/api/pre-liquidacion/exportar/[fileId]` | Export results.         |
| `/api/pre-liquidacion/distribucion/[settlementCommissionId]` | GET distribution breakdown; each line includes `value_commission_with_discount` (post-tax, pre-clawback). |

### 6. System & Utility

| Endpoint                  | Description            |
| :------------------------ | :--------------------- |
| `/api/auth/[...nextauth]` | NextAuth.js endpoints. |
| `/api/health`             | System health check.   |
| `/api/email/send`         | Send generic email.    |

## Development Guidelines

1.  **Always use `ApiResponse<T>`**: No loose JSON objects.
2.  **Validate Inputs**: Use Zod for bodies and query params.
3.  **Check Permissions**: Verify role/permissions after session check.
4.  **Error Handling**: Catch exceptions and return `status: 500` with `ApiErrorResponse`.
