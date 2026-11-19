import { describe, expect, it } from 'vitest'
import { buildCrmPipelineReport } from '@/features/leads/reports/build-crm-pipeline-report'
import type {
	CrmReportDataset,
	CrmReportLead,
	CrmReportStageChange,
} from '@/features/leads/reports/crm-pipeline-report.types'

const DAY = 24 * 60 * 60 * 1000
const T0 = new Date('2026-10-01T12:00:00Z')
const at = (days: number) => new Date(T0.getTime() + days * DAY)

const STAGES = [
	{ idLeadFunnelColumn: 1, name: 'Nuevo', position: 0, active: true, isFallback: false },
	{ idLeadFunnelColumn: 2, name: 'Contactado', position: 1, active: true, isFallback: false },
	{ idLeadFunnelColumn: 3, name: 'Propuesta', position: 2, active: true, isFallback: false },
	{ idLeadFunnelColumn: 9, name: 'Sin mapear', position: 99, active: true, isFallback: true },
	{ idLeadFunnelColumn: 8, name: 'Antigua', position: 5, active: false, isFallback: false },
]

function lead(overrides: Partial<CrmReportLead> & { idLead: number }): CrmReportLead {
	return {
		idUser: null,
		idLeadFunnelColumn: 1,
		outcomeStatus: 'OPEN',
		originTag: null,
		estimatedValue: null,
		probability: null,
		createdAt: T0,
		...overrides,
	}
}

function change(idLead: number, from: number | null, to: number, days: number): CrmReportStageChange {
	return { idLead, fromIdLeadFunnelColumn: from, toIdLeadFunnelColumn: to, changedAt: at(days) }
}

function dataset(overrides: Partial<CrmReportDataset> = {}): CrmReportDataset {
	return {
		range: { from: '2026-10-01', to: '2026-10-31' },
		leads: [],
		stageChanges: [],
		stages: STAGES,
		owners: [],
		...overrides,
	}
}

describe('buildCrmPipelineReport — outcomes', () => {
	it('counts outcomes and computes win and conversion rates', () => {
		const report = buildCrmPipelineReport(
			dataset({
				leads: [
					lead({ idLead: 1, outcomeStatus: 'WON' }),
					lead({ idLead: 2, outcomeStatus: 'WON' }),
					lead({ idLead: 3, outcomeStatus: 'LOST' }),
					lead({ idLead: 4, outcomeStatus: 'ABANDONED' }),
					lead({ idLead: 5 }),
				],
			})
		)
		expect(report.range).toEqual({ from: '2026-10-01', to: '2026-10-31' })
		expect(report.outcomes).toEqual({
			total: 5,
			open: 1,
			won: 2,
			lost: 1,
			abandoned: 1,
			winRate: 0.5,
			conversionRate: 0.4,
		})
	})

	it('returns null rates when nothing is closed or the cohort is empty', () => {
		expect(buildCrmPipelineReport(dataset()).outcomes).toMatchObject({ total: 0, winRate: null, conversionRate: null })
		const open = buildCrmPipelineReport(dataset({ leads: [lead({ idLead: 1 })] }))
		expect(open.outcomes).toMatchObject({ winRate: null, conversionRate: 0 })
	})

	it('rounds rates to four decimals', () => {
		const report = buildCrmPipelineReport(
			dataset({ leads: [lead({ idLead: 1, outcomeStatus: 'WON' }), lead({ idLead: 2 }), lead({ idLead: 3 })] })
		)
		expect(report.outcomes.conversionRate).toBe(0.3333)
	})
})

