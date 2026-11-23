import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { CrmReports } from '@/features/leads/reports/crm-reports'
import { formatReportRate } from '@/features/leads/reports/format-report-rate'

const breakdownRow = (key: string, label: string, total: number) => ({
	key,
	label,
	total,
	open: 1,
	won: 1,
	lost: 0,
	winRate: 1,
	estimatedValue: '1000000',
	weightedValue: '500000',
})

const report = {
	range: { from: '2026-08-12', to: '2026-11-09' },
	outcomes: { total: 10, open: 4, won: 3, lost: 2, abandoned: 1, winRate: 0.5, conversionRate: 0.3 },
	funnel: [
		{ idLeadFunnelColumn: 1, name: 'Nuevo', reached: 10, conversionFromPrevious: null },
		{ idLeadFunnelColumn: 2, name: 'Contactado', reached: 6, conversionFromPrevious: 0.6 },
	],
	stageDurations: [
		{ idLeadFunnelColumn: 1, name: 'Nuevo', samples: 6, averageDays: 2.5, medianDays: 2 },
		{ idLeadFunnelColumn: 2, name: 'Contactado', samples: 0, averageDays: null, medianDays: null },
	],
	byOrigin: [breakdownRow('Facebook', 'Facebook', 7)],
	byAdvisor: [breakdownRow('5', 'Ana Ruiz', 6)],
	byTeam: [breakdownRow('10', 'Equipo Laura', 10)],
	forecast: {
		stages: [{ idLeadFunnelColumn: 2, name: 'Contactado', openLeads: 4, valuedLeads: 2, estimatedValue: '2000000', weightedValue: '900000' }],
		totals: { openLeads: 4, valuedLeads: 2, estimatedValue: '2000000', weightedValue: '900000' },
	},
}

function respond(body: unknown, ok = true) {
	return Promise.resolve({ ok, json: async () => body })
}

const emptyDetail = {
	leads: [],
	stages: [],
	view: 'current',
	stage: null,
	page: 1,
	pageSize: 25,
	totalLeads: 0,
	range: report.range,
}

function mockReportFetch(pipeline: unknown, ok = true) {
	return vi.fn((input: RequestInfo | URL) => {
		const url = String(input)
		if (url.includes('/api/crm/reports/stage-detail')) return respond({ data: emptyDetail })
		return respond(ok ? { data: pipeline } : pipeline, ok)
	})
}

describe('formatReportRate', () => {
	it('formats fractions as percentages and null as a dash', () => {
		expect(formatReportRate(0.5)).toBe('50 %')
		expect(formatReportRate(0.3333)).toBe('33,3 %')
		expect(formatReportRate(null)).toBe('—')
	})
})

describe('CrmReports', () => {
	beforeEach(() => vi.restoreAllMocks())

	it('loads the default range and renders KPIs, funnel, durations, breakdown and forecast', async () => {
		const fetchMock = mockReportFetch(report)
		vi.stubGlobal('fetch', fetchMock)
		render(<CrmReports />)

		expect(await screen.findByText('Embudo de conversión')).toBeInTheDocument()
		expect(fetchMock).toHaveBeenCalledWith('/api/crm/reports/pipeline')
		expect(screen.getByLabelText('Desde')).toHaveValue('2026-08-12')
		expect(screen.getByLabelText('Hasta')).toHaveValue('2026-11-09')

		const kpis = screen.getByRole('region', { name: 'Indicadores' })
		expect(within(kpis).getByText('Tasa de cierre')).toBeInTheDocument()
		expect(within(kpis).getByText('50 %')).toBeInTheDocument()
		expect(within(kpis).getByText('30 %')).toBeInTheDocument()

		expect(screen.getByText('60 % desde la etapa anterior')).toBeInTheDocument()
		expect(screen.getByRole('cell', { name: '2,5' })).toBeInTheDocument()
		expect(screen.getByRole('cell', { name: 'Facebook' })).toBeInTheDocument()
		expect(screen.getAllByText(/900\.000/).length).toBeGreaterThan(0)
		expect(screen.getByRole('link', { name: 'Exportar Excel' })).toHaveAttribute(
			'href',
			'/api/crm/reports/export?format=xlsx&from=2026-08-12&to=2026-11-09'
		)
		expect(screen.getByRole('link', { name: 'Exportar PDF' })).toHaveAttribute(
			'href',
			'/api/crm/reports/export?format=pdf&from=2026-08-12&to=2026-11-09'
		)
		expect(await screen.findByText('Detalle por lead y etapa')).toBeInTheDocument()
	})

	it('switches the breakdown between origin, advisor and team', async () => {
		vi.stubGlobal('fetch', mockReportFetch(report))
		render(<CrmReports />)
		await screen.findByText('Embudo de conversión')

		fireEvent.click(screen.getByRole('button', { name: 'Asesor' }))
		expect(screen.getByRole('cell', { name: 'Ana Ruiz' })).toBeInTheDocument()
		expect(screen.queryByRole('cell', { name: 'Facebook' })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: 'Equipo' }))
		expect(screen.getByRole('cell', { name: 'Equipo Laura' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Equipo' })).toHaveAttribute('aria-pressed', 'true')
	})

	it('reloads with the chosen range', async () => {
		const fetchMock = mockReportFetch(report)
		vi.stubGlobal('fetch', fetchMock)
		render(<CrmReports />)
		await screen.findByText('Embudo de conversión')

		fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-01' } })
		fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-31' } })
		fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
		await screen.findByText('Embudo de conversión')
		expect(fetchMock).toHaveBeenCalledWith('/api/crm/reports/pipeline?from=2026-10-01&to=2026-10-31')
	})

	it('shows the server message on error (permission or size limit)', async () => {
		vi.stubGlobal('fetch', mockReportFetch({ data: null, error: 'No tienes permiso para ver este reporte' }, false))
		render(<CrmReports />)
		expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso para ver este reporte')
	})

	it('shows an empty state when the range has no leads', async () => {
		const empty = { ...report, outcomes: { ...report.outcomes, total: 0 } }
		vi.stubGlobal('fetch', mockReportFetch(empty))
		render(<CrmReports />)
		expect(await screen.findByText('No hay leads creados en este rango de fechas.')).toBeInTheDocument()
	})
})
