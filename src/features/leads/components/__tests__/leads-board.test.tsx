import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LeadsBoard } from '@/features/leads/components/leads-board'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('LeadsBoard — manual refresh button', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockResolvedValue({
			json: async () => ({ data: [] }),
		})
	})

	it('renders an "Actualizar" button that triggers a new fetch on click', async () => {
		render(<LeadsBoard />)

		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

		const button = screen.getByRole('button', { name: /actualizar/i })
		expect(button).toBeInTheDocument()

		const user = userEvent.setup()
		await user.click(button)

		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
	})
})
