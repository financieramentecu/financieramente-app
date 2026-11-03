'use client'

import type { ReactElement } from 'react'
import {
	Bar,
	BarChart,
	CartesianGrid,
	LabelList,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { COMMERCIAL_DASHBOARD_UI as UI } from '../lib/ui-copy'
import type { CommercialDashboardReport } from '../types/commercial-dashboard.types'

type ReportState = AsyncState<CommercialDashboardReport>

const AXIS_TICK = { fontSize: 11, fill: '#64748b' }
const GRID_STROKE = '#e2e8f0'
const LABEL_WIDTH = 170
const ROW_HEIGHT = 34

const SERIES_COLOR = {
	won: '#059669',
	proposal: '#93c5fd',
} as const

/** Height for a horizontal bar chart with `rows` categories and `series` bars each. */
function chartHeight(rows: number, series: number): number {
	return Math.max(160, rows * ROW_HEIGHT * Math.max(1, series * 0.6) + 48)
}

const pct = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 100))

interface ChartCardProps {
	readonly title: string
	readonly subtitle: string
	readonly isLoading: boolean
	readonly isEmpty: boolean
	readonly emptyTitle: string
	readonly height: number
	/** A single Recharts chart, as ResponsiveContainer requires. */
	readonly children: ReactElement
}

function ChartCard({ title, subtitle, isLoading, isEmpty, emptyTitle, height, children }: ChartCardProps) {
	return (
		<Card className="border border-border shadow-sm">
			<CardHeader className="px-4 pb-2 pt-3">
				<CardTitle className="text-sm font-semibold">{title}</CardTitle>
				<p className="text-xs text-muted-foreground">{subtitle}</p>
			</CardHeader>
			<CardContent className="px-4 pb-4">
				{isLoading ? (
					<div className="h-56 animate-pulse rounded bg-muted" />
				) : isEmpty ? (
					<EmptyState title={emptyTitle} />
				) : (
					<div style={{ height }} role="img" aria-label={title}>
						<ResponsiveContainer width="100%" height="100%">
							{children}
						</ResponsiveContainer>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

const isLoadingState = (state: ReportState) => state.status === 'loading' || state.status === 'idle'

/** % of each origin's leads that reached proposal and won. */
export function CommercialConversionChart({ state }: { readonly state: ReportState }) {
	const rows =
		state.status === 'success'
			? state.data.origins.map((r) => ({
					origin: r.origin,
					won: pct(r.won, r.leads),
					proposal: pct(r.proposals, r.leads),
				}))
			: []

	return (
		<ChartCard
			title={UI.CONVERSION_CHART_TITLE}
			subtitle={UI.CONVERSION_CHART_SUBTITLE}
			isLoading={isLoadingState(state)}
			isEmpty={rows.length === 0}
			emptyTitle={UI.ORIGINS_EMPTY}
			height={chartHeight(rows.length, 2)}
		>
			<BarChart data={rows} layout="vertical" margin={{ top: 4, right: 36, bottom: 0, left: 0 }}>
				<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
				<XAxis type="number" unit="%" tick={AXIS_TICK} domain={[0, 'auto']} />
				<YAxis type="category" dataKey="origin" width={LABEL_WIDTH} tick={AXIS_TICK} />
				<Tooltip formatter={(value) => `${value}%`} contentStyle={{ fontSize: 12 }} />
				<Legend wrapperStyle={{ fontSize: 11 }} />
				<Bar dataKey="proposal" name={UI.SERIES_PROPOSAL_RATE} fill={SERIES_COLOR.proposal} />
				<Bar dataKey="won" name={UI.SERIES_WON_RATE} fill={SERIES_COLOR.won}>
					<LabelList dataKey="won" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 11, fill: '#065f46' }} />
				</Bar>
			</BarChart>
		</ChartCard>
	)
}

/** Mean days from lead to won, per origin with data. */
export function CommercialCloseTimesChart({ state }: { readonly state: ReportState }) {
	const rows =
		state.status === 'success'
			? state.data.origins
					.filter((r) => r.avgDaysToWon !== null)
					.map((r) => ({ origin: r.origin, won: r.avgDaysToWon }))
			: []

	return (
		<ChartCard
			title={UI.TIMES_CHART_TITLE}
			subtitle={UI.TIMES_CHART_SUBTITLE}
			isLoading={isLoadingState(state)}
			isEmpty={rows.length === 0}
			emptyTitle={UI.TIMES_EMPTY}
			height={chartHeight(rows.length, 1)}
		>
			<BarChart data={rows} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 0 }}>
				<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
				<XAxis type="number" tick={AXIS_TICK} allowDecimals={false} />
				<YAxis type="category" dataKey="origin" width={LABEL_WIDTH} tick={AXIS_TICK} />
				<Tooltip formatter={(value) => `${value} ${UI.DAYS}`} contentStyle={{ fontSize: 12 }} />
				<Bar dataKey="won" name={UI.SERIES_DAYS_TO_WON} fill={SERIES_COLOR.won}>
					<LabelList dataKey="won" position="right" formatter={(v) => (v == null ? '' : `${v} d`)} style={{ fontSize: 11 }} />
				</Bar>
			</BarChart>
		</ChartCard>
	)
}

const RANKING_SIZE = 10

/** Top Money Strategists by won leads, labelled with their win rate. */
export function CommercialMsRankingChart({ state }: { readonly state: ReportState }) {
	const rows =
		state.status === 'success'
			? [...state.data.msRows]
					.filter((r) => r.won > 0)
					.sort((a, b) => b.won - a.won || b.leads - a.leads)
					.slice(0, RANKING_SIZE)
					.map((r) => ({
						name: r.ownerName,
						won: r.won,
						label: `${r.won} · ${pct(r.won, r.leads)}%`,
					}))
			: []

	return (
		<ChartCard
			title={UI.RANKING_CHART_TITLE}
			subtitle={UI.RANKING_CHART_SUBTITLE}
			isLoading={isLoadingState(state)}
			isEmpty={rows.length === 0}
			emptyTitle={UI.RANKING_EMPTY}
			height={chartHeight(rows.length, 1)}
		>
			<BarChart data={rows} layout="vertical" margin={{ top: 4, right: 64, bottom: 0, left: 0 }}>
				<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
				<XAxis type="number" tick={AXIS_TICK} allowDecimals={false} />
				<YAxis type="category" dataKey="name" width={LABEL_WIDTH} tick={AXIS_TICK} />
				<Tooltip contentStyle={{ fontSize: 12 }} />
				<Bar dataKey="won" name={UI.SERIES_WON} fill={SERIES_COLOR.won}>
					<LabelList dataKey="label" position="right" style={{ fontSize: 11, fill: '#065f46' }} />
				</Bar>
			</BarChart>
		</ChartCard>
	)
}
