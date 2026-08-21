import { arrayMove } from '@dnd-kit/sortable'
import type { LeadFunnelColumn } from '@prisma/client'

export interface ReorderFunnelColumnsResult {
	columns: LeadFunnelColumn[]
	changed: LeadFunnelColumn[]
}

/**
 * Pure reorder calculation for drag & drop in `FunnelColumnsAdminTable`.
 *
 * Given the currently displayed columns and the dragged (`activeId`) and
 * drop-target (`overId`) row identifiers, moves the active column to the
 * over column's index (mirroring `arrayMove` semantics used by
 * `@dnd-kit/sortable`) and reassigns `position` sequentially (0..n-1) so it
 * matches array order. Only columns whose `position` actually changed are
 * returned in `changed`, so the caller can PATCH the minimal set of rows.
 *
 * No-op (`columns` returned by reference, `changed: []`) when the ids are
 * equal or either id is not found, so the caller can safely skip the PATCH
 * round trip entirely.
 */
export function reorderFunnelColumns(
	columns: LeadFunnelColumn[],
	activeId: number,
	overId: number
): ReorderFunnelColumnsResult {
	if (activeId === overId) {
		return { columns, changed: [] }
	}

	const oldIndex = columns.findIndex((c) => c.idLeadFunnelColumn === activeId)
	const newIndex = columns.findIndex((c) => c.idLeadFunnelColumn === overId)

	if (oldIndex === -1 || newIndex === -1) {
		return { columns, changed: [] }
	}

	const reordered = arrayMove(columns, oldIndex, newIndex).map((column, index) => ({
		...column,
		position: index,
	}))

	const changed = reordered.filter((column) => {
		const previous = columns.find(
			(c) => c.idLeadFunnelColumn === column.idLeadFunnelColumn
		)
		return previous?.position !== column.position
	})

	return { columns: reordered, changed }
}
