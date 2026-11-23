import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CrmStageDetailSection } from '@/features/leads/reports/crm-stage-detail-section'
import type { CrmStageDetailPage } from '@/features/leads/reports/crm-stage-detail.types'

const page: CrmStageDetailPage = {
	range: { from: '2026-11-01', to: '2026-11-10' },
	stages: ['Contacto 1ra Vez', 'Lead Nuevo'],
	view: 'current',
	stage: null,
	page: 1,
	pageSize: 25,
	totalLeads: 1,
	leads: [
		{
			idLead: 232,
			leadName: 'María González',
			advisorName: 'Vanesa Cardona',
			currentStage: 'Contacto 1ra Vez',
			stays: [
				{
					stageName: 'Lead Nuevo',
					enteredAt: '2026-11-01T20:00:00.000Z',
					leftAt: '2026-11-08T15:30:00.000Z',
					durationMs: 597_600_000,
					current: false,
				},
				{
					stageName: 'Contacto 1ra Vez',
					enteredAt: '2026-11-08T15:30:00.000Z',
					leftAt: null,
					durationMs: 190_800_000,
					current: true,
				},
			],
			tasks: [{ title: 'Llamar', status: 'DONE', completedAt: '2026-11-08T15:30:00.000Z' }],
			cases: [
				{ subject: 'Devolución', status: 'OPEN', resolvedAt: null },
				{ subject: 'Cierre', status: 'CLOSED', resolvedAt: '2026-11-09T15:00:00.000Z' },
			],
		},
	],
}

describe('CrmStageDetailSection', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ data: page }) }))
		)
	})

	it('groups the lead on its last stage and opens tasks, cases and stages from that row', async () => {
		render(<CrmStageDetailSection range={null} />)

		expect(await screen.findByRole('cell', { name: 'Contacto 1ra Vez' })).toBeInTheDocument()
		expect(screen.queryByRole('list', { name: 'Etapas de María González' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Desacoplar historial' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Detalle de María González' }))
		expect(await screen.findByText('Llamar')).toBeInTheDocument()
		expect(screen.getByText('Devolución')).toBeInTheDocument()
		expect(screen.getByText('Cierre')).toBeInTheDocument()
		const cascade = screen.getByRole('list', { name: 'Etapas de María González' })
		expect(cascade.querySelector('li')).toHaveTextContent('Contacto 1ra Vez')
		expect(cascade).toHaveTextContent('Lead Nuevo')
		expect(cascade.querySelector('li')).toHaveClass('bg-slate-200/80', 'hover:bg-slate-300')

		fireEvent.click(screen.getByRole('button', { name: 'Detalle de María González' }))
		expect(screen.queryByRole('list', { name: 'Etapas de María González' })).not.toBeInTheDocument()
	})

	it('reloads with the chosen page size', async () => {
		const fetchMock = vi.fn((_input: string) =>
			Promise.resolve({ ok: true, json: async () => ({ data: page }) })
		)
		vi.stubGlobal('fetch', fetchMock)
		render(<CrmStageDetailSection range={null} />)
		await screen.findByRole('cell', { name: 'Contacto 1ra Vez' })

		expect(String(fetchMock.mock.calls[0]?.[0])).toContain('pageSize=20')
		fireEvent.change(screen.getByRole('combobox', { name: 'Filas por página' }), {
			target: { value: '50' },
		})
		await screen.findByRole('cell', { name: 'Contacto 1ra Vez' })
		expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('pageSize=50'))).toBe(true)
	})
})
