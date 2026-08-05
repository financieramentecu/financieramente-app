import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LeadFunnelColumn } from '@prisma/client'
import { FunnelColumnsAdminTable } from '../funnel-columns-admin-table'

const mockFetch = vi.fn()
global.fetch = mockFetch

function makeColumn(overrides: Partial<LeadFunnelColumn>): LeadFunnelColumn {
	return {
		idLeadFunnelColumn: 1,
		name: 'Nuevo',
		externalStatusKey: 'nuevo',
		position: 0,
		isFallback: false,
		active: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as LeadFunnelColumn
}

// dnd-kit's KeyboardSensor (`sortableKeyboardCoordinates`) needs real, distinct
// rects per row to compute the "next droppable" on ArrowDown/ArrowUp — jsdom
// returns an all-zero rect by default, which makes every row indistinguishable
// and the sensor never emits a different `over` id. Rects are derived live from
// each `<tr>`'s current position among its siblings, so they stay correct even
// after a reorder re-shuffles the DOM.
function mockRowRects() {
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
		this: HTMLElement
	) {
		const rowIndex =
			this.tagName === 'TR' && this.parentElement
				? Array.from(this.parentElement.children).indexOf(this)
				: 0
		const top = rowIndex * 40
		return {
			width: 300,
			height: 40,
			top,
			left: 0,
			right: 300,
			bottom: top + 40,
			x: 0,
			y: top,
			toJSON: () => {},
		} as DOMRect
	})
}

describe('FunnelColumnsAdminTable — drag & drop reorder', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockRowRects()
	})

	it('reorders via keyboard drag & drop and persists the changed positions via PATCH', async () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', position: 0 }),
			makeColumn({ idLeadFunnelColumn: 2, name: 'B', position: 1 }),
		]
		mockFetch.mockImplementation((url: string) => {
			if (url.includes('/1')) {
				return Promise.resolve({
					json: async () => ({
						data: makeColumn({ idLeadFunnelColumn: 1, name: 'A', position: 1 }),
					}),
				})
			}
			return Promise.resolve({
				json: async () => ({
					data: makeColumn({ idLeadFunnelColumn: 2, name: 'B', position: 0 }),
				}),
			})
		})

		render(<FunnelColumnsAdminTable initialColumns={columns} />)

		const handles = screen.getAllByRole('button', { name: /reordenar columna/i })
		handles[0].focus()

		const user = userEvent.setup()
		await user.keyboard('[Space]')
		await user.keyboard('[ArrowDown]')
		await user.keyboard('[Space]')

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/leads/funnel-columns/1',
				expect.objectContaining({
					method: 'PATCH',
					body: JSON.stringify({ position: 1 }),
				})
			)
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/leads/funnel-columns/2',
				expect.objectContaining({
					method: 'PATCH',
					body: JSON.stringify({ position: 0 }),
				})
			)
		})

		const rows = screen.getAllByRole('row').slice(1) // skip header row
		expect(rows[0]).toHaveTextContent('B')
		expect(rows[1]).toHaveTextContent('A')
	})

	it('reverts the optimistic reorder and shows a toast error when a PATCH fails', async () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', position: 0 }),
			makeColumn({ idLeadFunnelColumn: 2, name: 'B', position: 1 }),
		]
		mockFetch.mockImplementation((url: string) => {
			if (url.includes('/1')) {
				return Promise.resolve({
					json: async () => ({ data: null, error: 'No se pudo reordenar' }),
				})
			}
			return Promise.resolve({
				json: async () => ({
					data: makeColumn({ idLeadFunnelColumn: 2, name: 'B', position: 0 }),
				}),
			})
		})

		render(<FunnelColumnsAdminTable initialColumns={columns} />)

		const handles = screen.getAllByRole('button', { name: /reordenar columna/i })
		handles[0].focus()

		const user = userEvent.setup()
		await user.keyboard('[Space]')
		await user.keyboard('[ArrowDown]')
		await user.keyboard('[Space]')

		await waitFor(() => {
			const rows = screen.getAllByRole('row').slice(1)
			expect(rows[0]).toHaveTextContent('A')
			expect(rows[1]).toHaveTextContent('B')
		})
	})
})

