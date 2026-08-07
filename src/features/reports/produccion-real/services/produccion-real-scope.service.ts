/**
 * Intersects requested hierarchy userIds with the viewer's auth scope.
 * Reuses production-dashboard `resolveViewerScope` (heatmap pattern).
 */

import { resolveViewerScope } from '@/features/production-dashboard/services/heatmap.service'

export interface ScopeViewer {
	readonly idUser: number
	readonly roleCode: string | null | undefined
	readonly levelCode?: string | null | undefined
}

/**
 * Returns requested userIds ∩ viewer scope.
 * Empty input → empty (caller returns zero KPIs / empty table).
 */
export async function intersectUserIdsWithViewerScope(
	requestedUserIds: readonly number[],
	viewer: ScopeViewer
): Promise<number[]> {
	if (requestedUserIds.length === 0) return []

	const scope = await resolveViewerScope(
		viewer.idUser,
		viewer.roleCode,
		viewer.levelCode
	)
	const scopeSet = new Set(scope)
	return requestedUserIds.filter((id) => scopeSet.has(id))
}
