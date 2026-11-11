import { describe, it, expect, vi, beforeEach } from 'vitest'

const redirectMock = vi.hoisted(() =>
	vi.fn((url: string) => {
		throw new Error(`NEXT_REDIRECT:${url}`)
	})
)
const authMock = vi.hoisted(() => vi.fn())
const getCurrentUserByEmailMock = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({ redirect: redirectMock }))
vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: getCurrentUserByEmailMock,
}))
vi.mock('@/features/negocios/services/negocios-initial-data.server', () => ({
	getNegociosInitialData: vi.fn(),
}))
vi.mock('@/features/shared/layout/DashboardLayout', () => ({
	DashboardLayout: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('../negocios-page-client', () => ({ NegociosPageClient: () => null }))

import NegociosPage from '../page'

describe('NegociosPage default date seed', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('redirects with the current month before looking up the user when the session role has a default', async () => {
		authMock.mockResolvedValue({ user: { email: 'a@b.com', role: 'ADMIN' } })

		await expect(
			NegociosPage({ searchParams: Promise.resolve({}) })
		).rejects.toThrow(/NEXT_REDIRECT:\/dashboard\/negocios\?createdFrom=/)

		expect(getCurrentUserByEmailMock).not.toHaveBeenCalled()
	})

	it('does not redirect when the URL already carries a date filter', async () => {
		authMock.mockResolvedValue({ user: { email: 'a@b.com', role: 'ADMIN' } })
		getCurrentUserByEmailMock.mockResolvedValue({ role: { code: 'ADMIN' } })

		await NegociosPage({
			searchParams: Promise.resolve({
				createdFrom: '2026-11-01',
				createdTo: '2026-11-11',
			}),
		})

		expect(redirectMock).not.toHaveBeenCalled()
	})

	it('falls back to the database role when the session role is missing', async () => {
		authMock.mockResolvedValue({ user: { email: 'a@b.com', role: null } })
		getCurrentUserByEmailMock.mockResolvedValue({ role: { code: 'ADMIN' } })

		await expect(
			NegociosPage({ searchParams: Promise.resolve({}) })
		).rejects.toThrow(/NEXT_REDIRECT:\/dashboard\/negocios\?createdFrom=/)

		expect(getCurrentUserByEmailMock).toHaveBeenCalledTimes(1)
	})
})
