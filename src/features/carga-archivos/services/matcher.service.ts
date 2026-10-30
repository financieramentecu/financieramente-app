import { prisma } from '@/lib/prisma'
import { isDistributionExcludedLevel } from '@/features/shared/lib/level-codes'

export interface MatchedBusiness {
	idBusiness: number
	createdAt: Date
	/**
	 * True when the business PPC belongs to a PARTNER_EXTERNAL configuration.
	 * Decided from the configuration level, never from the owner's current role.
	 */
	isDistributionExcluded: boolean
}

/**
 * Busca un Business por contract (Server-side)
 * @param contract - ID del contrato (Cto del Excel)
 * @returns Business encontrado (con la marca de exclusión de distribución) o null
 */
export async function findBusinessByContract(
	contract: string
): Promise<MatchedBusiness | null> {
	if (!contract || !contract.trim()) {
		return null
	}

	// Errors propagate on purpose: a DB failure must not turn a row into a LAG.
	const business = await prisma.business.findFirst({
		where: {
			contract: contract.trim(),
		},
		select: {
			idBusiness: true,
			createdAt: true,
			productPercentageCommission: {
				select: {
					productConfiguration: {
						select: { level: { select: { code: true } } },
					},
				},
			},
		},
	})

	if (!business) return null

	return {
		idBusiness: business.idBusiness,
		createdAt: business.createdAt,
		isDistributionExcluded: isDistributionExcludedLevel(
			business.productPercentageCommission?.productConfiguration?.level?.code
		),
	}
}
