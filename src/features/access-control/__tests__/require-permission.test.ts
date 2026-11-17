import { describe, it, expect, vi, beforeEach } from 'vitest'

const auth = vi.fn()
const resolveRoleGrants = vi.fn()
vi.mock('@/lib/auth/nextauth', () => ({ auth: () => auth() }))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('../services/role-grants.service', () => ({
	resolveRoleGrants: (...args: unknown[]) => resolveRoleGrants(...args),
}))

import { requirePermission } from '../services/require-permission'

beforeEach(() => {
	auth.mockReset()
	resolveRoleGrants.mockReset()
})

describe('requirePermission', () => {
	it('answers 401 without a session', async () => {
		auth.mockResolvedValue(null)
		const guard = await requirePermission('roles.ver')
		expect(guard.ok).toBe(false)
		if (!guard.ok) expect(guard.response.status).toBe(401)
	})

	it('answers 403 when the role lacks the permission (fails closed)', async () => {
		auth.mockResolvedValue({ user: { id: '1', role: 'AGENTE' } })
		resolveRoleGrants.mockResolvedValue({})
		const guard = await requirePermission('roles.ver')
		expect(guard.ok).toBe(false)
		if (!guard.ok) expect(guard.response.status).toBe(403)
	})

	it('passes with the session and grants when the permission is granted', async () => {
		auth.mockResolvedValue({ user: { id: '1', role: 'ADMIN' } })
		resolveRoleGrants.mockResolvedValue({ 'roles.ver': {} })
		const guard = await requirePermission('roles.ver')
		expect(guard.ok).toBe(true)
		if (guard.ok) {
			expect(guard.grants).toEqual({ 'roles.ver': {} })
			expect(resolveRoleGrants).toHaveBeenCalledWith(expect.anything(), 'ADMIN')
		}
	})
})
