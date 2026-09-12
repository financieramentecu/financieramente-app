import { describe, expect, it } from 'vitest'
import {
	barWidthPercent,
	buildConvertedMetric,
	buildFollowUpBars,
	buildHeatmap,
	heatmapCellStyle,
} from '../lib/build-report-view'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type { FunnelColumnRef } from '../types/leads-analytics.types'

const COLUMNS: FunnelColumnRef[] = [
	{ idLeadFunnelColumn: 1, name: 'Lead nuevo', position: 0 },
	{ idLeadFunnelColumn: 2, name: 'Contactado', position: 1 },
	{ idLeadFunnelColumn: 3, name: 'Sin mapear', position: 2 },
]

describe('buildFollowUpBars', () => {
	it('hides follow-up statuses with zero leads', () => {
		const counts = new Map<number, number>([
			[1, 4],
			[2, 0],
			[3, 2],
		])

		expect(buildFollowUpBars(COLUMNS, counts)).toEqual([
			{
				idLeadFunnelColumn: 1,
				name: 'Lead nuevo',
				position: 0,
				count: 4,
			},
			{
				idLeadFunnelColumn: 3,
				name: 'Sin mapear',
				position: 2,
				count: 2,
			},
		])
	})
})

describe('buildConvertedMetric', () => {
	it('totals converted leads and hides zero-count outcomes', () => {
		const counts = new Map<
			'OPEN' | 'WON' | 'LOST' | 'ABANDONED',
			number
		>([
			['OPEN', 3],
			['WON', 1],
			['LOST', 0],
			['ABANDONED', 2],
		])

		const metric = buildConvertedMetric(counts)
		expect(metric.total).toBe(6)
		expect(metric.slices.map((slice) => slice.outcomeStatus)).toEqual([
			'OPEN',
			'WON',
			'ABANDONED',
		])
		expect(metric.slices.find((slice) => slice.label === 'Abierto')?.count).toBe(
			3
		)
	})
})

describe('buildHeatmap', () => {
	it('pivots owner × status counts and omits empty columns and rows', () => {
		const heatmap = buildHeatmap(
			COLUMNS,
			[
				{ idUser: 10, idLeadFunnelColumn: 1, count: 5 },
				{ idUser: 10, idLeadFunnelColumn: 2, count: 0 },
				{ idUser: 11, idLeadFunnelColumn: 1, count: 1 },
				{ idUser: null, idLeadFunnelColumn: 3, count: 2 },
			],
			[
				{ idUser: 10, name: 'Ana Pérez' },
				{ idUser: 11, name: 'Luis Gómez' },
			]
		)

		expect(heatmap.columns.map((column) => column.name)).toEqual([
			'Lead nuevo',
			'Sin mapear',
		])
		expect(heatmap.rows.map((row) => row.ownerName)).toEqual([
			'Ana Pérez',
			LEADS_ANALYTICS_UI.UNASSIGNED_OWNER,
			'Luis Gómez',
		])
		expect(heatmap.rows[0]?.cells).toEqual([5, 0])
		expect(heatmap.rows[1]?.cells).toEqual([0, 2])
		expect(heatmap.maxCellCount).toBe(5)
	})
})

describe('barWidthPercent', () => {
	it('scales against the max and never returns a zero-width positive bar', () => {
		expect(barWidthPercent(0, 10)).toBe(0)
		expect(barWidthPercent(10, 10)).toBe(100)
		expect(barWidthPercent(1, 100)).toBe(2)
	})
})

describe('heatmapCellStyle', () => {
	it('returns no fill for empty cells and white text on dense cells', () => {
		expect(heatmapCellStyle(0, 10)).toEqual({})
		expect(heatmapCellStyle(10, 10).color).toBe('white')
		expect(heatmapCellStyle(1, 10).backgroundColor).toContain('rgba(0, 60, 69')
	})
})
