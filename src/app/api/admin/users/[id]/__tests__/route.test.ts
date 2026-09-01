import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from '../route'
import { requireRole } from '@/lib/auth/require-role'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/auth/require-role', () => ({
	requireRole: vi.fn(),
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
		vi.mocked(requireRole).mockResolvedValue({
			ok: true,
			session: { user: { id: '1' } },
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
