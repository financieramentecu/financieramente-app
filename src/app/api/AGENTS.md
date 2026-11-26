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
| `GET`  | `/api/policyholders/search` | Search policyholders by document. Requires the same roles allowed to handle policyholder data (`ADMIN`, `ASISTENTE_GERENCIA_OPERATIVA`). Does not query clients. |
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
| `/api/admin/document-types`  | Manage identity document types (system administrator only). |
| `/api/document-types`        | List active document types for the business form. Client identities store `id_document_type` (FK); inactive types stay on existing clients and are omitted from new selections. |
| `/api/admin/product-origins` | Manage product origins.    |
| `/api/admin/partners`        | ADMIN only. `GET` list, `POST` create a partner (sends the activation mail; 201 with `emailSent`). |
| `/api/admin/partners/[id]`   | ADMIN only. `PUT` edit personal data and leader (email, role, level, category are not editable). |
| `/api/admin/partners/[id]/deactivate` | ADMIN only. `POST` deactivate (soft delete); the session ends on the partner's next request. |
| `/api/admin/partners/[id]/reactivate` | ADMIN only. `POST` reactivate a deactivated partner. |
| `/api/admin/partners/[id]/resend-activation` | ADMIN only. `POST` issue a new activation link for a pending partner. |
| `/api/admin/partners/leaders` | ADMIN only. `GET ?levelCode=LEVEL_1..LEVEL_5` leaders eligible for a partner. |
| `/api/admin/partners/leader-levels` | ADMIN only. `GET` leader levels (code and display name) for the picker. |

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

### 5b. Account Activation & Password Reset (`/api/account/*`)

Public routes (no session). They are rate limited per IP and never reveal whether an account exists.

| Method | Endpoint                          | Description |
| :----- | :-------------------------------- | :---------- |
| `POST` | `/api/account/forgot-password`    | Body `{ email }`. Always answers the same generic 200 for ineligible accounts; sends a reset link (valid 1 hour) when the user is active, activated, not SSO-only and has a password. |
| `POST` | `/api/account/activate`           | Body `{ token, password }`. Sets the password and activates the account (link valid 72 hours, single use). |
| `POST` | `/api/account/reset-password`     | Body `{ token, password }`. Sets a new password (single use). |

Any token problem answers 400 `Enlace inválido o vencido`; rate limiting answers 429 with `Retry-After`. The pages `/activate-account` and `/reset-password` validate the link on the server (no GET preview, the token never goes in an API query string). Rate-limit keys use the trusted client IP (`getTrustedClientIp`: `x-real-ip`, else the LAST `x-forwarded-for` hop).

### 5c. Landing form submissions (`/api/leads/form-submissions`)

Public to n8n. Authenticates with the same `x-api-key` as `POST /api/leads/crm-sync`. One JSON body creates or matches a lead and stores the form snapshot in the same transaction. Missing/invalid keys return 401 without database writes or audit rows. Authenticated traffic passes the existing rate limit before parsing or auditing; requests over the limit return 429 without database writes or audit rows. An invalid body within the authenticated limit returns 400 with a rejection audit only, without a lead or snapshot. The same `submissionId` returns 200 without a second snapshot.

| Method | Endpoint | Description |
| :----- | :------- | :---------- |
| `POST` | `/api/leads/form-submissions` | Body: `submissionId`, `submittedAt`, `landing`, `lead`, `fields`. |

### 6. System & Utility

| Endpoint                  | Description            |
| :------------------------ | :--------------------- |
| `/api/auth/[...nextauth]` | NextAuth.js endpoints. |
| `/api/health`             | System health check.   |
| `/api/email/send`         | Send generic email.    |

### 6b. Native pipeline leads

| Method | Endpoint | Description |
| :----- | :------- | :---------- |
| `POST` | `/api/leads` | CRM session and `leads_module` management access. Body: required `name`, at least one of `email`, `phone`, `identityNumber`; optional `lastName` and `idUser`. Creates an `OPEN` native lead in `NUEVO_LEAD` with origin `Propio`, without an external CRM ID. Returns `ApiResponse<{ idLead, idUser }>` with 201. |
| `GET` | `/api/crm/advisors?assignable=true` | Management access; active advisors inside the actor's write scope. The default advisors query continues to use read scope for filters. |

Omitted `idUser` assigns the authenticated creator. Only administrators/team leaders may select another owner, inside `manageableUserIds`; a company-wide read grant never widens assignment. Invalid bodies return 400, unauthorized assignment 403, unavailable origin/initial stage 409. Lead, origin pivot and manual timeline entries are atomic; the audit identifies the real creator. Repeated contacts create a distinct lead and `AUTO` links to every active lead matching any nonempty document, email or phone. Links use the real creator and `Propio` origin in the same transaction, and appear in the existing timeline from either endpoint. Existing matching leads are never overwritten or reassigned; each lead retains its authorized owner.

### 6c. Pipeline association metrics

The pipeline `GET /api/leads` accepts `associatedOnly=true` to return only leads in an active related group within the selected hierarchy. `GET /api/crm/reports/summary` accepts the same date, outcome, origin, owner and excluded-branch filters. Its `opportunities` counts distinct connected groups (including singletons); `associatedOpportunities` counts matching lead records belonging to groups of at least two. Both relation endpoints must be active and visible in the selected owner scope. Grouping happens before date/outcome/origin filtering, preserving visible intermediaries outside those filters. The summary ignores `associatedOnly`, keeping the card counts stable while toggling the board filter. Summary report authorization remains unchanged.

### 7. CRM task notices

| Method | Endpoint | Description |
| :----- | :------- | :---------- |
| `GET` | `/api/crm/notification-settings` | Anticipation days for upcoming task notices. CRM managers, flag `crm_tasks`. |
| `PUT` | `/api/crm/notification-settings` | Body `{ anticipationDays }` integer 0–30. Same guard. |
| `POST` | `/api/leads/cron/task-reminders` | Every 15 min. In-app notices for tasks due today and inside the anticipation window. Bearer `CRON_SECRET`. |
| `POST` | `/api/leads/cron/task-digest` | 07:00 Bogotá. Email to the assignee for open overdue tasks only. Bearer `CRON_SECRET`. |

## Development Guidelines

1.  **Always use `ApiResponse<T>`**: No loose JSON objects.
2.  **Validate Inputs**: Use Zod for bodies and query params.
3.  **Check Permissions**: Verify role/permissions after session check.
4.  **Error Handling**: Catch exceptions and return `status: 500` with `ApiErrorResponse`.
