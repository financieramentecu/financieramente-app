import { prisma } from '@/lib/prisma'
import type { HierarchyAdvisor } from '@/features/leads/types/hierarchy-advisor.types'

export type { HierarchyAdvisor }

function displayName(user: { name: string; lastName: string | null }): string {
	return [user.name, user.lastName].filter(Boolean).join(' ') || 'Sin nombre'
}

/**
 * Active people the viewer may filter by: self and descendants.
 * A hierarchy-bypass actor (`visibleUserIds` empty) sees every active user.
 */
export async function listHierarchyAdvisors(visibleUserIds: number[]): Promise<HierarchyAdvisor[]> {
	const users = await prisma.user.findMany({
		where: {
			active: true,
			...(visibleUserIds.length > 0 ? { idUser: { in: visibleUserIds } } : {}),
		},
		select: { idUser: true, name: true, lastName: true },
		orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
	})
	return users.map((user) => ({ idUser: user.idUser, name: displayName(user) }))
}
