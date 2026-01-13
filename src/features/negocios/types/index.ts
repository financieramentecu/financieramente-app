/**
 * Re-exports de todos los tipos del feature de negocios
 */

// Tipos de entidad de dominio (fuente principal de BusinessStatus y BUSINESS_STATUS)
export * from './business-entity.types'

// Tipos de API
export * from './business-api.types'

// Tipos legacy (mantener compatibilidad) - excluir BusinessStatus duplicado
export type {
	Business,
	StatsData,
	BusinessSearchParams,
	UserWithRole,
	CurrentUser,
	BusinessFormProps,
} from './business.types'

// business-status.types.ts está deprecado, usar business-entity.types.ts
export { determineBusinessStatus } from './business-status.types'
