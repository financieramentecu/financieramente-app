'use client'

import * as React from 'react'
import { Button } from '@/features/shared/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { formatLeadAmount } from '@/features/leads/table/format-lead-amount'
import { CrmStageDetailSection } from '@/features/leads/reports/crm-stage-detail-section'
import { buildCrmReportExportUrl } from '@/features/leads/reports/crm-report-api'
import {
	formatReportDays,
	formatReportRate,
} from '@/features/leads/reports/format-report-rate'
import { useCrmPipelineReport } from '@/features/leads/reports/use-crm-pipeline-report'
import type {
	CrmPipelineReport,
	CrmReportBreakdownRow,
	CrmReportRange,
} from '@/features/leads/reports/crm-pipeline-report.types'

type BreakdownKind = 'byOrigin' | 'byAdvisor' | 'byTeam'

const BREAKDOWNS: ReadonlyArray<{
	kind: BreakdownKind
	label: string
	column: string
}> = [
	{ kind: 'byOrigin', label: 'Origen', column: 'Origen' },
	{ kind: 'byAdvisor', label: 'Asesor', column: 'Asesor' },
	{ kind: 'byTeam', label: 'Equipo', column: 'Líder del equipo' },
]

const count = new Intl.NumberFormat('es-CO')

function RangeForm({
	initial,
	onApply,
}: {
	initial: CrmReportRange | null
	onApply: (range: CrmReportRange) => void
}) {
	const [from, setFrom] = React.useState(initial?.from ?? '')
	const [to, setTo] = React.useState(initial?.to ?? '')

	return (
		<form
			className="flex flex-wrap items-end gap-3"
			onSubmit={(event) => {
				event.preventDefault()
				if (from && to) onApply({ from, to })
			}}
		>
			<div className="space-y-1">
				<Label htmlFor="crm-report-from">Desde</Label>
				<Input
					id="crm-report-from"
					type="date"
					value={from}
					onChange={(event) => setFrom(event.target.value)}
				/>
			</div>
			<div className="space-y-1">
				<Label htmlFor="crm-report-to">Hasta</Label>
				<Input
					id="crm-report-to"
					type="date"
					value={to}
					onChange={(event) => setTo(event.target.value)}
				/>
			</div>
			<Button type="submit" disabled={!from || !to}>
				Aplicar
			</Button>
			<p className="text-xs text-muted-foreground">
				Leads creados en el rango (hora de Bogotá).
			</p>
		</form>
	)
}

function Kpi({
	label,
	value,
	hint,
}: {
	label: string
	value: string
	hint?: string
}) {
	return (
		<Card>
			<CardContent className="space-y-1 p-4">
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="text-2xl font-semibold">{value}</p>
				{hint && <p className="text-xs text-muted-foreground">{hint}</p>}
			</CardContent>
		</Card>
	)
}

function Kpis({ report }: { report: CrmPipelineReport }) {
	const { outcomes, forecast } = report
	return (
		<section
			aria-label="Indicadores"
			className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
		>
			<Kpi
				label="Leads"
				value={count.format(outcomes.total)}
				hint={`${count.format(outcomes.open)} abiertos`}
			/>
			<Kpi
				label="Ganados"
				value={count.format(outcomes.won)}
				hint={`${count.format(outcomes.lost)} perdidos · ${count.format(outcomes.abandoned)} abandonados`}
			/>
			<Kpi
				label="Tasa de cierre"
				value={formatReportRate(outcomes.winRate)}
				hint="Ganados sobre cerrados"
			/>
			<Kpi
				label="Conversión"
				value={formatReportRate(outcomes.conversionRate)}
				hint="Ganados sobre el total"
			/>
			<Kpi
				label="Pronóstico ponderado"
				value={formatLeadAmount(forecast.totals.weightedValue)}
				hint={`Valor estimado ${formatLeadAmount(forecast.totals.estimatedValue)}`}
			/>
		</section>
	)
}

function Section({
	title,
	children,
}: {
	title: string
	children: React.ReactNode
}) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-base">{title}</CardTitle>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	)
}

