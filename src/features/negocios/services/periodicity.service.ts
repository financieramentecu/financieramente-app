import { prisma } from '@/lib/prisma'

export interface PeriodicityDto {
	id: number
	name: string
}

/**
 * Returns all buy periodicities ordered alphabetically by name.
 */
export async function listPeriodicities(): Promise<PeriodicityDto[]> {
	const rows = await prisma.buyPeriodicity.findMany({
		orderBy: { name: 'asc' },
		select: { idBuyPeriodicity: true, name: true },
	})

	return rows.map((r) => ({ id: r.idBuyPeriodicity, name: r.name }))
}
