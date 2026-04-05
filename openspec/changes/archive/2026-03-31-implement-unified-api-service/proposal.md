## Why

Currently, client-side API services like `business.service.ts` and others manually handle fetch requests, error handling, and query string building. This leads to code duplication, inconsistent error reporting, and maintenance difficulties. Implementing a unified API service pattern with a robust, type-safe utility will adhere to DRY (Don't Repeat Yourself) and Single Responsibility principles, ensuring a consistent and reliable communication layer across the application.

## What Changes

- **Enhance `ApiClient`**: Upgrade the existing `apiClient` in `src/lib/api/client.ts` to support more robust features like automatic query string building, standardized error responses, and better type inference.
- **Implement Request Utility**: Create a functional wrapper or utility that simplifies common request patterns (e.g., handling `ApiResponse<T>` wrappers).
- **Refactor Services**: Update existing services in `src/features/*/services/` (starting with `business.service.ts`) to use the enhanced `apiClient`.
- **Standardize Error Handling**: Move specific error parsing logic out of individual services and into the central `apiClient`.

## Capabilities

### New Capabilities
- `unified-api-client`: Provides a type-safe, centralized interface for all client-side HTTP communication, handling common tasks like header injection, query serialization, and standardized error parsing.

### Modified Capabilities
- None: This change refactors implementation details to better satisfy existing requirements for data fetching and error handling.

## Impact

- **Affected Files**:
    - `src/lib/api/client.ts`: Main implementation of the pattern.
    - `src/features/*/services/*.ts`: All services consuming API endpoints.
- **Dependencies**: None.
- **APIs**: No changes to backend APIs; this is a client-side refactoring.
