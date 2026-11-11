import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { LeadsTable } from '@/features/leads/table/leads-table'
import { fetchLeadTable, fetchStageOptions, fetchTagOptions } from '@/features/leads/table/lead-table-api'
import type { LeadTablePage, LeadTableRow } from '@/features/leads/table/lead-table.types'

vi.mock('next/navigation', () => ({ useRouter: vi.fn(), useSearchParams: vi.fn(), usePathname: vi.fn() }))
vi.mock('@/features/leads/table/lead-table-api', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/leads/table/lead-table-api')>()),
	fetchLeadTable: vi.fn(),
	fetchStageOptions: vi.fn(),
	fetchTagOptions: vi.fn(),
}))
vi.mock('@/features/leads/views/saved-views-bar', () => ({
	SavedViewsBar: ({ onApply }: { onApply: (query: unknown) => void }) => (
		<button type="button" onClick={() => onApply({ statuses: ['WON'], stageIds: [], ownerIds: [], tagIds: [], idle: false, sort: 'name', dir: 'asc' })}>
			Aplicar vista
		</button>
	),
}))

const replace = vi.fn()

const row: LeadTableRow = {
	idLead: 1,
	name: 'Ana',
	lastName: 'Pérez',
	email: 'ana@x.co',
	phone: null,
	originTag: null,
	idUser: 5,
	ownerName: 'Luis Gómez',
	idLeadFunnelColumn: 2,
	stageName: 'Contactado',
	outcomeStatus: 'OPEN',
	estimatedValue: '1000000',
	probability: 50,
	weightedValue: '500000',
	tags: [{ idLeadTag: 1, name: 'VIP', color: '#f00' }],
	createdAt: '2026-11-01T15:00:00.000Z',
	lastActivityAt: null,
	inactiveDays: 9,
}

function page(overrides: Partial<LeadTablePage> = {}): LeadTablePage {
	return { items: [row], total: 60, page: 1, pageSize: 25, totals: { estimatedValue: '1000000', weightedValue: '500000' }, ...overrides }
}

function renderTable(params = 'tab=leads', fieldsEnabled = true) {
	vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(params) as never)
	const onOpenLead = vi.fn()
	render(<LeadsTable onOpenLead={onOpenLead} fieldsEnabled={fieldsEnabled} />)
	return { onOpenLead }
}

