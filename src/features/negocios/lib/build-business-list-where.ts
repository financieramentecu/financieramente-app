import type { Prisma } from '@prisma/client'
import { UserRole } from '@/features/auth/lib/roles'

// Límite máximo para un entero de 32 bits en PostgreSQL (INT4)
const POSTGRES_INT_MAX = 2147483647

export interface BusinessListFilterInput {
	search?: string
	status?: string
	dateAnchoredRange?: { gte: Date; lte: Date }
	createdAtRange?: { gte: Date; lte: Date }
	agentName?: string
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
	const isAdmin = roleCode === UserRole.ADMIN
	const isScoped = !isAdmin

	if (isScoped) {
		const { visibleUserIds } = options
		if (visibleUserIds && visibleUserIds.length > 0) {
			whereConditions.push({ idUser: { in: visibleUserIds } })
		} else {
			whereConditions.push({ idUser: currentUser.idUser })
		}
	}

	const { status, search, dateAnchoredRange, createdAtRange, agentName } = filters

	if (status) {
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

	return whereConditions.length > 0 ? { AND: whereConditions } : {}
}
