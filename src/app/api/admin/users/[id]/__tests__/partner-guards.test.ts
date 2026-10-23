import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from '../route'
import { POST as activate } from '../activate/route'
import { POST as deactivate } from '../deactivate/route'
import { requireRole } from '@/lib/auth/require-role'
import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
import { sendTemplatedEmail } from '@/features/email/lib/email-service'

vi.mock('@/lib/auth/require-role', () => ({ requireRole: vi.fn() }))

vi.mock('@/lib/prisma', () => {
	const prisma = {
		user: { findUnique: vi.fn(), update: vi.fn() },
		role: { findUnique: vi.fn() },
		level: { findUnique: vi.fn() },
		category: { findUnique: vi.fn() },
		auditLog: { create: vi.fn() },
		$transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
			callback(prisma)
		),
	}
	return { prisma }
})

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		ROLE_CHANGED: 'ROLE_CHANGED',
		USER_ACTIVATED: 'USER_ACTIVATED',
		USER_DEACTIVATED: 'USER_DEACTIVATED',
	},
}))

vi.mock('@/features/email/lib/email-service', () => ({
	sendTemplatedEmail: vi.fn(),
}))

const AGENTE_ROLE = { idRole: 5, code: 'AGENTE', name: 'Agente' }
const PARTNER_ROLE = { idRole: 90, code: 'PARTNER', name: 'Partner Externo' }

function request(method: string, body?: unknown) {
	return new Request('http://localhost/api/admin/users/1', {
		method,
		body: body === undefined ? undefined : JSON.stringify(body),
	})
}
const params = (id: string) => ({ params: Promise.resolve({ id }) })

function mockExisting(overrides: Record<string, unknown>) {
	vi.mocked(prisma.user.findUnique).mockResolvedValue({
		idUser: 1,
		idRole: 5,
		idLevel: 3,
		idCategory: null,
		idUserLeader: null,
		role: AGENTE_ROLE,
		level: { code: 'LEVEL_3' },
		leader: null,
		email: 'user@test.com',
		name: 'User',
		active: true,
		...overrides,
	} as never)
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(requireRole).mockResolvedValue({
		ok: true,
		session: { user: { id: '99', role: 'ADMIN' } },
	} as never)
})