describe('FunnelColumnsAdminTable — edit modal', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('opens a modal on "Editar" with the name editable and externalStatusKey read-only', async () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', externalStatusKey: 'A', position: 0 }),
		]
		render(<FunnelColumnsAdminTable initialColumns={columns} />)

		const user = userEvent.setup()
		await user.click(screen.getByRole('button', { name: /editar/i }))

		const dialog = screen.getByRole('dialog')
		expect(within(dialog).getByLabelText(/^nombre$/i)).toBeEnabled()
		expect(
			within(dialog).getByLabelText(/clave de estado \(contrato del webhook\)/i)
		).toBeDisabled()
		expect(
			within(dialog).getByText(/no se puede modificar después de creada/i)
		).toBeInTheDocument()
	})

	it('edits the name and saves via PATCH with only the name field', async () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', externalStatusKey: 'A', position: 0 }),
		]
		mockFetch.mockResolvedValue({
			json: async () => ({
				data: makeColumn({
					idLeadFunnelColumn: 1,
					name: 'A editado',
					externalStatusKey: 'A',
					position: 0,
				}),
			}),
		})

		render(<FunnelColumnsAdminTable initialColumns={columns} />)

		const user = userEvent.setup()
		await user.click(screen.getByRole('button', { name: /editar/i }))

		const dialog = screen.getByRole('dialog')
		const nameInput = within(dialog).getByLabelText(/^nombre$/i)
		await user.clear(nameInput)
		await user.type(nameInput, 'A editado')

		await user.click(within(dialog).getByRole('button', { name: /guardar/i }))

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/leads/funnel-columns/1',
				expect.objectContaining({
					method: 'PATCH',
					body: JSON.stringify({ name: 'A editado' }),
				})
			)
		})

		expect(await screen.findByText('A editado')).toBeInTheDocument()
	})

	it('does not allow saving with an empty name', async () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', externalStatusKey: 'A', position: 0 }),
		]
		render(<FunnelColumnsAdminTable initialColumns={columns} />)

		const user = userEvent.setup()
		await user.click(screen.getByRole('button', { name: /editar/i }))

		const dialog = screen.getByRole('dialog')
		const nameInput = within(dialog).getByLabelText(/^nombre$/i)
		await user.clear(nameInput)

		await user.click(within(dialog).getByRole('button', { name: /guardar/i }))

		expect(mockFetch).not.toHaveBeenCalled()
	})

	it('shows a toast-worthy error via the API response when the save fails', async () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', externalStatusKey: 'A', position: 0 }),
		]
		mockFetch.mockResolvedValue({
			json: async () => ({
				data: null,
				error: 'No se pudo actualizar la columna',
			}),
		})

		render(<FunnelColumnsAdminTable initialColumns={columns} />)

		const user = userEvent.setup()
		await user.click(screen.getByRole('button', { name: /editar/i }))

		const dialog = screen.getByRole('dialog')
		const nameInput = within(dialog).getByLabelText(/^nombre$/i)
		await user.clear(nameInput)
		await user.type(nameInput, 'B')

		await user.click(within(dialog).getByRole('button', { name: /guardar/i }))

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/leads/funnel-columns/1',
				expect.objectContaining({ method: 'PATCH' })
			)
		})

		// modal stays open (save failed) with the in-progress value still there
		expect(within(screen.getByRole('dialog')).getByLabelText(/^nombre$/i)).toHaveValue('B')
	})

	it('cancels the modal without triggering any PATCH and discards the in-progress change', async () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', externalStatusKey: 'KEY_A', position: 0 }),
		]
		render(<FunnelColumnsAdminTable initialColumns={columns} />)

		const user = userEvent.setup()
		await user.click(screen.getByRole('button', { name: /editar/i }))

		const dialog = screen.getByRole('dialog')
		const nameInput = within(dialog).getByLabelText(/^nombre$/i)
		await user.clear(nameInput)
		await user.type(nameInput, 'Cambio descartado')

		await user.click(within(dialog).getByRole('button', { name: /cancelar/i }))

		expect(mockFetch).not.toHaveBeenCalled()
		expect(screen.getByText('A')).toBeInTheDocument()
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})
})

