import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SavedViewsBar } from '@/features/leads/views/saved-views-bar'
import { createSavedView, deleteSavedView, fetchSavedViews } from '@/features/leads/views/saved-views-api'
import { DEFAULT_LEAD_TABLE_QUERY, toSavedLeadTableQuery } from '@/features/leads/table/lead-table-query.schema'

vi.mock('@/features/leads/views/saved-views-api', () => ({
	fetchSavedViews: vi.fn(),
	createSavedView: vi.fn(),
	deleteSavedView: vi.fn(),
}))

const current = toSavedLeadTableQuery({ ...DEFAULT_LEAD_TABLE_QUERY, statuses: ['OPEN'] })
const view = { idLeadSavedView: 3, name: 'Ganados', query: toSavedLeadTableQuery({ ...DEFAULT_LEAD_TABLE_QUERY, statuses: ['WON'] }) }

describe('SavedViewsBar', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(fetchSavedViews).mockResolvedValue([view])
	})

	it('applies a saved view', async () => {
		const onApply = vi.fn()
		render(<SavedViewsBar currentQuery={current} onApply={onApply} />)
		const select = await screen.findByLabelText('Vistas guardadas')
		await screen.findByRole('option', { name: 'Ganados' })
		fireEvent.change(select, { target: { value: '3' } })
		expect(onApply).toHaveBeenCalledWith(view.query)
	})

	it('saves the current filters under a name', async () => {
		vi.mocked(createSavedView).mockResolvedValue({ ...view, idLeadSavedView: 4, name: 'Abiertos', query: current })
		render(<SavedViewsBar currentQuery={current} onApply={vi.fn()} />)
		fireEvent.click(await screen.findByRole('button', { name: /Guardar vista/ }))
		fireEvent.change(screen.getByLabelText('Nombre de la vista'), { target: { value: ' Abiertos ' } })
		fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
		await waitFor(() => expect(createSavedView).toHaveBeenCalledWith('Abiertos', current))
		expect(fetchSavedViews).toHaveBeenCalledTimes(2)
	})

	it('shows the server error, e.g. the view limit', async () => {
		vi.mocked(createSavedView).mockRejectedValue(new Error('Puedes guardar máximo 20 vistas'))
		render(<SavedViewsBar currentQuery={current} onApply={vi.fn()} />)
		fireEvent.click(await screen.findByRole('button', { name: /Guardar vista/ }))
		fireEvent.change(screen.getByLabelText('Nombre de la vista'), { target: { value: 'X' } })
		fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
		expect(await screen.findByRole('alert')).toHaveTextContent('Puedes guardar máximo 20 vistas')
	})

	it('deletes the selected view', async () => {
		vi.mocked(deleteSavedView).mockResolvedValue()
		render(<SavedViewsBar currentQuery={current} onApply={vi.fn()} />)
		await screen.findByRole('option', { name: 'Ganados' })
		fireEvent.change(screen.getByLabelText('Vistas guardadas'), { target: { value: '3' } })
		fireEvent.click(screen.getByRole('button', { name: 'Eliminar vista' }))
		await waitFor(() => expect(deleteSavedView).toHaveBeenCalledWith(3))
	})
})
