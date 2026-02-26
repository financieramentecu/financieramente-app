# Product Configuration Management

This feature allows administrators to manage product configurations, which link a Company's Product to a Client Origin and Category, and defines the default Product Percentage Commission (PPC) for new businesses.

## Overview

A Product Configuration is a unique combination of:

- **Product** (belonging to a specific Company)
- **Client Origin** (e.g., Organic, Referral)
- **Category** (e.g., A, B, C)

When created, the system generates a unique **Code** (e.g., `PRODUCT-ORIGIN-CATEGORY`) and automatically creates an active **Product Percentage Commission (PPC)** record associated with this configuration.

## Key Features

- **Create Configuration**: Select Company -> Product -> Origin -> Category.
- **List & Filter**: View all configurations with server-side pagination, search, and filtering by status.
- **Update**: Modify the PPC reference for "New Businesses".
- **Toggle Active**: Activate or deactivate a configuration (soft delete).
- **Validation**: Ensures Product belongs to Company, and Code/Combination is unique.

## Architecture

This feature follows the **Feature-Based Architecture** located in `src/features/product-configuration/`.

### Directory Structure

- `components/`: Presentational components (Forms, Tables, Dialogs).
- `hooks/`: Custom hooks for state management and data fetching.
  - `useProductConfigurations`: Manages list state, filtering, and pagination.
  - `useProductConfigurationForm`: Manages form state and validation.
  - `useProductConfigurationMutations`: Manages create/update/toggle operations.
- `lib/`: Utilities and Zod schemas.
  - `product-configuration-schemas.ts`: Validation schemas.
  - `product-configuration-api.ts`: Client-side API wrapper.
- `types/`: TypeScript interfaces and types.
- `mappers/`: Data transformation logic.
- `__tests__/`: Unit and integration tests.

## Usage

### Routes

- **List**: `/dashboard/configuraciones-producto`
- **Create**: `/dashboard/configuraciones-producto/crear`
- **Edit**: `/dashboard/configuraciones-producto/editar/[id]`

### API Endpoints

- `GET /api/product-configurations`: List with pagination and filters.
- `POST /api/product-configurations`: Create a new configuration.
- `GET /api/product-configurations/[id]`: Get details.
- `PUT /api/product-configurations/[id]`: Update details.
- `PATCH /api/product-configurations/[id]`: Toggle active status.
- `GET /api/product-configurations/[id]/ppcs`: Get available PPC options.

## Testing

To run tests for this feature:

```bash
# Run all tests for this feature
npx vitest run src/features/product-configuration src/app/api/product-configurations

# Run with coverage
npx vitest run src/features/product-configuration src/app/api/product-configurations --coverage
```

## Dependencies

- **Prisma ORM**: Database access.
- **React Hook Form + Zod**: Form handling and validation.
- **TanStack Table (shadcn/ui)**: Data display.
- **Sonner**: Toast notifications.
