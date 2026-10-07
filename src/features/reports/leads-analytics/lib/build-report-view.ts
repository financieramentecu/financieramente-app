/**
 * Pure view-model builders for Leads Analytics charts and heatmap.
 */

import type { LeadOutcomeStatus } from '@prisma/client'
import { LEAD_OUTCOME_STATUS_LABELS } from '@/features/leads/lib/lead-outcome-status'
import { LEAD_OUTCOME_STATUS_VALUES } from '@/features/leads/types/lead.types'
import { LEADS_ANALYTICS_UI } from './ui-copy'
import type {
	ConvertedLeadsMetric,
	FollowUpStatusBar,
	FunnelColumnRef,
	HeatmapRawCell,
	LeadsAnalyticsHeatmap,
	OwnerRef,
} from '../types/leads-analytics.types'

/**
 * Builds horizontal-bar rows, dropping follow-up statuses with zero leads.
 */
export function buildFollowUpBars(
	columns: readonly FunnelColumnRef[],
	countsByColumn: ReadonlyMap<number, number>
): FollowUpStatusBar[] {
	return columns
		.map((column) => ({
			idLeadFunnelColumn: column.idLeadFunnelColumn,
			name: column.name,
			position: column.position,
			count: countsByColumn.get(column.idLeadFunnelColumn) ?? 0,
		}))
		.filter((bar) => bar.count > 0)
}

/**
 * Builds converted-lead total + outcome slices, hiding zero-count outcomes.
 */
export function buildConvertedMetric(
	countsByOutcome: ReadonlyMap<LeadOutcomeStatus, number>
): ConvertedLeadsMetric {
	const slices = LEAD_OUTCOME_STATUS_VALUES.map((outcomeStatus) => ({
		outcomeStatus,
		label: LEAD_OUTCOME_STATUS_LABELS[outcomeStatus],
		count: countsByOutcome.get(outcomeStatus) ?? 0,
	})).filter((slice) => slice.count > 0)

	const total = slices.reduce((sum, slice) => sum + slice.count, 0)
	return { total, slices }
}

/**
 * Pivots owner × follow-up counts into a heatmap.
 * Columns and rows with no leads are omitted.
 */
export function buildHeatmap(
	columns: readonly FunnelColumnRef[],
	cells: readonly HeatmapRawCell[],
	owners: readonly OwnerRef[],
	unassignedLabel: string = LEADS_ANALYTICS_UI.UNASSIGNED_OWNER
): LeadsAnalyticsHeatmap {
	const columnTotals = new Map<number, number>()
	const rowTotals = new Map<number | null, number>()
	const countByKey = new Map<string, number>()

	for (const cell of cells) {
		if (cell.count <= 0) continue
		countByKey.set(heatmapCellKey(cell.idUser, cell.idLeadFunnelColumn), cell.count)
		columnTotals.set(
			cell.idLeadFunnelColumn,
			(columnTotals.get(cell.idLeadFunnelColumn) ?? 0) + cell.count
		)
		rowTotals.set(cell.idUser, (rowTotals.get(cell.idUser) ?? 0) + cell.count)
	}

	const heatmapColumns = columns
		.filter((column) => (columnTotals.get(column.idLeadFunnelColumn) ?? 0) > 0)
		.map((column) => ({
			idLeadFunnelColumn: column.idLeadFunnelColumn,
			name: column.name,
		}))

	const ownerNameById = new Map(owners.map((owner) => [owner.idUser, owner.name]))

	const rows = [...rowTotals.entries()]
		.filter(([, total]) => total > 0)
		.map(([idUser, rowTotal]) => ({
			idUser,
			ownerName:
				idUser == null
					? unassignedLabel
					: (ownerNameById.get(idUser) ?? unassignedLabel),
			cells: heatmapColumns.map(
				(column) =>
					countByKey.get(heatmapCellKey(idUser, column.idLeadFunnelColumn)) ?? 0
			),
			rowTotal,
		}))
		.sort((a, b) => {
			if (b.rowTotal !== a.rowTotal) return b.rowTotal - a.rowTotal
			return a.ownerName.localeCompare(b.ownerName, 'es')
		})

	const maxCellCount = rows.reduce(
		(max, row) => Math.max(max, ...row.cells, 0),
		0
	)

	return { columns: heatmapColumns, rows, maxCellCount }
}

export function heatmapCellKey(
	idUser: number | null,
	idLeadFunnelColumn: number
): string {
	return `${idUser ?? 'none'}:${idLeadFunnelColumn}`
}

export function barWidthPercent(count: number, maxCount: number): number {
	if (count <= 0 || maxCount <= 0) return 0
	return Math.max((count / maxCount) * 100, 2)
}

/**
 * Proportional teal intensity for heatmap cells (0 = empty).
 */
export function heatmapCellStyle(
	count: number,
	maxCount: number
): { backgroundColor?: string; color?: string } {
	if (count <= 0 || maxCount <= 0) return {}
	const intensity = Math.max(0.08, count / maxCount)
	return {
		backgroundColor: `rgba(0, 60, 69, ${intensity})`,
		color: intensity >= 0.55 ? 'white' : undefined,
	}
}
