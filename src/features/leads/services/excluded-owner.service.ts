import { prisma } from '@/lib/prisma'
import { descendantClosure, exclusionsWithinScope } from '@/features/leads/lib/descendant-closure'

/**
 * Unchecked hierarchy nodes plus everyone under them.
 * An empty root list skips the user read. A bypass viewer passes an empty
 * `visibleUserIds` and may exclude any branch; everyone else is limited to
 * the ids the server already allows.
 */
export async function expandExcludedOwnerIds(
	rootIds: readonly number[],
	visibleUserIds: readonly number[]
): Promise<number[]> {
	if (rootIds.length === 0) return []
	const links = await prisma.user.findMany({
		select: { idUser: true, idUserLeader: true },
	})
	return exclusionsWithinScope(visibleUserIds, descendantClosure(rootIds, links))
}
