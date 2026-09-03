import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSession } from 'next-auth/react'
import { LeadsBoard } from '@/features/leads/components/leads-board'

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('next-auth/react', () => ({
	useSession: vi.fn(),
}))

let capturedProps: Record<string, unknown> = {}
vi.mock('@/features/leads/components/lead-detail-sheet', () => ({
	LeadDetailSheet: (props: Record<string, unknown>) => {
		capturedProps = props
		return null
	},
}))

describe('LeadsBoard — manual refresh button', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockResolvedValue({
			json: async () => ({ data: [] }),
		})
		vi.mocked(useSession).mockReturnValue({
			data: null,
			status: 'unauthenticated',
			update: vi.fn(),
		} as never)
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

describe('LeadsBoard — admin role plumbing', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		capturedProps = {}
		mockFetch.mockResolvedValue({
			json: async () => ({ data: [] }),
		})
	})

	it('passes isAdmin={true} to LeadDetailSheet for an ADMIN session', async () => {
		vi.mocked(useSession).mockReturnValue({
			data: { user: { role: 'ADMIN' }, expires: '' },
			status: 'authenticated',
			update: vi.fn(),
		} as never)

		render(<LeadsBoard />)

		await waitFor(() => expect(capturedProps.isAdmin).toBe(true))
	})

	it('passes isAdmin={false} for a non-admin/no session', async () => {
		vi.mocked(useSession).mockReturnValue({
			data: null,
			status: 'unauthenticated',
			update: vi.fn(),
		} as never)

		render(<LeadsBoard />)

		await waitFor(() => expect(capturedProps.isAdmin).toBe(false))
	})

	it('onDeleted closes the sheet and triggers refetch', async () => {
		vi.mocked(useSession).mockReturnValue({
			data: { user: { role: 'ADMIN' }, expires: '' },
			status: 'authenticated',
			update: vi.fn(),
		} as never)

		render(<LeadsBoard />)
		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

		expect(capturedProps.onDeleted).toBeInstanceOf(Function)
		act(() => {
			;(capturedProps.onDeleted as () => void)()
		})

		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
	})
})
