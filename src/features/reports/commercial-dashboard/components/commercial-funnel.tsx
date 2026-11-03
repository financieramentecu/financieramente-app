'use client'

import type { AsyncState } from '@/features/shared/types/async-state.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { formatRatio } from '../lib/format'
import { COMMERCIAL_DASHBOARD_UI as UI } from '../lib/ui-copy'
import type { CommercialDashboardReport } from '../types/commercial-dashboard.types'

interface CommercialFunnelProps {
	readonly state: AsyncState<CommercialDashboardReport>
}

export function CommercialFunnel({ state }: CommercialFunnelProps) {
	const isLoading = state.status === 'loading' || state.status === 'idle'
	const steps = state.status === 'success' ? state.data.funnel : []
	const top = steps[0]?.count ?? 0

	return (
		<Card className="border border-border shadow-sm">
			<CardHeader className="px-4 pb-2 pt-3">
				<CardTitle className="text-sm font-semibold">{UI.FUNNEL_TITLE}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3 px-4 pb-4">
				{isLoading ? (
					<div className="h-40 animate-pulse rounded bg-muted" />
				) : top === 0 ? (
					<EmptyState title={UI.FUNNEL_EMPTY} />
				) : (
					steps.map((step) => (
						<div
							key={step.key}
							className="grid grid-cols-[8rem_1fr_6rem] items-center gap-3 text-sm"
						>
							<span className="text-foreground">{step.label}</span>
							<div className="h-5 overflow-hidden rounded-md bg-muted">
								<div
									className="h-full rounded-md transition-[width] duration-500"
									style={{
										width: `${top === 0 ? 0 : (step.count / top) * 100}%`,
										background:
											'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))',
									}}
								/>
							</div>
							<span className="text-right tabular-nums text-foreground">
								{step.count}{' '}
								<span className="text-xs text-muted-foreground">
									{formatRatio(step.count, top)}
								</span>
							</span>
						</div>
					))
				)}
			</CardContent>
		</Card>
	)
}