describe('buildCrmPipelineReport — funnel', () => {
	it('counts every stage up to the furthest one reached, ignoring fallback and inactive stages', () => {
		const report = buildCrmPipelineReport(
			dataset({
				leads: [
					lead({ idLead: 1, idLeadFunnelColumn: 1 }),
					lead({ idLead: 2, idLeadFunnelColumn: 2 }),
					// Moved A → C directly, now back in A: furthest is C.
					lead({ idLead: 3, idLeadFunnelColumn: 1 }),
					lead({ idLead: 4, idLeadFunnelColumn: 9 }),
					lead({ idLead: 5, idLeadFunnelColumn: 8 }),
				],
				stageChanges: [change(3, 1, 3, 1), change(3, 3, 1, 2)],
			})
		)
		expect(report.funnel).toEqual([
			{ idLeadFunnelColumn: 1, name: 'Nuevo', reached: 3, conversionFromPrevious: null },
			{ idLeadFunnelColumn: 2, name: 'Contactado', reached: 2, conversionFromPrevious: 0.6667 },
			{ idLeadFunnelColumn: 3, name: 'Propuesta', reached: 1, conversionFromPrevious: 0.5 },
		])
	})

	it('orders stages by position then id and handles an empty previous stage', () => {
		const report = buildCrmPipelineReport(
			dataset({
				stages: [
					{ idLeadFunnelColumn: 5, name: 'B', position: 1, active: true, isFallback: false },
					{ idLeadFunnelColumn: 4, name: 'A', position: 1, active: true, isFallback: false },
				],
			})
		)
		expect(report.funnel.map((stage) => stage.name)).toEqual(['A', 'B'])
		expect(report.funnel[1]!.conversionFromPrevious).toBeNull()
	})
})

describe('buildCrmPipelineReport — time per stage', () => {
	it('measures completed stays, including the initial one, and skips the current stay', () => {
		const report = buildCrmPipelineReport(
			dataset({
				leads: [
					lead({ idLead: 1, createdAt: at(0), idLeadFunnelColumn: 3 }),
					lead({ idLead: 2, createdAt: at(0), idLeadFunnelColumn: 2 }),
				],
				stageChanges: [
					change(1, 1, 2, 2),
					change(1, 2, 3, 5),
					change(2, 1, 2, 4),
				],
			})
		)
		const byStage = Object.fromEntries(report.stageDurations.map((row) => [row.idLeadFunnelColumn, row]))
		expect(byStage[1]).toEqual({ idLeadFunnelColumn: 1, name: 'Nuevo', samples: 2, averageDays: 3, medianDays: 3 })
		expect(byStage[2]).toEqual({ idLeadFunnelColumn: 2, name: 'Contactado', samples: 1, averageDays: 3, medianDays: 3 })
		expect(byStage[3]).toEqual({ idLeadFunnelColumn: 3, name: 'Propuesta', samples: 0, averageDays: null, medianDays: null })
	})

	it('skips the initial stay when the first change has no origin and drops negative stays', () => {
		const report = buildCrmPipelineReport(
			dataset({
				leads: [lead({ idLead: 1, createdAt: at(0) }), lead({ idLead: 2, createdAt: at(5) })],
				stageChanges: [
					change(1, 2, 3, 4.25),
					change(1, null, 1, 0),
					change(1, 1, 2, 2),
					// Created after its first change (clock skew): the negative initial stay is dropped.
					change(2, 1, 2, 3),
				],
			})
		)
		const byStage = Object.fromEntries(report.stageDurations.map((row) => [row.idLeadFunnelColumn, row]))
		expect(byStage[1]).toMatchObject({ samples: 1, averageDays: 2, medianDays: 2 })
		expect(byStage[2]).toMatchObject({ samples: 1, averageDays: 2.3, medianDays: 2.3 })
	})

	it('averages unrounded stays and uses the median of an even sample', () => {
		const report = buildCrmPipelineReport(
			dataset({
				leads: [1, 2, 3, 4].map((idLead) => lead({ idLead, createdAt: at(0) })),
				stageChanges: [change(4, 1, 2, 10), change(3, 1, 2, 4), change(2, 1, 2, 2), change(1, 1, 2, 1)],
			})
		)
		expect(report.stageDurations.find((row) => row.idLeadFunnelColumn === 1)).toMatchObject({
			samples: 4,
			averageDays: 4.3,
			medianDays: 3,
		})
	})
})

