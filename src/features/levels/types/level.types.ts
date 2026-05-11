/**
 * Types for the Levels feature (formerly Categories)
 */

/**
 * Level type constants
 */
export const LEVEL_TYPES = ['MMS', 'ALIADO', 'TRINITY'] as const
export type LevelType = (typeof LEVEL_TYPES)[number]

/**
 * System level type name constant — used to detect system-managed levels
 */
export const SYSTEM_LEVEL_TYPE_NAME = 'SISTEMA' as const

/**
 * Beneficiary mode for commission distribution
 */
export type BeneficiaryMode = 'OVERRIDE' | 'BENEFICIARIO_GENERAL'

/**
 * Fixed beneficiary user data (minimal projection)
 */
export interface FixedBeneficiaryUser {
	readonly idUser: number
	name: string
	lastName: string
	email: string
}

/**
 * Minimal next level projection (for self-referential sequence)
 */
export interface NextLevel {
	readonly id: number
	name: string
}

/**
 * Level interface (mapped from Prisma, not using Prisma types directly)
 */
export interface Level extends Record<string, unknown> {
	readonly idLevel: number
	code: string
	name: string
	typeLevel: string
	idLevelType?: number
	descripcion: string | null
	color: string
	status: boolean
	beneficiaryMode: BeneficiaryMode
	idFixedBeneficiaryUser: number | null
	fixedBeneficiaryUser?: FixedBeneficiaryUser | null
	idNextLevel: number | null
	nextLevel: NextLevel | null
	readonly createdAt: string
	readonly updatedAt: string
}

/**
 * Filters for level search/listing
 */
export interface LevelFilters {
	search?: string
	typeLevel?: string
	status?: string
}

/**
 * Input for creating a new level
 */
export interface CreateLevelInput {
	code: string
	name: string
	typeLevel: string
	descripcion?: string | null
	color: string
	status: boolean
	beneficiaryMode?: BeneficiaryMode
	idFixedBeneficiaryUser?: number | null
	idNextLevel?: number | null
}

/**
 * Input for updating an existing level
 */
export interface UpdateLevelInput {
	code?: string
	name?: string
	typeLevel?: string
	descripcion?: string | null
	color?: string
	status?: boolean
	beneficiaryMode?: BeneficiaryMode
	idFixedBeneficiaryUser?: number | null
	idNextLevel?: number | null
}

/**
 * Response structure for level list with pagination
 */
export interface LevelListResponse {
	levels: Level[]
	pagination: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	}
}