function Funnel({ report }: { report: CrmPipelineReport }) {
	const top = report.funnel[0]?.reached ?? 0
	if (report.funnel.length === 0)
		return (
			<p className="text-sm text-muted-foreground">
				No hay etapas configuradas.
			</p>
		)
	return (
		<ol className="space-y-3">
			{report.funnel.map((stage) => (
				<li key={stage.idLeadFunnelColumn} className="space-y-1">
					<div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
						<span className="font-medium">{stage.name}</span>
						<span className="text-muted-foreground">
							{count.format(stage.reached)} leads
							{stage.conversionFromPrevious !== null && (
								<span className="ml-2">
									{formatReportRate(stage.conversionFromPrevious)} desde la
									etapa anterior
								</span>
							)}
						</span>
					</div>
					<div className="h-2 rounded-full bg-muted">
						<div
							className="h-2 rounded-full bg-primary"
							style={{
								width: `${top === 0 ? 0 : Math.max(2, (stage.reached / top) * 100)}%`,
							}}
						/>
					</div>
				</li>
			))}
		</ol>
	)
}

const cellClass = 'px-3 py-2 text-left'
const numberClass = 'px-3 py-2 text-right tabular-nums'

function DataTable({
	head,
	children,
}: {
	head: React.ReactNode
	children: React.ReactNode
}) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead className="border-b text-xs text-muted-foreground">{head}</thead>
				<tbody className="divide-y">{children}</tbody>
			</table>
		</div>
	)
}

function StageDurations({ report }: { report: CrmPipelineReport }) {
	return (
		<DataTable
			head={
				<tr>
					<th className={cellClass}>Etapa</th>
					<th className={numberClass}>Promedio (días)</th>
					<th className={numberClass}>Mediana (días)</th>
					<th className={numberClass}>Leads medidos</th>
				</tr>
			}
		>
			{report.stageDurations.map((row) => (
				<tr key={row.idLeadFunnelColumn}>
					<td className={cellClass}>{row.name}</td>
					<td className={numberClass}>{formatReportDays(row.averageDays)}</td>
					<td className={numberClass}>{formatReportDays(row.medianDays)}</td>
					<td className={numberClass}>{count.format(row.samples)}</td>
				</tr>
			))}
		</DataTable>
	)
}

function BreakdownTable({
	rows,
	column,
}: {
	rows: readonly CrmReportBreakdownRow[]
	column: string
}) {
	return (
		<DataTable
			head={
				<tr>
					<th className={cellClass}>{column}</th>
					<th className={numberClass}>Leads</th>
					<th className={numberClass}>Abiertos</th>
					<th className={numberClass}>Ganados</th>
					<th className={numberClass}>Perdidos</th>
					<th className={numberClass}>Tasa de cierre</th>
					<th className={numberClass}>Valor estimado</th>
					<th className={numberClass}>Valor ponderado</th>
				</tr>
			}
		>
			{rows.map((row) => (
				<tr key={row.key}>
					<td className={cellClass}>{row.label}</td>
					<td className={numberClass}>{count.format(row.total)}</td>
					<td className={numberClass}>{count.format(row.open)}</td>
					<td className={numberClass}>{count.format(row.won)}</td>
					<td className={numberClass}>{count.format(row.lost)}</td>
					<td className={numberClass}>{formatReportRate(row.winRate)}</td>
					<td className={numberClass}>
						{formatLeadAmount(row.estimatedValue)}
					</td>
					<td className={numberClass}>{formatLeadAmount(row.weightedValue)}</td>
				</tr>
			))}
		</DataTable>
	)
}

function Breakdowns({ report }: { report: CrmPipelineReport }) {
	const [kind, setKind] = React.useState<BreakdownKind>('byOrigin')
	const active = BREAKDOWNS.find((option) => option.kind === kind)!
	return (
		<div className="space-y-3">
			<div className="flex gap-2" role="group" aria-label="Agrupar por">
				{BREAKDOWNS.map((option) => (
					<Button
						key={option.kind}
						type="button"
						size="sm"
						variant={option.kind === kind ? 'default' : 'outline'}
						aria-pressed={option.kind === kind}
						onClick={() => setKind(option.kind)}
					>
						{option.label}
					</Button>
				))}
			</div>
			<BreakdownTable rows={report[kind]} column={active.column} />
		</div>
	)
}

