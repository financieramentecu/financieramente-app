import { prisma } from '@/lib/prisma'

/**
 * Busca un Business por contract (Server-side)
 * @param contract - ID del contrato (Cto del Excel)
 * @returns Business encontrado o null
 */
export async function findBusinessByContract(
	contract: string
): Promise<{ idBusiness: number; createdAt: Date } | null> {
	if (!contract || !contract.trim()) {
		return null
	}

	try {
		return prisma.business.findFirst({
			where: {
				contract: contract.trim(),
			},
			select: {
				idBusiness: true,
				createdAt: true,
			},
		})
	} catch (error) {
		console.error('Error al buscar Business by contract:', error)
		return null
	}
}
