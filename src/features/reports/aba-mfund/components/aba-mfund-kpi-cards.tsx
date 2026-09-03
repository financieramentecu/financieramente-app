'use client'

import { Star } from 'lucide-react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { formatAbaMfundMoney } from '../lib/format-aba-mfund-money'
import { ABA_MFUND_UI } from '../lib/ui-copy'
import type { AbaMfundKpis } from '../types/aba-mfund.types'
import { useAbaMfundFilter } from './aba-mfund-filter-context'

interface AbaMfundKpiCardsProps {
	readonly state: AsyncState<AbaMfundKpis>
}

function KpiSkeleton() {
	return (
		<div
			className="flex flex-col gap-1.5 rounded-xl p-3"
			style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
			data-testid="aba-mfund-kpi-skeleton"
		>
			<div
				className="h-2.5 w-20 animate-pulse rounded"
				style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
			/>
			<div
				className="h-6 w-28 animate-pulse rounded"
				style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
			/>
			<div
				className="h-2.5 w-16 animate-pulse rounded"
				style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
			/>
		</div>
	)
}

interface KpiCardProps {
	readonly label: string
	readonly valueLabel: string | null
	readonly count?: number
	readonly highlighted?: boolean
	readonly isLoading: boolean
}

function KpiCard({
	label,
	valueLabel,
	count,
	highlighted,
	isLoading,
}: KpiCardProps) {
	if (isLoading) return <KpiSkeleton />

	return (
		<div
			className="flex flex-col rounded-xl p-3"
			style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
		>
			<p
				className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide"
				style={{ color: 'rgba(255,255,255,0.65)' }}
			>
				{highlighted ? (
					<Star className="size-3 fill-amber-300 text-amber-300" />
				) : null}
				{label}
			</p>
			{valueLabel === null ? (
				<p className="text-xl font-bold text-white">—</p>
			) : (
				<p className="text-xl font-bold tabular-nums text-white">{valueLabel}</p>
			)}
			{count != null ? (
				<p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
					{count}{' '}
					{count === 1
						? ABA_MFUND_UI.BUSINESS_SINGULAR
						: ABA_MFUND_UI.BUSINESS_PLURAL}
				</p>
			) : null}
		</div>
	)
}

/**
 * KPI row: ABA Total, Fondeado, Emitido, Ticket promedio ABA (COP only).
 */
export function AbaMfundKpiCards({ state }: AbaMfundKpiCardsProps) {
	const { applied } = useAbaMfundFilter()
	const isLoading = state.status === 'loading' || state.status === 'idle'
	const kpis = state.status === 'success' ? state.data : null

	const money = (value: number) => (kpis ? formatAbaMfundMoney(value) : null)

	return (
		<section
			className="rounded-xl p-3 shadow-md"
			style={{ backgroundColor: '#003c45' }}
		>
			<div className="mb-2">
				<h2 className="text-sm font-semibold text-white">
					{ABA_MFUND_UI.PAGE_TITLE}
				</h2>
				<p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
					{applied.dateFrom} → {applied.dateTo}
				</p>
			</div>

			{state.status === 'error' ? (
				<p className="mb-2 text-xs text-red-200" role="alert">
					{state.error}
				</p>
			) : null}

			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
				<KpiCard
					label={ABA_MFUND_UI.KPI_ABA_TOTAL}
					valueLabel={kpis ? money(kpis.abaTotal.sum) : null}
					count={kpis?.abaTotal.count ?? 0}
					highlighted
					isLoading={isLoading}
				/>
				<KpiCard
					label={ABA_MFUND_UI.KPI_FONDEADO}
					valueLabel={kpis ? money(kpis.fondeado.sum) : null}
					count={kpis?.fondeado.count ?? 0}
					isLoading={isLoading}
				/>
				<KpiCard
					label={ABA_MFUND_UI.KPI_EMITIDO}
					valueLabel={kpis ? money(kpis.emitido.sum) : null}
					count={kpis?.emitido.count ?? 0}
					isLoading={isLoading}
				/>
				<KpiCard
					label={ABA_MFUND_UI.KPI_TICKET_PROMEDIO}
					valueLabel={kpis ? money(kpis.ticketPromedio) : null}
					isLoading={isLoading}
				/>
			</div>
		</section>
	)
}
