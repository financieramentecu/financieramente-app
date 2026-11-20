/**
 * Assignee ids a CRM viewer may see.
 * `null` means unrestricted (hierarchy bypass and no advisor filter).
 * An empty array means the filter excluded everyone in scope.
 */
export function resolveAssigneeScope(visibleUserIds: number[], requestedOwnerIds: number[]): number[] | null {
	const requested = [...new Set(requestedOwnerIds)]
	if (visibleUserIds.length === 0) {
		return requested.length === 0 ? null : requested
	}
	if (requested.length === 0) return visibleUserIds
	return requested.filter((id) => visibleUserIds.includes(id))
}
