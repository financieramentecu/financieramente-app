import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from '../route'
import { requireRolePermission } from '@/lib/auth/require-role'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/auth/require-role', () => ({
	requireRolePermission: vi.fn(),
}))

/** Grants per actor role: a delegated user manager, a role manager, and ADMIN. */
const ACTOR_GRANTS: Record<string, string[]> = {
	ADMIN: ['usuarios.gestionar', 'roles.gestionar'],
	USER_MANAGER: ['usuarios.gestionar'],
	ROLE_MANAGER: ['usuarios.gestionar', 'roles.gestionar'],
}
vi.mock('@/features/access-control/services/role-permission-check', () => ({
	roleCan: vi.fn(async (role: string | null | undefined, code: string) =>
		(ACTOR_GRANTS[role ?? ''] ?? []).includes(code)
	),
}))

vi.mock('@/lib/prisma', () => {
	const prisma = {
		user: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		role: {
			findUnique: vi.fn(),
		},
		level: {
			findUnique: vi.fn(),
		},
		category: {
			findUnique: vi.fn(),
		},
		auditLog: {
			create: vi.fn(),
		},
		$transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
			callback(prisma)
		),
	}
	return { prisma }
})

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: { ROLE_CHANGED: 'ROLE_CHANGED', USER_ACTIVATED: 'USER_ACTIVATED', USER_DEACTIVATED: 'USER_DEACTIVATED' },
}))

function buildRequest(body: unknown) {
	return new Request('http://localhost:3000/api/admin/users/1', {
		method: 'PUT',
		body: JSON.stringify(body),
	})
}

function buildParams(id: string) {
	return { params: Promise.resolve({ id }) }
}

const CONSULTOR_ROLE = { idRole: 9, code: 'CONSULTOR', name: 'Consultor' }
const AGENTE_ROLE = { idRole: 5, code: 'AGENTE', name: 'Agente' }

describe('PUT /api/admin/users/[id] — read-only role / level guard', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireRolePermission).mockResolvedValue({
			ok: true,
			session: { user: { id: '1', role: 'ADMIN' } },
		} as never)
	})

	it('rejects with 400 when assigning a levelId to a user whose roleId resolves to CONSULTOR (role-then-level order)', async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			idUser: 1,
			idRole: 5,
			idLevel: null,
			role: AGENTE_ROLE,
			leader: null,
			email: 'user@test.com',
			active: true,
		} as never)
		vi.mocked(prisma.role.findUnique).mockResolvedValue(CONSULTOR_ROLE as never)
		vi.mocked(prisma.level.findUnique).mockResolvedValue({
			idLevel: 3,
			code: 'LEVEL_3',
			name: 'Nivel 3',
			idNextLevel: null,
		} as never)

		const response = await PUT(
			buildRequest({ roleId: 9, levelId: 3 }),
			buildParams('1')
		)

		expect(response.status).toBe(400)
		const json = await response.json()
		expect(json.success).toBe(false)
		expect(prisma.user.update).not.toHaveBeenCalled()
	})

	it('rejects with 400 when assigning a levelId to an already-CONSULTOR user (level-then-role order, no roleId in payload)', async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			idUser: 1,
			idRole: 9,
			idLevel: null,
			role: CONSULTOR_ROLE,
			leader: null,
			email: 'user@test.com',
			active: true,
		} as never)
		vi.mocked(prisma.level.findUnique).mockResolvedValue({
			idLevel: 3,
			code: 'LEVEL_3',
			name: 'Nivel 3',
			idNextLevel: null,
		} as never)

		const response = await PUT(
			buildRequest({ levelId: 3 }),
			buildParams('1')
		)

		expect(response.status).toBe(400)
		const json = await response.json()
		expect(json.success).toBe(false)
		expect(prisma.user.update).not.toHaveBeenCalled()
	})

	it('accepts assigning a levelId to a write-capable role', async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			idUser: 1,
			idRole: 5,
			idLevel: null,
			role: AGENTE_ROLE,
			leader: null,
			email: 'user@test.com',
			active: true,
			idCategory: null,
			idUserLeader: null,
		} as never)
		vi.mocked(prisma.level.findUnique).mockResolvedValue({
			idLevel: 3,
			code: 'LEVEL_3',
			name: 'Nivel 3',
			idNextLevel: null,
		} as never)
		vi.mocked(prisma.user.update).mockResolvedValue({
			idUser: 1,
			idRole: 5,
			idLevel: 3,
			role: AGENTE_ROLE,
			leader: null,
			idCategory: null,
			idUserLeader: null,
			active: true,
			name: 'Test',
			lastName: 'User',
			email: 'user@test.com',
		} as never)

		const response = await PUT(
			buildRequest({ levelId: 3 }),
			buildParams('1')
		)

		expect(response.status).toBe(200)
		expect(prisma.user.update).toHaveBeenCalled()
	})
})

