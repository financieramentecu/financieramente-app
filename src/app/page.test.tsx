import { describe, it, expect, vi, beforeEach } from 'vitest'
import { redirect } from 'next/navigation'
import Page from './page'
import { UserRole } from '@/features/auth/lib/roles'

// Mock de next/navigation
vi.mock('next/navigation', () => ({
	redirect: vi.fn(),
}))

// Mock de next/headers
vi.mock('next/headers', () => ({
	headers: vi.fn(() => {
		throw new Error('headers() called outside request scope')
	}),
}))

// Mock de @/auth
vi.mock('@/auth', () => ({
	auth: vi.fn(() => Promise.resolve(null)),
}))

describe('Home Page', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('redirects to login when not authenticated', async () => {
		const { auth } = await import('@/auth')
		;(
			auth as unknown as ReturnType<
				typeof vi.fn<
					() => Promise<{
						user: { email: string; name: string }
						expires: string
					} | null>
				>
			>
		).mockResolvedValueOnce(null)

		await Page()

		expect(redirect).toHaveBeenCalledWith('/login')
	})

	it('redirects to dashboard when authenticated', async () => {
		const { auth } = await import('@/auth')
		;(
			auth as unknown as ReturnType<
				typeof vi.fn<
					() => Promise<{
						user: { email: string; name: string; role: UserRole }
						expires: string
					} | null>
				>
			>
		).mockResolvedValueOnce({
			user: {
				email: 'test@financieramentecu.com',
				name: 'Test User',
				role: UserRole.ADMIN, // Usar un rol válido que no sea DEFAULT
			},
			expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
		})

		await Page()

		expect(redirect).toHaveBeenCalledWith('/dashboard/negocios')
	})
})
