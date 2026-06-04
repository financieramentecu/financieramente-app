import { prisma } from '@/lib/prisma'

/**
 * Returns the distinct term values present in the Business table, sorted ascending.
 * Term is the loan/contract duration in years.
 */
export async function listDistinctTerms(): Promise<number[]> {
	const rows = await prisma.business.findMany({
		distinct: ['term'],
		select: { term: true },
		where: { term: { not: null } },
		orderBy: { term: 'asc' },
	})

	return rows
		.map((r) => r.term)
		.filter((t): t is number => t !== null)
}