describe('LeadsTable', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(useRouter).mockReturnValue({ replace } as never)
		vi.mocked(usePathname).mockReturnValue('/dashboard/negocios/crm')
		vi.mocked(fetchLeadTable).mockResolvedValue(page())
		vi.mocked(fetchStageOptions).mockResolvedValue([{ idLeadFunnelColumn: 2, name: 'Contactado' }])
		vi.mocked(fetchTagOptions).mockResolvedValue([{ idLeadTag: 1, name: 'VIP', color: '#f00' }])
	})

	it('loads the query from the URL and renders rows, tags, value and totals', async () => {
		renderTable('tab=leads&q=ana&status=OPEN')
		expect(await screen.findByRole('button', { name: 'Ana Pérez' })).toBeInTheDocument()
		expect(fetchLeadTable).toHaveBeenCalledWith(expect.objectContaining({ q: 'ana', statuses: ['OPEN'] }))
		expect(screen.getByText('VIP')).toBeInTheDocument()
		expect(screen.getByText('50%')).toBeInTheDocument()
		expect(screen.getByText('Sin actividad · 9 días')).toBeInTheDocument()
		expect(screen.getByLabelText('Totales del pipeline')).toHaveTextContent(/Valor ponderado\s*\$\s*500\.000/)
		expect(screen.getByText('1–25 de 60 leads')).toBeInTheDocument()
	})

	it('hides CRM field columns while crm_lead_fields is off', async () => {
		renderTable('tab=leads', false)
		await screen.findByRole('button', { name: 'Ana Pérez' })
		expect(screen.queryByText('VIP')).not.toBeInTheDocument()
		expect(screen.queryByLabelText('Totales del pipeline')).not.toBeInTheDocument()
		expect(fetchTagOptions).not.toHaveBeenCalled()
	})

	it('searches, keeps the tab param in the URL and resets to page 1', async () => {
		renderTable('tab=leads&page=3')
		await screen.findByRole('button', { name: 'Ana Pérez' })
		fireEvent.change(screen.getByLabelText('Buscar leads'), { target: { value: ' perez ' } })
		fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
		await waitFor(() => expect(fetchLeadTable).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'perez', page: 1 })))
		expect(replace).toHaveBeenLastCalledWith('/dashboard/negocios/crm?q=perez&tab=leads', { scroll: false })
	})

	it('toggles the sort direction from a header', async () => {
		renderTable()
		await screen.findByRole('button', { name: 'Ana Pérez' })
		fireEvent.click(screen.getByRole('button', { name: 'Creado' }))
		await waitFor(() => expect(fetchLeadTable).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'createdAt', dir: 'asc' })))
		fireEvent.click(screen.getByRole('button', { name: 'Valor' }))
		await waitFor(() => expect(fetchLeadTable).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'estimatedValue', dir: 'desc' })))
	})

	it('pages forward and filters idle leads', async () => {
		renderTable()
		await screen.findByRole('button', { name: 'Ana Pérez' })
		fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
		await waitFor(() => expect(fetchLeadTable).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))
		fireEvent.click(screen.getByRole('checkbox', { name: 'Sin actividad' }))
		await waitFor(() => expect(fetchLeadTable).toHaveBeenLastCalledWith(expect.objectContaining({ idle: true, page: 1 })))
	})

	it('builds the export link from the current filters', async () => {
		renderTable('tab=leads&status=WON&page=2')
		await screen.findByRole('button', { name: 'Ana Pérez' })
		expect(screen.getByRole('link', { name: /Exportar CSV/ })).toHaveAttribute('href', '/api/crm/leads/export?status=WON')
	})

	it('applies a saved view', async () => {
		renderTable()
		await screen.findByRole('button', { name: 'Ana Pérez' })
		fireEvent.click(screen.getByRole('button', { name: 'Aplicar vista' }))
		await waitFor(() =>
			expect(fetchLeadTable).toHaveBeenLastCalledWith(expect.objectContaining({ statuses: ['WON'], sort: 'name', dir: 'asc', page: 1 }))
		)
	})

	it('opens the lead sheet from the row action', async () => {
		const { onOpenLead } = renderTable()
		fireEvent.click(await screen.findByRole('button', { name: 'Abrir ficha' }))
		expect(onOpenLead).toHaveBeenCalledWith(1)
	})

	it('expands one lead and closes it again', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn((input: string) => {
				if (String(input).endsWith('/stage-history')) {
					return Promise.resolve({
						ok: true,
						json: async () => ({
							data: [
								{
									columnName: 'Contactado',
									enteredAt: '2026-11-01T15:00:00.000Z',
									leftAt: null,
									durationMs: 1000,
									current: true,
								},
							],
						}),
					})
				}
				return Promise.resolve({ ok: true, json: async () => ({ data: [] }) })
			})
		)
		renderTable()
		fireEvent.click(await screen.findByRole('button', { name: 'Ana Pérez' }))
		expect(await screen.findByRole('list', { name: 'Etapas de Ana Pérez' })).toHaveTextContent('Contactado')
		fireEvent.click(screen.getByRole('button', { name: 'Ana Pérez' }))
		expect(screen.queryByRole('list', { name: 'Etapas de Ana Pérez' })).not.toBeInTheDocument()
	})

	it('shows an empty state and API errors', async () => {
		vi.mocked(fetchLeadTable).mockResolvedValueOnce(page({ items: [], total: 0 }))
		renderTable()
		expect(await screen.findByText('No hay leads con estos filtros.')).toBeInTheDocument()
		expect(within(screen.getByRole('table')).queryByRole('button', { name: 'Ana Pérez' })).not.toBeInTheDocument()
	})

	it('shows the API error', async () => {
		vi.mocked(fetchLeadTable).mockRejectedValueOnce(new Error('No fue posible cargar los leads.'))
		renderTable()
		expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible cargar los leads.')
	})
})
