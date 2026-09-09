'use client'

import * as React from 'react'
import { RefreshCw } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { UserRole } from '@/features/auth/lib/roles'
import { useLeadsBoard } from '@/features/leads/hooks/use-leads-board'
import { LeadFunnelColumnView } from '@/features/leads/components/lead-funnel-column-view'
import { LeadFunnelColumnSkeleton } from '@/features/leads/components/lead-funnel-column-skeleton'
import { LeadDetailSheet } from '@/features/leads/components/lead-detail-sheet'
import { LeadsBoardFilters } from '@/features/leads/components/leads-board-filters'
import { getDefaultLeadBoardFilters } from '@/features/leads/lib/lead-board-filters'
import { Button } from '@/features/shared/ui/button'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadDetail } from '@/features/leads/types/lead.types'

/**
 * Container component for the read-only Leads Kanban board.
 * Fetches columns via `useLeadsBoard(filters)`, renders `LeadsBoardFilters`
 * + `LeadFunnelColumnView` per column, and opens `LeadDetailSheet` on card
 * click.
 */
export function LeadsBoard() {
	const { data: session } = useSession()
	const isAdmin = session?.user?.role === UserRole.ADMIN
	const [filters, setFilters] = React.useState(getDefaultLeadBoardFilters())
	const { state, refetch } = useLeadsBoard(filters)
	const isRefreshing = state.status === 'loading'
	const [selectedLead, setSelectedLead] = React.useState<LeadDetail | null>(
		null
	)
	const [sheetOpen, setSheetOpen] = React.useState(false)

	const handleLeadDeleted = React.useCallback(() => {
		setSheetOpen(false)
		refetch()
	}, [refetch])

	const handleLeadClick = React.useCallback(async (idLead: number) => {
		try {
			const response = await fetch(`/api/leads/${idLead}`)
			const body: ApiResponse<LeadDetail> = await response.json()
			if (!('error' in body)) {
				setSelectedLead(body.data)
				setSheetOpen(true)
			}
		} catch {
			// Silently ignore — detail sheet simply won't open
		}
	}, [])

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
							onLeadClick={handleLeadClick}
						/>
					))}
				</div>
			)}
			<LeadDetailSheet
				lead={selectedLead}
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				isAdmin={isAdmin}
				onDeleted={handleLeadDeleted}
			/>
		</div>
	)
}
