import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { RoleServiceError } from '@/features/access-control/services/role-errors'

const requirePermission = vi.fn()
const createRole = vi.fn()
const setRolePermissions = vi.fn()
const deactivateRole = vi.fn()
const auditRoleEvent = vi.fn()

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/auth/nextauth', () => ({ auth: vi.fn() }))
vi.mock('@/features/access-control/services/require-permission', () => ({
	requirePermission: (code: string) => requirePermission(code),
}))
vi.mock('@/features/access-control/services/role-admin.service', () => ({
	createRole: (...a: unknown[]) => createRole(...a),
	updateRole: vi.fn(),
	setRolePermissions: (...a: unknown[]) => setRolePermissions(...a),
	deactivateRole: (...a: unknown[]) => deactivateRole(...a),
}))
vi.mock('@/features/access-control/services/role-audit.service', () => ({
	auditRoleEvent: (...a: unknown[]) => auditRoleEvent(...a),
	resolveRoleAuditActor: () => ({ userId: 1, email: 'a@x.co' }),
}))

import { POST } from '../route'
import { DELETE } from '../[id]/route'
import { PUT as putPermissions } from '../[id]/permissions/route'

const session = { user: { id: '1', email: 'a@x.co', role: 'ADMIN' } }
const ok = { ok: true, session, grants: {} }
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const json = (body: unknown) =>
	new Request('http://t/api', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
	vi.clearAllMocks()
	requirePermission.mockResolvedValue(ok)
})

describe('roles management API', () => {
	it('returns the guard response when the permission is missing', async () => {
		requirePermission.mockResolvedValue({
			ok: false,
			response: NextResponse.json({ data: null, error: 'Sin permisos' }, { status: 403 }),
		})
		const res = await POST(json({ name: 'X' }))
		expect(res.status).toBe(403)
		expect(createRole).not.toHaveBeenCalled()
		expect(requirePermission).toHaveBeenCalledWith('roles.gestionar')
	})

	it('creates a role (201) and audits ROLE_CREATED', async () => {
		createRole.mockResolvedValue({ idRole: 9, code: 'AUDITOR', name: 'Auditor', description: null })
		const res = await POST(json({ name: 'Auditor' }))
		expect(res.status).toBe(201)
		expect(auditRoleEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'ROLE_CREATED', roleId: 9 })
		)
	})

	it('rejects an empty name with 400 and no write', async () => {
		const res = await POST(json({ name: '  ' }))
		expect(res.status).toBe(400)
		expect(createRole).not.toHaveBeenCalled()
	})

	it('maps SELF_LOCKOUT to 409 and does not audit', async () => {
		setRolePermissions.mockRejectedValue(new RoleServiceError('SELF_LOCKOUT', 'no'))
		const res = await putPermissions(json({ grants: {} }), ctx('5'))
		expect(res.status).toBe(409)
		expect(auditRoleEvent).not.toHaveBeenCalled()
	})

	it('audits permission changes only when something changed', async () => {
		setRolePermissions.mockResolvedValue({ added: [], removed: [], changed: [] })
		await putPermissions(json({ grants: { 'aportes.fondear': {} } }), ctx('5'))
		expect(auditRoleEvent).not.toHaveBeenCalled()

		setRolePermissions.mockResolvedValue({ added: ['aportes.fondear'], removed: [], changed: [] })
		const res = await putPermissions(json({ grants: { 'aportes.fondear': {} } }), ctx('5'))
		expect(res.status).toBe(200)
		expect(auditRoleEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'ROLE_PERMISSIONS_CHANGED', roleId: 5 })
		)
	})

	it('rejects a malformed id and maps ROLE_IN_USE on delete', async () => {
		expect((await DELETE(json({}), ctx('abc'))).status).toBe(400)
		deactivateRole.mockRejectedValue(new RoleServiceError('ROLE_IN_USE', 'en uso'))
		expect((await DELETE(json({}), ctx('5'))).status).toBe(409)
	})
})
