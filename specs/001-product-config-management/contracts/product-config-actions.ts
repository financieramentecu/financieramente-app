/**
 * API Contracts: Product Configuration Management
 *
 * Server Actions signatures for product configuration CRUD operations.
 * All actions follow the pattern:
 * 1. Authenticate (verify session)
 * 2. Authorize (verify admin role)
 * 3. Validate input (Zod schema)
 * 4. Execute business logic (via service)
 * 5. Return ApiResponse<T>
 *
 * Feature: 001-product-config-management
 * Date: 2026-02-06
 */

// ============================================================================
// Response Types
// ============================================================================

/**
 * Standard API response wrapper for all Server Actions
 */
export type ApiResponse<T> =
	| { success: true; data: T }
	| { success: false; error: string; details?: unknown }

/**
 * Pagination metadata
 */
export interface PaginationMeta {
	readonly page: number
	readonly pageSize: number
	readonly total: number
	readonly totalPages: number
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
	readonly data: T[]
	readonly pagination: PaginationMeta
}

// ============================================================================
// Domain Types (imported from feature types)
// ============================================================================

/**
 * ProductConfiguration entity with related data
 */
export interface ProductConfigurationDto {
	readonly id: number
	readonly code: string | null
	readonly idProduct: number
	readonly idClientOrigin: number
	readonly idCategory: number
	readonly idProductPercentajeCommisionNewBusinesses: number | null
	readonly active: boolean
	readonly createdAt: Date
	readonly updatedAt: Date
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

/**
 * ProductPercentajeCommision option for dropdown
 */
export interface ProductPercentajeCommisionOption {
	readonly id: string
	readonly label: string // e.g., "PPC-001 (Created: 2024-01-15)"
}

// ============================================================================
// Input Schemas (Zod) - Type inference from schemas
// ============================================================================

/**
 * Input for creating a product configuration
 * Schema: createProductConfigSchema
 */
export interface CreateProductConfigInput {
	readonly idCompany: number // For validation: verify product belongs to company
	readonly idProduct: number
	readonly idClientOrigin: number
	readonly idCategory: number
}

/**
 * Input for updating a product configuration
 * Schema: updateProductConfigSchema
 */
export interface UpdateProductConfigInput {
	readonly id: number
	readonly idProductPercentajeCommisionNewBusinesses: number
}

/**
 * Input for toggling product configuration active status
 * Schema: toggleProductConfigSchema
 */
export interface ToggleProductConfigInput {
	readonly id: number
	readonly active: boolean
}

/**
 * Input for listing product configurations with filters
 * Schema: listProductConfigsSchema
 */
export interface ListProductConfigsInput {
	readonly page?: number // Default: 1
	readonly pageSize?: number // Default: 10, Max: 100
	readonly search?: string // Search in code, product name, company name, origin name, category name
	readonly activeFilter?: 'all' | 'active' | 'inactive' // Default: 'all'
	readonly idCompany?: number // Optional filter by company
}

// ============================================================================
// Server Actions Contracts
// ============================================================================

/**
 * Creates a new product configuration.
 *
 * Business Logic:
 * 1. Validates that company, product, origin, and category exist and are active
 * 2. Verifies that product belongs to the specified company (idProduct + idCompany match)
 * 3. Checks for duplicate configuration (unique: idProduct + idClientOrigin + idCategory)
 * 4. Generates code identifier (format: PRODUCT_NAME-ORIGIN_NAME-CATEGORY_NAME)
 * 5. Executes transactional creation:
 *    - Create ProductConfiguration
 *    - Create ProductPercentajeCommision (auto-create if none exists)
 *    - Link PPC to ProductConfiguration
 * 6. Returns created configuration with relations (including company)
 *
 * Authorization: Admin only
 *
 * Errors:
 * - UNAUTHORIZED: User not authenticated
 * - FORBIDDEN: User is not admin
 * - VALIDATION_ERROR: Invalid input (missing fields, inactive entities)
 * - INVALID_PRODUCT_COMPANY: Product does not belong to specified company
 * - DUPLICATE_CONFIGURATION: Combination already exists
 * - CODE_TOO_LONG: Generated code exceeds 50 characters
 * - DATABASE_ERROR: Transaction failed
 *
 * @param input - CreateProductConfigInput (includes idCompany for validation)
 * @returns ApiResponse<ProductConfigurationDto>
 *
 * @example
 * const result = await createProductConfig({
 *   idCompany: 1,              // Company: Skandia
 *   idProduct: 123,            // Product: Crea Patrimonio
 *   idClientOrigin: 456,       // Origin: Propio
 *   idCategory: 789            // Category: Junior
 * })
 *
 * if (result.success) {
 *   console.log(result.data.code) // "CREA_PATRIMONIO-PROPIO-JUNIOR"
 *   console.log(result.data.product.company.name) // "Skandia"
 * } else {
 *   console.error(result.error)
 * }
 */
export type CreateProductConfigAction = (
	input: CreateProductConfigInput
) => Promise<ApiResponse<ProductConfigurationDto>>

/**
 * Lists product configurations with filtering, search, and pagination.
 *
 * Business Logic:
 * 1. Applies search filter (if provided) across code, product name, origin name, category name
 * 2. Applies active filter (if provided): 'all' | 'active' | 'inactive'
 * 3. Paginates results (default: 10 per page)
 * 4. Orders by createdAt DESC
 * 5. Returns configurations with related product, origin, category data
 *
 * Authorization: Admin only
 *
 * Errors:
 * - UNAUTHORIZED: User not authenticated
 * - FORBIDDEN: User is not admin
 * - VALIDATION_ERROR: Invalid pagination parameters
 *
 * @param input - ListProductConfigsInput
 * @returns ApiResponse<PaginatedResponse<ProductConfigurationDto>>
 *
 * @example
 * const result = await listProductConfigs({
 *   page: 1,
 *   pageSize: 10,
 *   search: 'patrimonio',
 *   activeFilter: 'active'
 * })
 *
 * if (result.success) {
 *   console.log(result.data.data) // Array of configurations
 *   console.log(result.data.pagination.total) // Total count
 * }
 */
export type ListProductConfigsAction = (
	input?: ListProductConfigsInput
) => Promise<ApiResponse<PaginatedResponse<ProductConfigurationDto>>>

/**
 * Updates a product configuration's reference to ProductPercentajeCommision for new businesses.
 *
 * Business Logic:
 * 1. Validates that configuration exists
 * 2. Validates that new PPC exists and belongs to this configuration
 * 3. Updates only idProductPercentajeCommisionNewBusinesses field
 * 4. Other fields (code, productId, originClientId, categoryId) are immutable
 * 5. Returns updated configuration
 *
 * Authorization: Admin only
 *
 * Errors:
 * - UNAUTHORIZED: User not authenticated
 * - FORBIDDEN: User is not admin
 * - VALIDATION_ERROR: Invalid input
 * - NOT_FOUND: Configuration not found
 * - INVALID_PPC: PPC does not belong to this configuration
 *
 * @param input - UpdateProductConfigInput
 * @returns ApiResponse<ProductConfigurationDto>
 *
 * @example
 * const result = await updateProductConfig({
 *   id: 'config-123',
 *   idProductPercentajeCommisionNewBusinesses: 'ppc-456'
 * })
 */
export type UpdateProductConfigAction = (
	input: UpdateProductConfigInput
) => Promise<ApiResponse<ProductConfigurationDto>>

/**
 * Toggles the active status of a product configuration (activate/inactivate).
 *
 * Business Logic:
 * 1. Validates that configuration exists
 * 2. Toggles active field
 * 3. When inactive: configuration is hidden from new business creation flow
 * 4. Existing businesses using this configuration are not affected
 * 5. Returns updated configuration
 *
 * Authorization: Admin only
 *
 * Errors:
 * - UNAUTHORIZED: User not authenticated
 * - FORBIDDEN: User is not admin
 * - VALIDATION_ERROR: Invalid input
 * - NOT_FOUND: Configuration not found
 *
 * @param input - ToggleProductConfigInput
 * @returns ApiResponse<ProductConfigurationDto>
 *
 * @example
 * const result = await toggleProductConfig({
 *   id: 'config-123',
 *   active: false // Inactivate
 * })
 */
export type ToggleProductConfigAction = (
	input: ToggleProductConfigInput
) => Promise<ApiResponse<ProductConfigurationDto>>

/**
 * Gets available ProductPercentajeCommision options for a product configuration.
 * Used in edit form to populate dropdown of available PPCs.
 *
 * Business Logic:
 * 1. Validates that configuration exists
 * 2. Fetches all active PPCs linked to this configuration
 * 3. Returns list of PPC options with formatted labels
 *
 * Authorization: Admin only
 *
 * Errors:
 * - UNAUTHORIZED: User not authenticated
 * - FORBIDDEN: User is not admin
 * - NOT_FOUND: Configuration not found
 *
 * @param configId - ProductConfiguration ID
 * @returns ApiResponse<ProductPercentajeCommisionOption[]>
 *
 * @example
 * const result = await getAvailablePPCs('config-123')
 * if (result.success) {
 *   console.log(result.data) // [{ id: 'ppc-1', label: 'PPC-001 (Created: 2024-01-15)' }, ...]
 * }
 */
export type GetAvailablePPCsAction = (
	configId: string
) => Promise<ApiResponse<ProductPercentajeCommisionOption[]>>

/**
 * Gets a single product configuration by ID.
 * Used for edit form pre-population.
 *
 * Business Logic:
 * 1. Validates that configuration exists
 * 2. Returns configuration with all relations
 *
 * Authorization: Admin only
 *
 * Errors:
 * - UNAUTHORIZED: User not authenticated
 * - FORBIDDEN: User is not admin
 * - NOT_FOUND: Configuration not found
 *
 * @param id - ProductConfiguration ID
 * @returns ApiResponse<ProductConfigurationDto>
 *
 * @example
 * const result = await getProductConfig('config-123')
 * if (result.success) {
 *   console.log(result.data.code)
 * }
 */
export type GetProductConfigAction = (
	id: string
) => Promise<ApiResponse<ProductConfigurationDto>>

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example: Create Configuration Flow (Two-Step: Company → Product)
 *
 * 1. User selects company from dropdown
 * 2. Product dropdown populates with products filtered by selected company
 * 3. User selects product, origin, category
 * 4. Client submits form → createProductConfig Server Action
 * 5. Server validates product-company match, generates code, creates config + PPC transactionally
 * 6. Returns success + redirect to list
 *
 * Client Component (ProductConfigForm.tsx):
 * ```tsx
 * const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
 * const [products, setProducts] = useState<Product[]>([])
 *
 * // Load products when company changes
 * useEffect(() => {
 *   if (selectedCompany) {
 *     fetchProducts(selectedCompany).then(setProducts)
 *   }
 * }, [selectedCompany])
 *
 * const handleSubmit = async (data: CreateProductConfigInput) => {
 *   const result = await createProductConfig({
 *     ...data,
 *     idCompany: selectedCompany! // Include company for validation
 *   })
 *
 *   if (result.success) {
 *     toast.success(`Configuration created: ${result.data.code}`)
 *     toast.info(`Company: ${result.data.product.company.name}`)
 *     router.push('/configurations')
 *   } else {
 *     toast.error(result.error)
 *   }
 * }
 *
 * return (
 *   <form>
 *     <Select
 *       name="idCompany"
 *       label="Compañía"
 *       onChange={(value) => setSelectedCompany(value)}
 *       options={companies}
 *     />
 *     <Select
 *       name="idProduct"
 *       label="Producto"
 *       disabled={!selectedCompany}
 *       options={products} // Filtered by selected company
 *     />
 *     <Select name="idClientOrigin" label="Origen" options={origins} />
 *     <Select name="idCategory" label="Categoría" options={categories} />
 *   </form>
 * )
 * ```
 */

/**
 * Example: List Configurations Flow
 *
 * 1. Server Component fetches configurations on page load
 * 2. Client applies filters/search → triggers re-fetch
 * 3. Server returns paginated results
 *
 * Server Component (ConfigListPage.tsx):
 * ```tsx
 * export default async function ConfigListPage({ searchParams }) {
 *   const result = await listProductConfigs({
 *     page: Number(searchParams.page) || 1,
 *     search: searchParams.search,
 *     activeFilter: searchParams.status
 *   })
 *
 *   if (!result.success) {
 *     return <ErrorState message={result.error} />
 *   }
 *
 *   return <ConfigList data={result.data.data} pagination={result.data.pagination} />
 * }
 * ```
 */

/**
 * Example: Update Configuration Flow
 *
 * 1. Load configuration + available PPCs
 * 2. User selects different PPC from dropdown
 * 3. Submit → updateProductConfig Server Action
 * 4. Return success + show updated data
 *
 * Client Component (ProductConfigEditForm.tsx):
 * ```tsx
 * const handleSubmit = async (data: UpdateProductConfigInput) => {
 *   const result = await updateProductConfig(data)
 *   if (result.success) {
 *     toast.success('Configuration updated')
 *     router.push('/configurations')
 *   } else {
 *     toast.error(result.error)
 *   }
 * }
 * ```
 */

/**
 * Example: Toggle Active Status Flow
 *
 * 1. User clicks toggle button in list
 * 2. Client confirms action (modal)
 * 3. Submit → toggleProductConfig Server Action
 * 4. Optimistically update UI + revalidate on response
 *
 * Client Component (ConfigListItem.tsx):
 * ```tsx
 * const handleToggle = async () => {
 *   const confirmed = await confirm('Toggle configuration status?')
 *   if (!confirmed) return
 *
 *   const result = await toggleProductConfig({
 *     id: config.id,
 *     active: !config.active
 *   })
 *
 *   if (result.success) {
 *     router.refresh() // Revalidate Server Component
 *   } else {
 *     toast.error(result.error)
 *   }
 * }
 * ```
 */
