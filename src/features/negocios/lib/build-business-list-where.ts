import type { Prisma } from '@prisma/client'
import { UserRole } from '@/features/auth/lib/roles'

// Límite máximo para un entero de 32 bits en PostgreSQL (INT4)
const POSTGRES_INT_MAX = 2147483647

export interface BusinessListFilterInput {
	search?: string
	status?: string
	/** Multiselect statuses — takes precedence over single `status` when provided */
	statuses?: string[]
	dateAnchoredRange?: { gte: Date; lte: Date }
	createdAtRange?: { gte: Date; lte: Date }
	/** dateIssued range — column is nullable so NOT NULL guard is applied automatically */
	dateIssuedRange?: { gte: Date; lte: Date }
	agentName?: string
	/** true → has at least one active support; false → has no active supports */
	hasSupports?: boolean
	companyIds?: number[]
	productIds?: number[]
	originIds?: number[]
	/** Term (loan duration in years) multiselect */
	terms?: number[]
	/** Buy periodicity IDs multiselect */
	periodicityIds?: number[]
	/** Agent (Money Strategist) category IDs — filters by User.idCategory */
	agentCategoryIds?: number[]
	/** Money Strategist user IDs — filters by Business.idUser */
	agentIds?: number[]
}

export interface BuildBusinessListWhereOptions {
	/**
	 * When provided and non-empty, restricts results to businesses owned by these user IDs.
	 * Used for hierarchical visibility: [self, ...subordinates].
	 * Ignored for ADMIN / SUPER_ADMIN roles.
	 */
	visibleUserIds?: number[]
}

/**
 * Construye el WHERE de lista/export de negocios (visibilidad agente + filtros).
 */
export function buildBusinessListWhere(
	currentUser: {
		idUser: number
		role?: { code: string } | null
	},
	filters: BusinessListFilterInput,
	options: BuildBusinessListWhereOptions = {}
): Prisma.BusinessWhereInput {
	const whereConditions: Prisma.BusinessWhereInput[] = []

	const roleCode = currentUser.role?.code
	const isAdmin =
		roleCode === UserRole.ADMIN ||
		roleCode === UserRole.ASISTENTE_GERENCIA_OPERATIVA ||
		roleCode === UserRole.ANALISTA_SOPORTE
	const isScoped = !isAdmin

	if (isScoped) {
		const { visibleUserIds } = options
		if (visibleUserIds && visibleUserIds.length > 0) {
			whereConditions.push({ idUser: { in: visibleUserIds } })
		} else {
			whereConditions.push({ idUser: currentUser.idUser })
		}
	}

	const {
		status,
		statuses,
		search,
		dateAnchoredRange,
		createdAtRange,
		dateIssuedRange,
		agentName,
		hasSupports,
		companyIds,
		productIds,
		originIds,
		terms,
		periodicityIds,
		agentCategoryIds,
		agentIds,
	} = filters

	// statuses[] takes precedence over single status (back-compat)
	if (statuses && statuses.length > 0) {
		whereConditions.push({ status: { in: statuses } })
	} else if (status) {
		whereConditions.push({ status })
	}

	if (search?.trim()) {
		const searchTerm = search.trim()
		const searchNumber = parseInt(searchTerm, 10)
		const isNumeric = !Number.isNaN(searchNumber)

		const searchOrConditions: Prisma.BusinessWhereInput[] = [
			{
				client: {
					OR: [
						{ identityNumber: { contains: searchTerm, mode: 'insensitive' } },
						{ name: { contains: searchTerm, mode: 'insensitive' } },
						{ lastName: { contains: searchTerm, mode: 'insensitive' } },
						{ email: { contains: searchTerm, mode: 'insensitive' } },
					],
				},
			},
			{
				contract: { contains: searchTerm, mode: 'insensitive' },
			},
		]

		if (isNumeric && searchNumber > 0 && searchNumber <= POSTGRES_INT_MAX) {
			searchOrConditions.push({ idBusiness: searchNumber })
		}

		whereConditions.push({ OR: searchOrConditions })
	}

	if (dateAnchoredRange) {
		whereConditions.push({
			AND: [
				{ dateAnchored: { not: null } },
				{
					dateAnchored: {
						gte: dateAnchoredRange.gte,
						lte: dateAnchoredRange.lte,
					},
				},
			],
		})
	}

	if (createdAtRange) {
		whereConditions.push({
			createdAt: {
				gte: createdAtRange.gte,
				lte: createdAtRange.lte,
			},
		})
	}

	if (dateIssuedRange) {
		// dateIssued is nullable — must guard against null rows leaking into range results
		whereConditions.push({
			AND: [
				{ dateIssued: { not: null } },
				{
					dateIssued: {
						gte: dateIssuedRange.gte,
						lte: dateIssuedRange.lte,
					},
				},
			],
		})
	}

	if (hasSupports === true) {
		whereConditions.push({ supports: { some: { status: true } } })
	} else if (hasSupports === false) {
		whereConditions.push({ supports: { none: { status: true } } })
	}

	if (agentName?.trim()) {
		const terms = agentName.trim().split(/\s+/)
		const agentConditions: Prisma.UserWhereInput[] = terms.map((term) => ({
			OR: [
				{ name: { contains: term, mode: 'insensitive' } },
				{ lastName: { contains: term, mode: 'insensitive' } },
			],
		}))

		whereConditions.push({
			user: {
				AND: agentConditions,
			},
		})
	}

	if (companyIds && companyIds.length > 0) {
		whereConditions.push({
			productPercentageCommission: {
				productConfiguration: {
					product: { idCompany: { in: companyIds } },
				},
			},
		})
	}

	if (productIds && productIds.length > 0) {
		whereConditions.push({
			productPercentageCommission: {
				productConfiguration: {
					idProduct: { in: productIds },
				},
			},
		})
	}

	if (originIds && originIds.length > 0) {
		whereConditions.push({
			idClientOrigin: { in: originIds },
		})
	}

	if (terms && terms.length > 0) {
		whereConditions.push({ term: { in: terms } })
	}

	if (periodicityIds && periodicityIds.length > 0) {
		whereConditions.push({ idBuyPeriodicity: { in: periodicityIds } })
	}

	if (agentCategoryIds && agentCategoryIds.length > 0) {
		whereConditions.push({ user: { idCategory: { in: agentCategoryIds } } })
	}

	if (agentIds && agentIds.length > 0) {
		whereConditions.push({ idUser: { in: agentIds } })
	}

	return whereConditions.length > 0 ? { AND: whereConditions } : {}
}
