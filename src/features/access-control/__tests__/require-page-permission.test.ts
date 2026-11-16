import { describe, it, expect, vi, beforeEach } from 'vitest'

const auth = vi.fn()
const resolveRoleGrants = vi.fn()
const redirect = vi.fn((url: string) => {
	throw new Error(`NEXT_REDIRECT:${url}`)
})
vi.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url) }))
vi.mock('@/lib/auth/nextauth', () => ({ auth: () => auth() }))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('../services/role-grants.service', () => ({
	resolveRoleGrants: (...args: unknown[]) => resolveRoleGrants(...args),
}))

import { requirePagePermission } from '../services/require-page-permission'

beforeEach(() => {
	auth.mockReset()
	resolveRoleGrants.mockReset()
	redirect.mockClear()
})

describe('requirePagePermission', () => {
	it('redirects to /login without a session', async () => {
		auth.mockResolvedValue(null)
		await expect(requirePagePermission('roles.ver')).rejects.toThrow('NEXT_REDIRECT:/login')
	})

	it('redirects to access-denied when the role lacks the permission (fails closed)', async () => {
		auth.mockResolvedValue({ user: { id: '1', role: 'AGENTE' } })
		resolveRoleGrants.mockResolvedValue({})
		await expect(requirePagePermission('roles.ver')).rejects.toThrow(
			'NEXT_REDIRECT:/access-denied?reason=no_permissions'
		)
	})

	it('lets the page render when the role holds the permission', async () => {
		auth.mockResolvedValue({ user: { id: '1', role: 'X' } })
		resolveRoleGrants.mockResolvedValue({ 'roles.ver': {} })
		await expect(requirePagePermission('roles.ver')).resolves.toBeUndefined()
		expect(redirect).not.toHaveBeenCalled()
	})
})