describe('buildCrmPipelineReport — breakdowns', () => {
	const owners = [
		{ idUser: 1, name: 'Ana Ruiz', idLeader: 10, leaderName: 'Laura Díaz' },
		{ idUser: 2, name: 'Bruno Paz', idLeader: 10, leaderName: 'Laura Díaz' },
		{ idUser: 3, name: 'Carla Mejía', idLeader: null, leaderName: null },
	]
	const leads = [
		lead({ idLead: 1, idUser: 1, originTag: 'Facebook', outcomeStatus: 'WON', estimatedValue: '1000.00', probability: 100 }),
		lead({ idLead: 2, idUser: 1, originTag: ' Facebook ', outcomeStatus: 'LOST', estimatedValue: '500.50', probability: 20 }),
		lead({ idLead: 3, idUser: 2, originTag: 'Web', estimatedValue: '200', probability: null }),
		lead({ idLead: 4, idUser: 3, originTag: '' }),
		lead({ idLead: 5, idUser: null, originTag: null, outcomeStatus: 'ABANDONED' }),
	]

	it('groups by origin with a "Sin origen" bucket', () => {
		const report = buildCrmPipelineReport(dataset({ leads, owners }))
		expect(report.byOrigin).toEqual([
			{ key: 'Facebook', label: 'Facebook', total: 2, open: 0, won: 1, lost: 1, winRate: 0.5, estimatedValue: '1500.5', weightedValue: '1100.1' },
			{ key: 'none', label: 'Sin origen', total: 2, open: 1, won: 0, lost: 1, winRate: 0, estimatedValue: '0', weightedValue: '0' },
			{ key: 'Web', label: 'Web', total: 1, open: 1, won: 0, lost: 0, winRate: null, estimatedValue: '200', weightedValue: '0' },
		])
	})

	it('groups by advisor with a "Sin asignar" bucket', () => {
		const report = buildCrmPipelineReport(dataset({ leads, owners }))
		expect(report.byAdvisor.map((row) => [row.key, row.label, row.total])).toEqual([
			['1', 'Ana Ruiz', 2],
			['2', 'Bruno Paz', 1],
			['3', 'Carla Mejía', 1],
			['unassigned', 'Sin asignar', 1],
		])
	})

	it('groups by team (owner leader) with "Sin líder" and "Sin asignar" buckets', () => {
		const report = buildCrmPipelineReport(dataset({ leads, owners }))
		expect(report.byTeam.map((row) => [row.key, row.label, row.total, row.won])).toEqual([
			['10', 'Laura Díaz', 3, 1],
			['unassigned', 'Sin asignar', 1, 0],
			['no-leader', 'Sin líder', 1, 0],
		])
	})

	it('labels an owner missing from the owner list by id', () => {
		const report = buildCrmPipelineReport(dataset({ leads: [lead({ idLead: 1, idUser: 77 })] }))
		expect(report.byAdvisor[0]).toMatchObject({ key: '77', label: 'Usuario 77' })
		expect(report.byTeam[0]).toMatchObject({ key: 'no-leader', label: 'Sin líder' })
	})
})

describe('buildCrmPipelineReport — forecast', () => {
	it('sums open leads per stage with weighted value, unknown stages last', () => {
		const report = buildCrmPipelineReport(
			dataset({
				leads: [
					lead({ idLead: 1, idLeadFunnelColumn: 2, estimatedValue: '1000', probability: 50 }),
					lead({ idLead: 2, idLeadFunnelColumn: 2, estimatedValue: '333.33', probability: 33 }),
					lead({ idLead: 3, idLeadFunnelColumn: 2 }),
					lead({ idLead: 4, idLeadFunnelColumn: 1, estimatedValue: '10', probability: null }),
					lead({ idLead: 5, idLeadFunnelColumn: 2, estimatedValue: '9999', probability: 90, outcomeStatus: 'WON' }),
					lead({ idLead: 6, idLeadFunnelColumn: 404, estimatedValue: '1', probability: 100 }),
				],
			})
		)
		expect(report.forecast.stages).toEqual([
			{ idLeadFunnelColumn: 1, name: 'Nuevo', openLeads: 1, valuedLeads: 1, estimatedValue: '10', weightedValue: '0' },
			{ idLeadFunnelColumn: 2, name: 'Contactado', openLeads: 3, valuedLeads: 2, estimatedValue: '1333.33', weightedValue: '610' },
			{ idLeadFunnelColumn: 404, name: 'Etapa 404', openLeads: 1, valuedLeads: 1, estimatedValue: '1', weightedValue: '1' },
		])
		expect(report.forecast.totals).toEqual({ openLeads: 5, valuedLeads: 4, estimatedValue: '1344.33', weightedValue: '611' })
	})
})
