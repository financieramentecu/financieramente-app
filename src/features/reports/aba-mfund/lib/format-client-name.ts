/**
 * Cliente display: Nombre - Apellido (hyphen, not space-joined).
 */
export function formatClientName(
	name: string,
	lastName: string | null | undefined
): string {
	const first = name.trim()
	const last = lastName?.trim()
	if (last) return `${first} - ${last}`
	return first
}

/**
 * Agent display name: Nombre Apellido (space-joined).
 */
export function formatAgentName(
	name: string,
	lastName: string | null | undefined
): string {
	const first = name.trim()
	const last = lastName?.trim()
	if (last) return `${first} ${last}`
	return first
}
