import type { Prisma } from '@prisma/client'
import { UserRole } from '@/features/auth/lib/roles'

export interface BusinessListFilterInput {
	search?: string
	status?: string
	/** Inclusivo en `business.date_anchored`; excluye null en el rango */
	dateAnchoredRange?: { gte: Date; lte: Date }
}

/**
 * Construye el WHERE de lista/export de negocios (visibilidad agente + filtros).
 */
export function buildBusinessListWhere(
	currentUser: {
		idUser: number
		role?: { code: string } | null
	},
	filters: BusinessListFilterInput
): Prisma.BusinessWhereInput {
	const whereConditions: Prisma.BusinessWhereInput[] = []

	const isAgent = currentUser.role?.code === UserRole.AGENTE
	if (isAgent) {
		whereConditions.push({ idUser: currentUser.idUser })
	}

	const { status, search, dateAnchoredRange } = filters

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

		if (isNumeric && searchNumber <= 2147483647) {
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

	return whereConditions.length > 0 ? { AND: whereConditions } : {}
}
