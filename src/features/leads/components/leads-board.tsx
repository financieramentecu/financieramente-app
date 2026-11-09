'use client'

import * as React from 'react'
import { RefreshCw } from 'lucide-react'
import { useLeadsBoard } from '@/features/leads/hooks/use-leads-board'
import { LeadFunnelColumnView } from '@/features/leads/components/lead-funnel-column-view'
import { LeadFunnelColumnSkeleton } from '@/features/leads/components/lead-funnel-column-skeleton'
import { CrmLeadDetailSheet } from '@/features/leads/components/crm-lead-detail-sheet'
import { useLeadDetailSheet } from '@/features/leads/hooks/use-lead-detail-sheet'
import { CrmSummaryCards } from '@/features/leads/analytics/crm-summary-cards'
import { LeadsBoardFilters } from '@/features/leads/components/leads-board-filters'
import { getDefaultLeadBoardFilters } from '@/features/leads/lib/lead-board-filters'
import { Button } from '@/features/shared/ui/button'
import { cn } from '@/lib/utils'
import { useFeatureFlag } from '@/features/shared/hooks/use-feature-flag'

/**
 * Container component for the read-only Leads Kanban board.
 * Fetches columns via `useLeadsBoard(filters)`, renders `LeadsBoardFilters`
 * + `LeadFunnelColumnView` per column, and opens `CrmLeadDetailSheet` on card
 * click.
 */
export function LeadsBoard() {
	const { enabled: reportsEnabled } = useFeatureFlag('crm_reports')
	const [filters, setFilters] = React.useState(getDefaultLeadBoardFilters())
	const { state, refetch } = useLeadsBoard(filters)
	const isRefreshing = state.status === 'loading'
	const sheet = useLeadDetailSheet()

	function handleLeadDeleted() {
		sheet.setOpen(false)
		refetch()
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<LeadsBoardFilters value={filters} onChange={setFilters} />
				<Button
					variant="outline"
					size="sm"
					onClick={refetch}
					disabled={isRefreshing}
					aria-label="Actualizar tablero de leads"
				>
					<RefreshCw
						className={cn('size-4', isRefreshing && 'animate-spin')}
						aria-hidden
					/>
					Actualizar
				</Button>
			</div>
			<CrmSummaryCards enabled={reportsEnabled} />
			{(state.status === 'loading' || state.status === 'idle') && (
				<div className="flex gap-4 overflow-x-auto pb-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<LeadFunnelColumnSkeleton key={index} />
					))}
				</div>
			)}
			{state.status === 'error' && (
				<p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
					{state.error}
				</p>
			)}
			{state.status === 'success' && (
				<div className="flex gap-4 overflow-x-auto pb-4">
					{state.data.map((column) => (
						<LeadFunnelColumnView
							key={column.idLeadFunnelColumn}
							column={column}
							onLeadClick={(idLead) => void sheet.openLead(idLead)}
						/>
					))}
				</div>
			)}
			<CrmLeadDetailSheet
				lead={sheet.lead}
				open={sheet.open}
				onOpenChange={sheet.setOpen}
				onDeleted={handleLeadDeleted}
			/>
		</div>
	)
}