describe('FunnelColumnsAdminTable — externalStatusKey copy', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('shows a descriptive label and help text for externalStatusKey in the creation form', () => {
		render(<FunnelColumnsAdminTable initialColumns={[]} />)

		const createForm = screen.getByTestId('funnel-column-create-form')
		expect(
			within(createForm).getByLabelText(/clave de estado \(contrato del webhook\)/i)
		).toBeInTheDocument()
		expect(
			within(createForm).getByText(/vos decidís el valor libremente/i)
		).toBeInTheDocument()
		expect(
			within(createForm).getByText(/webhook del crm\/n8n/i)
		).toBeInTheDocument()
	})

	it('shows externalStatusKey read-only in the edit modal, with the immutability note instead of the free-choice help text', async () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', externalStatusKey: 'A', position: 0 }),
		]
		render(<FunnelColumnsAdminTable initialColumns={columns} />)

		const user = userEvent.setup()
		await user.click(screen.getByRole('button', { name: /editar/i }))

		const dialog = screen.getByRole('dialog')
		expect(
			within(dialog).getByLabelText(/clave de estado \(contrato del webhook\)/i)
		).toBeDisabled()
		expect(
			within(dialog).getByText(/no se puede modificar después de creada/i)
		).toBeInTheDocument()
	})

	it('uppercases and replaces spaces with underscores live as the admin types', async () => {
		render(<FunnelColumnsAdminTable initialColumns={[]} />)

		const createForm = screen.getByTestId('funnel-column-create-form')
		const keyInput = within(createForm).getByLabelText(/clave de estado \(contrato del webhook\)/i)

		const user = userEvent.setup()
		await user.type(keyInput, 'en revision')

		expect(keyInput).toHaveValue('EN_REVISION')
	})
})

describe('FunnelColumnsAdminTable — delete confirmation', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('does not call the delete endpoint until the confirmation dialog is accepted', async () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', externalStatusKey: 'a', position: 0 }),
		]
		render(<FunnelColumnsAdminTable initialColumns={columns} />)

		const user = userEvent.setup()
		await user.click(screen.getByRole('button', { name: /eliminar/i }))

		expect(mockFetch).not.toHaveBeenCalled()
		expect(screen.getByRole('alertdialog')).toBeInTheDocument()
		expect(screen.getByText(/seguro que querés eliminar la columna "a"/i)).toBeInTheDocument()
	})

	it('deletes and removes the row when the confirmation is accepted', async () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', externalStatusKey: 'a', position: 0 }),
		]
		mockFetch.mockResolvedValue({
			json: async () => ({ data: { idLeadFunnelColumn: 1 } }),
		})
		render(<FunnelColumnsAdminTable initialColumns={columns} />)

		const user = userEvent.setup()
		await user.click(screen.getByRole('button', { name: /eliminar/i }))
		const dialog = screen.getByRole('alertdialog')
		await user.click(within(dialog).getByRole('button', { name: /^eliminar$/i }))

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/leads/funnel-columns/1',
				expect.objectContaining({ method: 'DELETE' })
			)
		})
		await waitFor(() => {
			expect(screen.queryByText('A')).not.toBeInTheDocument()
		})
	})

	it('keeps the row and never calls the endpoint when the deletion is canceled', async () => {
		const columns = [
			makeColumn({ idLeadFunnelColumn: 1, name: 'A', externalStatusKey: 'a', position: 0 }),
		]
		render(<FunnelColumnsAdminTable initialColumns={columns} />)

		const user = userEvent.setup()
		await user.click(screen.getByRole('button', { name: /eliminar/i }))
		await user.click(screen.getByRole('button', { name: /cancelar/i }))

		expect(mockFetch).not.toHaveBeenCalled()
		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
		expect(screen.getByText('A')).toBeInTheDocument()
	})
})
