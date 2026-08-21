import { LeadCard } from '@/features/leads/components/lead-card'
import type { LeadBoardColumn } from '@/features/leads/types/lead.types'

interface LeadFunnelColumnViewProps {
	column: LeadBoardColumn
	onLeadClick?: (idLead: number) => void
}

/**
 * Presentational Kanban column. No drop target, no reorder handle — leads
 * only move columns via the CRM webhook, never through this UI.
 */
export function LeadFunnelColumnView({
	column,
	onLeadClick,
}: LeadFunnelColumnViewProps) {
	return (
		<div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border-2 border-[#00505c]/25 bg-[#00505c]/5">
			<div className="flex items-center justify-between gap-2 border-b-2 border-[#00505c]/25 bg-[#00505c] px-3 py-2.5">
				<h3 className="truncate text-sm font-semibold text-white">
					{column.name}
				</h3>
				<span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-[#00505c] shadow-sm">
					{column.leads.length}
				</span>
			</div>
			<div className="flex flex-col gap-2 p-3">
				{column.leads.map((lead) => (
					<LeadCard key={lead.idLead} lead={lead} onClick={onLeadClick} />
				))}
				{column.leads.length === 0 && (
					<p className="px-1 text-xs text-slate-600 dark:text-slate-400">
						Sin leads en esta columna
					</p>
				)}
			</div>
		</div>
	)
}
