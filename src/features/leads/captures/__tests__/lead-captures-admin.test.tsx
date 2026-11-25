import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LeadCapturesAdmin } from '../lead-captures-admin'

afterEach(() => vi.unstubAllGlobals())
describe('LeadCapturesAdmin', () => {
	it('creates an ordered capture and deactivates it through PUT without deleting opportunities', async () => {
		const capture = {
			idLeadCapture: 7,
			name: 'Programa',
			level: 2,
			status: true,
		}
		const fetchMock = vi
			.fn()
			.mockImplementation(async (_url: string, init?: RequestInit) => ({
				ok: true,
				json: async () => ({ data: init ? capture : [capture] }),
			}))
		vi.stubGlobal('fetch', fetchMock)
		render(<LeadCapturesAdmin />)
		expect(await screen.findByText('Programa')).toBeInTheDocument()
		fireEvent.change(screen.getByLabelText('Nombre'), {
			target: { value: 'Inicial' },
		})
		fireEvent.change(screen.getByLabelText('Nivel'), { target: { value: '0' } })
		fireEvent.click(screen.getByRole('button', { name: 'Guardar captura' }))
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/admin/lead-captures',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ name: 'Inicial', level: 0, status: true }),
				})
			)
		)
		fireEvent.click(
			await screen.findByRole('button', { name: 'Editar Programa' })
		)
		fireEvent.click(screen.getByLabelText('Activa'))
		fireEvent.click(screen.getByRole('button', { name: 'Guardar captura' }))
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/admin/lead-captures/7',
				expect.objectContaining({
					method: 'PUT',
					body: JSON.stringify({ name: 'Programa', level: 2, status: false }),
				})
			)
		)
		expect(
			fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')
		).toBe(false)
	})
	it('shows load errors and permits retry', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				json: async () => ({ error: 'Sin acceso' }),
			})
		)
		render(<LeadCapturesAdmin />)
		expect(await screen.findByRole('alert')).toHaveTextContent('Sin acceso')
		expect(
			screen.getByRole('button', { name: 'Reintentar' })
		).toBeInTheDocument()
	})
})
