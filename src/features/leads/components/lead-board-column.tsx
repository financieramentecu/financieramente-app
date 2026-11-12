'use client'

import { useDraggable, useDroppable } from '@dnd-kit/core'
import { LeadCard } from '@/features/leads/components/lead-card'
import { LeadFunnelColumnView } from '@/features/leads/components/lead-funnel-column-view'
import type { LeadBoardColumn, LeadCard as LeadCardType } from '@/features/leads/types/lead.types'

function DraggableLeadCard({
	lead,
	onClick,
}: {
	lead: LeadCardType
	onClick?: (idLead: number) => void
}) {
	const { listeners, setNodeRef, isDragging } = useDraggable({
		id: `lead:${lead.idLead}`,
	})
	return (
		<div
			ref={setNodeRef}
			className={isDragging ? 'cursor-grabbing opacity-40' : 'cursor-grab touch-none'}
			{...listeners}
		>
			<LeadCard lead={lead} onClick={onClick} />
		</div>
	)
}

/** One pipeline column that accepts a dragged lead and renders draggable cards. */
export function LeadBoardColumn({
	column,
	onLeadClick,
}: {
	column: LeadBoardColumn
	onLeadClick: (idLead: number) => void
}) {
	const { setNodeRef, isOver } = useDroppable({ id: `column:${column.idLeadFunnelColumn}` })
	return (
		<LeadFunnelColumnView
			column={column}
			dropRef={setNodeRef}
			isDropTarget={isOver}
			renderLead={(lead) => <DraggableLeadCard lead={lead} onClick={onLeadClick} />}
		/>
	)
}
