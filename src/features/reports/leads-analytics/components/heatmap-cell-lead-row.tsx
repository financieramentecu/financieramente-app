'use client'

import { Badge } from '@/features/shared/ui/badge'
import { LEAD_OUTCOME_STATUS_BADGE_VARIANTS } from '@/features/leads/lib/lead-outcome-status'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type { CellLeadRowView } from '../types/heatmap-cell-leads.types'

interface HeatmapCellLeadRowProps {
	readonly lead: CellLeadRowView
	readonly onViewLead: (idLead: number) => void
}

/**
 * One expanded funnel-cell lead row. Presentation only.
 */
export function HeatmapCellLeadRow({
	lead,
	onViewLead,
}: HeatmapCellLeadRowProps) {
	return (
		<tr className="border-b border-border/60 last:border-none hover:bg-muted/30">
			<td className="px-2 py-1.5 text-xs font-medium">{lead.leadName}</td>
			<td className="px-2 py-1.5 text-xs">{lead.ownerName}</td>
			<td className="px-2 py-1.5 text-xs">
				<Badge
					variant={LEAD_OUTCOME_STATUS_BADGE_VARIANTS[lead.outcomeStatus]}
					className="text-[11px]"
				>
					{lead.outcomeLabel}
				</Badge>
			</td>
			<td className="px-2 py-1.5 text-xs whitespace-nowrap text-muted-foreground">
				{lead.createdAtLabel}
			</td>
			<td className="px-2 py-1.5 text-right text-xs whitespace-nowrap align-middle">
				<div className="flex flex-nowrap items-center justify-end gap-3">
					{lead.idBusiness != null ? (
						<a
							href={`/dashboard/negocios/${lead.idBusiness}`}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80 hover:underline"
						>
							{LEADS_ANALYTICS_UI.VIEW_BUSINESS}
							<span aria-hidden="true">↗</span>
						</a>
					) : null}
					<button
						type="button"
						onClick={() => onViewLead(lead.idLead)}
						className="font-medium text-primary hover:underline"
					>
						{LEADS_ANALYTICS_UI.VIEW_LEAD}
					</button>
				</div>
			</td>
		</tr>
	)
}
