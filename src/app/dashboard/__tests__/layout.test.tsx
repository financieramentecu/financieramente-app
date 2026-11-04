import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
	auth: vi.fn(),
	redirect: vi.fn((url: string) => {
		throw new Error(`NEXT_REDIRECT:${url}`)
	}),
}))

vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/features/auth/components/dashboard-session-guard', () => ({
	DashboardSessionGuard: ({ children }: { children: React.ReactNode }) =>
		children,
}))

import DashboardRootLayout from '../layout'

describe('dashboard layout server guard', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('redirects to /login when there is no session (revoked or expired)', async () => {
		mocks.auth.mockResolvedValue(null)
		await expect(
			DashboardRootLayout({ children: <p>child</p> })
		).rejects.toThrow('NEXT_REDIRECT:/login')
	})

	it('redirects to /login when the session has no user', async () => {
		mocks.auth.mockResolvedValue({ expires: 'x' })
		await expect(
			DashboardRootLayout({ children: <p>child</p> })
		).rejects.toThrow('NEXT_REDIRECT:/login')
	})

	it('renders the children untouched for an authenticated user (no extra UI wrapper)', async () => {
		mocks.auth.mockResolvedValue({ user: { email: 'a@x.com' }, expires: 'x' })
		const children = <p>child</p>
		const result = await DashboardRootLayout({ children })
		expect(mocks.redirect).not.toHaveBeenCalled()
		// Layout returns the guard element wrapping the original children
		expect(JSON.stringify(result)).toContain('child')
	})
})
