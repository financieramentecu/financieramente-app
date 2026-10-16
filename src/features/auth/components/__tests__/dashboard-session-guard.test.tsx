import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
	useSession: vi.fn(),
	replace: vi.fn(),
}))

vi.mock('next-auth/react', () => ({ useSession: mocks.useSession }))
vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: mocks.replace }),
}))

import { DashboardSessionGuard } from '../dashboard-session-guard'

describe('DashboardSessionGuard', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('redirects to /login when the session becomes unauthenticated', () => {
		mocks.useSession.mockReturnValue({ data: null, status: 'unauthenticated' })
		render(
			<DashboardSessionGuard>
				<p>content</p>
			</DashboardSessionGuard>
		)
		expect(mocks.replace).toHaveBeenCalledWith('/login')
	})

	it('does not redirect while the session is loading', () => {
		mocks.useSession.mockReturnValue({ data: null, status: 'loading' })
		render(
			<DashboardSessionGuard>
				<p>content</p>
			</DashboardSessionGuard>
		)
		expect(mocks.replace).not.toHaveBeenCalled()
		expect(screen.getByText('content')).toBeTruthy()
	})

	it('does not redirect and renders children for an authenticated session', () => {
		mocks.useSession.mockReturnValue({
			data: { user: { email: 'a@x.com' } },
			status: 'authenticated',
		})
		render(
			<DashboardSessionGuard>
				<p>content</p>
			</DashboardSessionGuard>
		)
		expect(mocks.replace).not.toHaveBeenCalled()
		expect(screen.getByText('content')).toBeTruthy()
	})
})
