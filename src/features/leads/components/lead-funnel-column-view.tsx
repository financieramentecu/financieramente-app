import { Fragment, type ReactNode } from 'react'
import { LeadCard } from '@/features/leads/components/lead-card'
import type { LeadBoardColumn, LeadCard as LeadCardType } from '@/features/leads/types/lead.types'
import { cn } from '@/lib/utils'

interface LeadFunnelColumnViewProps {
	column: LeadBoardColumn
	onLeadClick?: (idLead: number) => void
	renderLead?: (lead: LeadCardType) => ReactNode
	dropRef?: (node: HTMLElement | null) => void
	isDropTarget?: boolean
}

/**
 * Presentational Kanban column. Drag and drop is provided by the board
 * through `dropRef` and `renderLead`.
 */
export function LeadFunnelColumnView({
	column,
	onLeadClick,
	renderLead,
	dropRef,
	isDropTarget = false,
}: LeadFunnelColumnViewProps) {
	return (
		<div
			ref={dropRef}
			className={cn(
				'flex min-h-80 w-72 shrink-0 flex-col overflow-hidden rounded-lg border-2 border-primary/25 bg-primary/5',
				isDropTarget && 'ring-2 ring-primary ring-offset-2'
			)}
		>
			<div className="flex items-center justify-between gap-2 border-b-2 border-primary/25 bg-primary px-3 py-2.5">
				<h3 className="truncate text-sm font-semibold text-white">
					{column.name}
				</h3>
				<span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-primary shadow-sm">
					{column.leads.length}
				</span>
			</div>
			<div className="flex min-h-64 flex-1 flex-col gap-2 p-3">
				{column.leads.map((lead) =>
					renderLead ? (
						<Fragment key={lead.idLead}>{renderLead(lead)}</Fragment>
					) : (
						<LeadCard key={lead.idLead} lead={lead} onClick={onLeadClick} />
					)
				)}
				{column.leads.length === 0 && (
					<p className="px-1 text-xs text-slate-600 dark:text-slate-400">
						Sin leads en esta columna
					</p>
				)}
			</div>
		</div>
	)
}