function Forecast({ report }: { report: CrmPipelineReport }) {
	const { stages, totals } = report.forecast
	if (stages.length === 0)
		return (
			<p className="text-sm text-muted-foreground">
				No hay leads abiertos en este rango.
			</p>
		)
	return (
		<DataTable
			head={
				<tr>
					<th className={cellClass}>Etapa</th>
					<th className={numberClass}>Leads abiertos</th>
					<th className={numberClass}>Con valor</th>
					<th className={numberClass}>Valor estimado</th>
					<th className={numberClass}>Valor ponderado</th>
				</tr>
			}
		>
			{stages.map((stage) => (
				<tr key={stage.idLeadFunnelColumn}>
					<td className={cellClass}>{stage.name}</td>
					<td className={numberClass}>{count.format(stage.openLeads)}</td>
					<td className={numberClass}>{count.format(stage.valuedLeads)}</td>
					<td className={numberClass}>
						{formatLeadAmount(stage.estimatedValue)}
					</td>
					<td className={numberClass}>
						{formatLeadAmount(stage.weightedValue)}
					</td>
				</tr>
			))}
			<tr className="font-medium">
				<td className={cellClass}>Total</td>
				<td className={numberClass}>{count.format(totals.openLeads)}</td>
				<td className={numberClass}>{count.format(totals.valuedLeads)}</td>
				<td className={numberClass}>
					{formatLeadAmount(totals.estimatedValue)}
				</td>
				<td className={numberClass}>
					{formatLeadAmount(totals.weightedValue)}
				</td>
			</tr>
		</DataTable>
	)
}

function ReportBody({ report }: { report: CrmPipelineReport }) {
	if (report.outcomes.total === 0) {
		return (
			<p className="py-8 text-center text-sm text-muted-foreground">
				No hay leads creados en este rango de fechas.
			</p>
		)
	}
	return (
		<div className="space-y-4">
			<Kpis report={report} />
			<div className="grid gap-4 lg:grid-cols-2">
				<Section title="Embudo de conversión">
					<Funnel report={report} />
				</Section>
				<Section title="Tiempo promedio en cada etapa">
					<StageDurations report={report} />
				</Section>
			</div>
			<Section title="Leads por origen, asesor y equipo">
				<Breakdowns report={report} />
			</Section>
			<Section title="Pronóstico del pipeline abierto">
				<Forecast report={report} />
			</Section>
		</div>
	)
}

/** CRM "Reportes" tab: funnel, rates, time per stage, breakdowns and weighted forecast. */
export function CrmReports() {
	const { state, range, load } = useCrmPipelineReport()
	const [appliedRange, setAppliedRange] = React.useState<CrmReportRange | null>(null)

	return (
		<div className="space-y-4">
			{/* Remount when the served range changes so the inputs show it. */}
			<RangeForm
				key={range ? `${range.from}:${range.to}` : 'none'}
				initial={range}
				onApply={(next) => {
					setAppliedRange(next)
					void load(next)
				}}
			/>
			{state.status === 'loading' && (
				<div className="space-y-3" aria-busy="true">
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-64 w-full" />
				</div>
			)}
			{state.status === 'error' && (
				<p
					role="alert"
					className="rounded-md border border-destructive/40 p-3 text-sm text-destructive"
				>
					{state.error}
				</p>
			)}
			{state.status === 'success' && (
				<div className="flex flex-wrap gap-2">
					<Button asChild variant="outline" size="sm">
						<a href={buildCrmReportExportUrl(state.data.range, 'xlsx')}>
							Exportar Excel
						</a>
					</Button>
					<Button asChild variant="outline" size="sm">
						<a href={buildCrmReportExportUrl(state.data.range, 'pdf')}>
							Exportar PDF
						</a>
					</Button>
				</div>
			)}
			{state.status === 'success' && <ReportBody report={state.data} />}
			<CrmStageDetailSection range={appliedRange} />
		</div>
	)
}