describe('PUT /api/admin/users/[id] — role assignment needs role management', () => {
	const ADMIN_ROLE = { idRole: 1, code: 'ADMIN', name: 'Administrador' }
	const agenteUser = {
		idUser: 1,
		idRole: 5,
		idLevel: null,
		role: AGENTE_ROLE,
		leader: null,
		email: 'user@test.com',
		active: true,
	}
	const actAs = (role: string) =>
		vi.mocked(requireRolePermission).mockResolvedValue({
			ok: true,
			session: { user: { id: '99', role } },
		} as never)

	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.user.findUnique).mockResolvedValue(agenteUser as never)
	})

	it('rejects a delegated user manager (no roles.gestionar) assigning ADMIN', async () => {
		actAs('USER_MANAGER')
		vi.mocked(prisma.role.findUnique).mockResolvedValue(ADMIN_ROLE as never)

		const response = await PUT(buildRequest({ roleId: 1 }), buildParams('1'))

		expect(response.status).toBe(403)
		expect(prisma.user.update).not.toHaveBeenCalled()
	})

	it('rejects a delegated user manager changing any role', async () => {
		actAs('USER_MANAGER')
		vi.mocked(prisma.role.findUnique).mockResolvedValue(CONSULTOR_ROLE as never)

		const response = await PUT(buildRequest({ roleId: 9 }), buildParams('1'))

		expect(response.status).toBe(403)
		expect(prisma.user.update).not.toHaveBeenCalled()
	})

	it('rejects a non-ADMIN role manager assigning ADMIN', async () => {
		actAs('ROLE_MANAGER')
		vi.mocked(prisma.role.findUnique).mockResolvedValue(ADMIN_ROLE as never)

		const response = await PUT(buildRequest({ roleId: 1 }), buildParams('1'))

		expect(response.status).toBe(403)
		const json = await response.json()
		expect(json.error).toMatch(/Solo un administrador/)
		expect(prisma.user.update).not.toHaveBeenCalled()
	})

	it('rejects a non-ADMIN role manager removing the ADMIN role', async () => {
		actAs('ROLE_MANAGER')
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			...agenteUser,
			idRole: 1,
			role: ADMIN_ROLE,
		} as never)
		vi.mocked(prisma.role.findUnique).mockResolvedValue(AGENTE_ROLE as never)

		const response = await PUT(buildRequest({ roleId: 5 }), buildParams('1'))

		expect(response.status).toBe(403)
		expect(prisma.user.update).not.toHaveBeenCalled()
	})

	it('lets an ADMIN assign the ADMIN role', async () => {
		actAs('ADMIN')
		vi.mocked(prisma.role.findUnique).mockResolvedValue(ADMIN_ROLE as never)

		const response = await PUT(buildRequest({ roleId: 1 }), buildParams('1'))

		expect(response.status).not.toBe(403)
	})

	it('keeps editing other fields open to a user manager when the role is unchanged', async () => {
		actAs('USER_MANAGER')
		vi.mocked(prisma.role.findUnique).mockResolvedValue(AGENTE_ROLE as never)

		const response = await PUT(buildRequest({ roleId: 5, active: false }), buildParams('1'))

		expect(response.status).not.toBe(403)
	})
})