describe('PUT /api/admin/users/[id] — partner guards (PM-07, ADM-01)', () => {
	it.each([
		['active', { active: false }],
		['roleId', { roleId: 5 }],
		['levelId', { levelId: 3 }],
		['leaderId', { leaderId: 4 }],
		['categoryId', { categoryId: 2 }],
	])(
		'refuses to modify a PARTNER-role user (%s) with 403 pointing to Partners',
		async (_f, body) => {
			mockExisting({ role: PARTNER_ROLE, level: { code: 'PARTNER_EXTERNAL' } })

			const response = await PUT(request('PUT', body), params('1'))
			const json = await response.json()

			expect(response.status).toBe(403)
			expect(json.success).toBe(false)
			expect(json.error).toContain('módulo Partners')
			expect(prisma.$transaction).not.toHaveBeenCalled()
			expect(prisma.user.update).not.toHaveBeenCalled()
			expect(sendTemplatedEmail).not.toHaveBeenCalled()
			expect(logAuditEvent).not.toHaveBeenCalled()
		}
	)

	it('also refuses a user holding the PARTNER_EXTERNAL level without the role', async () => {
		mockExisting({ level: { code: 'PARTNER_EXTERNAL' } })
		const response = await PUT(request('PUT', { active: false }), params('1'))
		expect(response.status).toBe(403)
		expect(prisma.user.update).not.toHaveBeenCalled()
	})

	it('rejects promoting an AGENTE to role PARTNER (400, nothing written)', async () => {
		mockExisting({})
		vi.mocked(prisma.role.findUnique).mockResolvedValue(PARTNER_ROLE as never)

		const response = await PUT(request('PUT', { roleId: 90 }), params('1'))
		const json = await response.json()

		expect(response.status).toBe(400)
		expect(json.error).toContain('módulo Partners')
		expect(prisma.user.update).not.toHaveBeenCalled()
	})

	it('rejects assigning level PARTNER_EXTERNAL to an AGENTE (400)', async () => {
		mockExisting({})
		vi.mocked(prisma.level.findUnique).mockResolvedValue({
			idLevel: 91,
			code: 'PARTNER_EXTERNAL',
			name: 'Partner Externo',
			idNextLevel: null,
		} as never)

		const response = await PUT(request('PUT', { levelId: 91 }), params('1'))

		expect(response.status).toBe(400)
		expect(prisma.user.update).not.toHaveBeenCalled()
	})

	it.each([
		[
			'PARTNER role',
			{ role: PARTNER_ROLE, level: { code: 'PARTNER_EXTERNAL' } },
		],
		[
			'PARTNER_EXTERNAL level',
			{ role: AGENTE_ROLE, level: { code: 'PARTNER_EXTERNAL' } },
		],
	])(
		'rejects naming a %s user as leader (PM-03)',
		async (_label, leaderOverrides) => {
			// First lookup: the edited user. Second: the proposed leader.
			vi.mocked(prisma.user.findUnique)
				.mockResolvedValueOnce({
					idUser: 1,
					idRole: 5,
					idLevel: 3,
					role: AGENTE_ROLE,
					level: { code: 'LEVEL_3' },
					leader: null,
					email: 'user@test.com',
					active: true,
				} as never)
				.mockResolvedValueOnce({
					idUser: 7,
					active: true,
					idLevel: 91,
					...leaderOverrides,
				} as never)

			const response = await PUT(request('PUT', { leaderId: 7 }), params('1'))
			const json = await response.json()

			expect(response.status).toBe(400)
			expect(json.error).toBe('Un partner no puede ser líder')
			expect(prisma.user.update).not.toHaveBeenCalled()
		}
	)

	it('still lets an ordinary user be edited (regression)', async () => {
		mockExisting({})
		vi.mocked(prisma.user.update).mockResolvedValue({
			idUser: 1,
			idRole: 5,
			idLevel: 3,
			idCategory: null,
			idUserLeader: null,
			role: AGENTE_ROLE,
			leader: null,
			active: true,
			name: 'U',
			lastName: null,
			email: 'user@test.com',
		} as never)
		vi.mocked(prisma.level.findUnique).mockResolvedValue({
			idLevel: 3,
			code: 'LEVEL_3',
			name: 'Nivel 3',
			idNextLevel: null,
		} as never)

		const response = await PUT(request('PUT', { levelId: 3 }), params('1'))
		expect(response.status).toBe(200)
	})
})

describe('POST /api/admin/users/[id]/activate — partner guard', () => {
	it('refuses a partner, sends no generic activation email and writes nothing', async () => {
		mockExisting({
			active: false,
			role: PARTNER_ROLE,
			level: { code: 'PARTNER_EXTERNAL' },
		})

		const response = await activate(request('POST', {}), params('1'))
		const json = await response.json()

		expect(response.status).toBe(403)
		expect(json.error).toContain('módulo Partners')
		expect(prisma.user.update).not.toHaveBeenCalled()
		expect(sendTemplatedEmail).not.toHaveBeenCalled()
		expect(logAuditEvent).not.toHaveBeenCalled()
	})
})

describe('POST /api/admin/users/[id]/deactivate — partner guard', () => {
	it('refuses a partner and writes nothing', async () => {
		mockExisting({ role: PARTNER_ROLE, level: { code: 'PARTNER_EXTERNAL' } })

		const response = await deactivate(request('POST'), params('1'))
		const json = await response.json()

		expect(response.status).toBe(403)
		expect(json.error).toContain('módulo Partners')
		expect(prisma.user.update).not.toHaveBeenCalled()
		expect(logAuditEvent).not.toHaveBeenCalled()
	})

	it('still deactivates an ordinary user (regression)', async () => {
		mockExisting({})
		vi.mocked(prisma.user.update).mockResolvedValue({
			idUser: 1,
			idRole: 5,
			name: 'U',
			email: 'user@test.com',
			active: false,
			role: AGENTE_ROLE,
		} as never)
		const response = await deactivate(request('POST'), params('1'))
		expect(response.status).toBe(200)
	})
})
