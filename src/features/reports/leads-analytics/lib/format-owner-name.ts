/**
 * Display name for a Money Strategist heatmap row.
 */

export function formatOwnerName(user: {
	name: string
	lastName: string | null
}): string {
	return [user.name, user.lastName].filter(Boolean).join(' ')
}
