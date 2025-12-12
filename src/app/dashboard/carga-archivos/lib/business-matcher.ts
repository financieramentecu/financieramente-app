import { prisma } from '@/lib/prisma'

/**
 * Busca un Business por contract donde la fecha de creación esté en el rango [desde, hasta]
 * @param contract - ID del contrato (Cto del Excel)
 * @param desde - Fecha desde (comissionDateFrom)
 * @param hasta - Fecha hasta (comissionDateUntil)
 * @returns Business encontrado o null
 */
export async function findBusinessByContractInDateRange(
	contract: string,
	desde: Date,
	hasta: Date
): Promise<{ idBusiness: number } | null> {
	if (!contract || !contract.trim()) {
		return null
	}

	try {
		const business = await prisma.business.findFirst({
			where: {
				contract: contract.trim(),
				createdAt: {
					gte: desde,
					lte: hasta,
				},
			},
			select: {
				idBusiness: true,
			},
		})

		return business
	} catch (error) {
		console.error('Error al buscar Business:', error)
		return null
	}
}

