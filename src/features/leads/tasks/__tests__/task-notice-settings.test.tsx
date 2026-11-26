import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from 'next-auth/react'
import { TaskNoticeSettings } from '@/features/leads/tasks/task-notice-settings'

vi.mock('next-auth/react', () => ({ useSession: vi.fn() }))

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

function jsonResponse(data: unknown, ok = true) {
	return Promise.resolve({ ok, json: async () => (ok ? { data } : { data: null, error: 'No se pudo guardar' }) })
}

describe('TaskNoticeSettings', () => {
	beforeEach(() => {
		vi.unstubAllGlobals()
		vi.mocked(useSession).mockReturnValue({ data: { user: { role: 'ADMIN' } }, status: 'authenticated' } as never)
	})

	it('loads the saved days and stores a new anticipation', async () => {
		const user = userEvent.setup()
		const fetchMock = vi.fn((url: string, init?: RequestInit) => {
			if (init?.method === 'PUT') return jsonResponse({ anticipationDays: 3 })
			return jsonResponse({ anticipationDays: 1 })
		})
		vi.stubGlobal('fetch', fetchMock)

		render(<TaskNoticeSettings />)
		await user.click(screen.getByRole('button', { name: 'Avisos' }))
		const input = await screen.findByLabelText('Días de anticipación')
		expect(input).toHaveValue(1)
		expect(screen.getByText('Se avisa un día antes y el día del vencimiento.')).toBeInTheDocument()

		await user.clear(input)
		await user.type(input, '3')
		await user.click(screen.getByRole('button', { name: 'Guardar' }))

		expect(await screen.findByText('Se avisa 3 días antes y el día del vencimiento.')).toBeInTheDocument()
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/crm/notification-settings',
			expect.objectContaining({ method: 'PUT', body: JSON.stringify({ anticipationDays: 3 }) })
		)
	})
})


describe('task notice settings visibility', () => {
	it('does not offer global settings to an AGENTE', () => {
		vi.mocked(useSession).mockReturnValue({ data: { user: { role: 'AGENTE' } }, status: 'authenticated' } as never)
		render(<TaskNoticeSettings />)
		expect(screen.queryByRole('button', { name: 'Avisos' })).not.toBeInTheDocument()
	})
})
