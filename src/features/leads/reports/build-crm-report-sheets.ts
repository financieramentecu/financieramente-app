import { formatStageDuration } from '@/features/leads/lib/format-stage-duration'
import {
	formatReportDays,
	formatReportRate,
} from '@/features/leads/reports/format-report-rate'
import type { CrmPipelineReport } from '@/features/leads/reports/crm-pipeline-report.types'
import type { CrmStageDetailRow } from '@/features/leads/reports/crm-stage-detail.types'
import { formatLeadAmount } from '@/features/leads/table/format-lead-amount'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'

export const CRM_REPORT_PDF_DETAIL_LIMIT = 1_500

export interface CrmReportSheet {
	name: string
	rows: string[][]
}

export interface BuildCrmReportSheetsOptions {
	detailLimit?: number
}

const count = new Intl.NumberFormat('es-CO')

function days(value: number | null): string {
	return formatReportDays(value)
}

function rate(value: number | null): string {
	return formatReportRate(value)
}

function money(value: string | null): string {
	return formatLeadAmount(value)
}

function detailRows(
	rows: readonly CrmStageDetailRow[],
	limit: number | undefined
): string[][] {
	const visible = limit === undefined ? rows : rows.slice(0, limit)
	const body = visible.map((row) => [
		row.advisorName,
		row.leadName,
		row.stageName,
		formatDateTimeBogota(row.enteredAt),
		row.leftAt ? formatDateTimeBogota(row.leftAt) : 'En curso',
		formatStageDuration(row.durationMs),
		row.current ? 'En curso' : 'Finalizada',
	])
	if (limit !== undefined && rows.length > limit) {
		body.push([
			`El PDF incluye las primeras ${count.format(limit)} permanencias de ${count.format(rows.length)}. El Excel trae el detalle completo.`,
		])
	}
	return body
}

/** Tabular sheets shared by the Excel workbook and the PDF. */
export function buildCrmReportSheets(
	report: CrmPipelineReport,
	detail: readonly CrmStageDetailRow[],
	options: BuildCrmReportSheetsOptions = {}
): CrmReportSheet[] {
	const { outcomes, forecast } = report
	return [
		{
			name: 'Resumen',
			rows: [
				['Indicador', 'Valor'],
				['Desde', report.range.from],
				['Hasta', report.range.to],
				['Leads', count.format(outcomes.total)],
				['Abiertos', count.format(outcomes.open)],
				['Ganados', count.format(outcomes.won)],
				['Perdidos', count.format(outcomes.lost)],
				['Abandonados', count.format(outcomes.abandoned)],
				['Tasa de cierre', rate(outcomes.winRate)],
				['Conversión', rate(outcomes.conversionRate)],
				['Valor estimado', money(forecast.totals.estimatedValue)],
				['Valor ponderado', money(forecast.totals.weightedValue)],
			],
		},
		{
			name: 'Embudo',
			rows: [
				['Etapa', 'Leads', 'Desde la etapa anterior'],
				...report.funnel.map((stage) => [
					stage.name,
					count.format(stage.reached),
					rate(stage.conversionFromPrevious),
				]),
			],
		},
		{
			name: 'Tiempo promedio',
			rows: [
				['Etapa', 'Promedio (días)', 'Mediana (días)', 'Leads medidos'],
				...report.stageDurations.map((stage) => [
					stage.name,
					days(stage.averageDays),
					days(stage.medianDays),
					count.format(stage.samples),
				]),
			],
		},
		{
			name: 'Por origen',
			rows: breakdownRows('Origen', report.byOrigin),
		},
		{
			name: 'Por asesor',
			rows: breakdownRows('Asesor', report.byAdvisor),
		},
		{
			name: 'Por equipo',
			rows: breakdownRows('Equipo', report.byTeam),
		},
		{
			name: 'Pronóstico',
			rows: [
				[
					'Etapa',
					'Leads abiertos',
					'Con valor',
					'Valor estimado',
					'Valor ponderado',
				],
				...forecast.stages.map((stage) => [
					stage.name,
					count.format(stage.openLeads),
					count.format(stage.valuedLeads),
					money(stage.estimatedValue),
					money(stage.weightedValue),
				]),
				[
					'Total',
					count.format(forecast.totals.openLeads),
					count.format(forecast.totals.valuedLeads),
					money(forecast.totals.estimatedValue),
					money(forecast.totals.weightedValue),
				],
			],
		},
		{
			name: 'Detalle por lead',
			rows: [
				['Asesor', 'Lead', 'Etapa', 'Entró', 'Salió', 'Tiempo', 'Situación'],
				...detailRows(detail, options.detailLimit),
			],
		},
	]
}

function breakdownRows(
	column: string,
	rows: CrmPipelineReport['byOrigin']
): string[][] {
	return [
		[
			column,
			'Leads',
			'Abiertos',
			'Ganados',
			'Perdidos',
			'Tasa de cierre',
			'Valor estimado',
			'Valor ponderado',
		],
		...rows.map((row) => [
			row.label,
			count.format(row.total),
			count.format(row.open),
			count.format(row.won),
			count.format(row.lost),
			rate(row.winRate),
			money(row.estimatedValue),
			money(row.weightedValue),
		]),
	]
}
