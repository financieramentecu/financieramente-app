import { describe, expect, it } from 'vitest'
import {
	buildCrmStageDetailLeads,
	buildCrmStageDetailRows,
	filterCrmStageDetailLeads,
} from '@/features/leads/reports/build-crm-stage-detail'
import { buildCrmReportSheets } from '@/features/leads/reports/build-crm-report-sheets'
import { buildCrmReportWorkbook } from '@/features/leads/reports/build-crm-report-workbook'
import { buildCrmReportPdf } from '@/features/leads/reports/build-crm-report-pdf'
import type { CrmPipelineReport } from '@/features/leads/reports/crm-pipeline-report.types'
import * as XLSX from 'xlsx'

const CREATED_AT = new Date('2026-11-01T20:00:00.000Z')
const MOVED_AT = new Date('2026-11-08T15:30:00.000Z')
const NOW = new Date('2026-11-10T20:43:00.000Z')

const report = {
	range: { from: '2026-11-01', to: '2026-11-10' },
	outcomes: { total: 1, open: 1, won: 0, lost: 0, abandoned: 0, winRate: null, conversionRate: 0 },
	funnel: [{ idLeadFunnelColumn: 1, name: 'Lead Nuevo', reached: 1, conversionFromPrevious: null }],
	stageDurations: [{ idLeadFunnelColumn: 1, name: 'Lead Nuevo', samples: 1, averageDays: 6.8, medianDays: 6.8 }],
	byOrigin: [],
	byAdvisor: [],
	byTeam: [],
	forecast: {
		stages: [],
		totals: { openLeads: 0, valuedLeads: 0, estimatedValue: '0', weightedValue: '0' },
	},
} satisfies CrmPipelineReport

describe('buildCrmStageDetailRows', () => {
	it('lists each stage stay of a lead with the time spent there', () => {
		const rows = buildCrmStageDetailRows(
			[
				{
					idLead: 232,
					leadName: 'María González',
					advisorName: 'Vanesa Cardona',
					createdAt: CREATED_AT,
					currentColumnName: 'Contacto 1ra Vez',
					events: [
						{ fromColumnName: null, toColumnName: 'Lead Nuevo', changedAt: CREATED_AT },
						{ fromColumnName: 'Lead Nuevo', toColumnName: 'Contacto 1ra Vez', changedAt: MOVED_AT },
					],
				},
			],
			NOW
		)

		expect(rows.map((row) => row.stageName)).toEqual(['Lead Nuevo', 'Contacto 1ra Vez'])
		expect(rows[0]).toMatchObject({
			advisorName: 'Vanesa Cardona',
			leadName: 'María González',
			current: false,
			durationMs: MOVED_AT.getTime() - CREATED_AT.getTime(),
		})
		expect(rows[1]?.current).toBe(true)
	})
})

describe('buildCrmStageDetailLeads', () => {
	const leads = buildCrmStageDetailLeads(
		[
			{
				idLead: 232,
				leadName: 'María González',
				advisorName: 'Vanesa Cardona',
				createdAt: CREATED_AT,
				currentColumnName: 'Contacto 1ra Vez',
				events: [
					{ fromColumnName: null, toColumnName: 'Lead Nuevo', changedAt: CREATED_AT },
					{ fromColumnName: 'Lead Nuevo', toColumnName: 'Contacto 1ra Vez', changedAt: MOVED_AT },
				],
				tasks: [{ title: 'Llamar', status: 'DONE', completedAt: MOVED_AT }],
				cases: [
					{ subject: 'Devolución', status: 'OPEN', resolvedAt: null },
					{ subject: 'Cierre', status: 'CLOSED', resolvedAt: NOW },
				],
			},
		],
		NOW
	)

	it('groups the lead on its last stage and keeps tasks and cases', () => {
		expect(leads).toHaveLength(1)
		expect(leads[0]).toMatchObject({
			currentStage: 'Contacto 1ra Vez',
			tasks: [{ title: 'Llamar', status: 'DONE' }],
			cases: [
				{ subject: 'Devolución', status: 'OPEN', resolvedAt: null },
				{ subject: 'Cierre', status: 'CLOSED' },
			],
		})
		expect(leads[0]?.stays.map((stay) => stay.stageName)).toEqual([
			'Lead Nuevo',
			'Contacto 1ra Vez',
		])
	})

	it('filters by the last stage, and by any past stage when the history is uncoupled', () => {
		expect(
			filterCrmStageDetailLeads(leads, { view: 'current', stage: 'Lead Nuevo' })
		).toHaveLength(0)
		expect(
			filterCrmStageDetailLeads(leads, { view: 'current', stage: 'Contacto 1ra Vez' })
		).toHaveLength(1)
		expect(
			filterCrmStageDetailLeads(leads, { view: 'history', stage: 'Lead Nuevo' })
		).toHaveLength(1)
		expect(
			filterCrmStageDetailLeads(leads, { view: 'current', stage: null })
		).toHaveLength(1)
	})
})

describe('CRM report export', () => {
	const detail = buildCrmStageDetailRows(
		[
			{
				idLead: 232,
				leadName: 'María González',
				advisorName: 'Vanesa Cardona',
				createdAt: CREATED_AT,
				currentColumnName: 'Contacto 1ra Vez',
				events: [{ fromColumnName: null, toColumnName: 'Lead Nuevo', changedAt: CREATED_AT }],
			},
		],
		NOW
	)

	it('writes an Excel workbook with the summary and the per-lead sheet', () => {
		const workbook = XLSX.read(buildCrmReportWorkbook(buildCrmReportSheets(report, detail)))
		expect(workbook.SheetNames).toContain('Detalle por lead')
		const sheet = workbook.Sheets['Detalle por lead']
		expect(sheet).toBeDefined()
		const values = XLSX.utils.sheet_to_json<string[]>(sheet!, { header: 1 })
		expect(values[1]).toContain('María González')
	})

	it('writes a PDF document', async () => {
		const bytes = await buildCrmReportPdf(buildCrmReportSheets(report, detail, { detailLimit: 1 }))
		expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe('%PDF')
	})
})
