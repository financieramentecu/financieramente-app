'use client'

import { Star } from 'lucide-react'
import { formatPercentDisplay } from '@/features/shared/lib/format-percent'
import { TrmDisplay } from '@/features/production-dashboard/components/TrmDisplay'
import type { TrmState } from '@/features/production-dashboard/types/trm.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { formatReportMoney } from '../lib/format-report-money'
import { PRODUCCION_REAL_UI } from '../lib/ui-copy'
import { CURRENCY_MODE, type ProduccionRealKpis } from '../types/produccion-real.types'
import { useProduccionRealFilter } from './produccion-real-filter-context'

interface ProduccionRealKpiCardsProps {
	readonly state: AsyncState<ProduccionRealKpis>
	readonly trmRate: number | null
	readonly trmState: TrmState
	readonly trmLoading: boolean
	readonly trmError: string
	readonly setManualTrm: (rate: number) => void
}

function KpiSkeleton() {
	return (
		<div
			className="flex flex-col gap-1.5 rounded-xl p-3"
			style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
			data-testid="produccion-real-kpi-skeleton"
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
	readonly count: number
	readonly footnote?: string
	readonly highlighted?: boolean
	readonly isLoading: boolean
}

function KpiCard({
	label,
	valueLabel,
	count,
	footnote,
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
			<p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
				{count}{' '}
				{count === 1
					? PRODUCCION_REAL_UI.NEGOCIO_SINGULAR
					: PRODUCCION_REAL_UI.NEGOCIOS_PLURAL}
			</p>
			{footnote ? (
				<p
					className="mt-0.5 text-sm font-semibold tabular-nums"
					style={{ color: 'rgba(255,255,255,0.85)' }}
				>
					{footnote}
				</p>
			) : null}
		</div>
	)
}

/**
 * KPI row: Producción Real, Regular, Único, Fondeado + conversion %.
 */
export function ProduccionRealKpiCards({
	state,
	trmRate,
	trmState,
	trmLoading,
	trmError,
	setManualTrm,
}: ProduccionRealKpiCardsProps) {
	const { applied } = useProduccionRealFilter()
	const isLoading = state.status === 'loading' || state.status === 'idle'
	const kpis = state.status === 'success' ? state.data : null
	const showTrm = applied.currencyMode === CURRENCY_MODE.ALL_TRM

	const money = (value: number) =>
		kpis
			? formatReportMoney(value, kpis.displayCurrencyCode)
			: null

	return (
		<section
			className="rounded-xl p-3 shadow-md"
			style={{ backgroundColor: '#003c45' }}
		>
			<div className="mb-2 flex items-center justify-between gap-4">
				<div>
					<h2 className="text-sm font-semibold text-white">
						{PRODUCCION_REAL_UI.PAGE_TITLE}
					</h2>
					<p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
						{applied.dateFrom} → {applied.dateTo}
					</p>
				</div>
				{showTrm ? (
					<TrmDisplay
						compact
						trmState={trmState}
						trmRate={trmRate}
						isLoading={trmLoading}
						error={trmError}
						onManualTrm={setManualTrm}
					/>
				) : null}
			</div>

			{state.status === 'error' ? (
				<p className="mb-2 text-xs text-red-200" role="alert">
					{state.error}
				</p>
			) : null}

			{showTrm && trmState === 'error' && !trmLoading ? (
				<div className="mb-2">
					<TrmDisplay
						trmState={trmState}
						trmRate={trmRate}
						isLoading={false}
						error={trmError}
						onManualTrm={setManualTrm}
					/>
				</div>
			) : null}

			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
				<KpiCard
					label={PRODUCCION_REAL_UI.KPI_PRODUCCION_REAL}
					valueLabel={kpis ? money(kpis.produccionReal.sum) : null}
					count={kpis?.produccionReal.count ?? 0}
					highlighted
					isLoading={isLoading}
				/>
				<KpiCard
					label={PRODUCCION_REAL_UI.KPI_REGULAR}
					valueLabel={kpis ? money(kpis.regular.sum) : null}
					count={kpis?.regular.count ?? 0}
					isLoading={isLoading}
				/>
				<KpiCard
					label={PRODUCCION_REAL_UI.KPI_UNICO}
					valueLabel={kpis ? money(kpis.unico.sum) : null}
					count={kpis?.unico.count ?? 0}
					isLoading={isLoading}
				/>
				<KpiCard
					label={PRODUCCION_REAL_UI.KPI_FONDEADO}
					valueLabel={kpis ? money(kpis.fondeado.sum) : null}
					count={kpis?.fondeado.count ?? 0}
					footnote={
						kpis
							? `${PRODUCCION_REAL_UI.KPI_CONVERSION}: ${formatPercentDisplay(kpis.fondeado.conversionPercent)}`
							: undefined
					}
					isLoading={isLoading}
				/>
			</div>
		</section>
	)
}
