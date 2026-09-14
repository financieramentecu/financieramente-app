/**
 * Owner scope for a funnel-cell lead list.
 * Query string: omit = all selected users, `none` = unassigned, number = one MS.
 */

export const CELL_OWNER_SENTINEL = {
	ALL: 'all',
	UNASSIGNED: 'unassigned',
} as const

export type CellOwnerSentinel =
	(typeof CELL_OWNER_SENTINEL)[keyof typeof CELL_OWNER_SENTINEL]

export type CellOwnerFilter = number | CellOwnerSentinel

export function parseCellOwnerFilter(raw: string | undefined): CellOwnerFilter {
	const trimmed = raw?.trim()
	if (!trimmed) return CELL_OWNER_SENTINEL.ALL
	if (trimmed === 'none') return CELL_OWNER_SENTINEL.UNASSIGNED
	const idUser = Number(trimmed)
	if (!Number.isInteger(idUser) || idUser <= 0) {
		throw new Error(`ID inválido: ${trimmed}`)
	}
	return idUser
}

export function serializeCellOwnerFilter(
	filter: CellOwnerFilter
): string | undefined {
	if (filter === CELL_OWNER_SENTINEL.ALL) return undefined
	if (filter === CELL_OWNER_SENTINEL.UNASSIGNED) return 'none'
	return String(filter)
}

export function cellOwnerFilterFromHeatmapRow(
	idUser: number | null
): CellOwnerFilter {
	return idUser == null ? CELL_OWNER_SENTINEL.UNASSIGNED : idUser
}

export function isAssignedOwner(filter: CellOwnerFilter): filter is number {
	return typeof filter === 'number'
}
