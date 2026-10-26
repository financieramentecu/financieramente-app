import { prisma } from '@/lib/prisma'

/**
 * Returns the distinct term values present in the Business table, sorted ascending.
 * Term is the loan/contract duration in years.
 */
export async function listDistinctTerms(options?: {
	/** Restrict to businesses owned by these users (PARTNER sees only own data). */
	ownerIds?: number[]
}): Promise<number[]> {
	const rows = await prisma.business.findMany({
		distinct: ['term'],
		select: { term: true },
		where: {
			term: { not: null },
			...(options?.ownerIds ? { idUser: { in: options.ownerIds } } : {}),
		},
		orderBy: { term: 'asc' },
	})

	return rows
		.map((r) => r.term)
		.filter((t): t is number => t !== null)
}
