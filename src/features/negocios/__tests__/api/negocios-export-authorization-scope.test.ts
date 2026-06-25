/**
 * Integration tests for POST /api/negocios/export — authorization gate + hierarchy scope
 *
 * RED phase: written before route modifications.
 * Verifies:
 * 1. Nivel 2-6 users without admin-like role are authorized (previously rejected).
 * 2. Users outside Nivel 2-6 without admin-like role are rejected (403).
 * 3. Non-admin exporters only receive rows within their hierarchy subtree (no leakage) —
 *    this is the scope bug fix: export must apply `visibleUserIds` like the GET route does.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/auth', () => ({
	auth: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			count: vi.fn(),
			findMany: vi.fn(),
		},
		user: {
			findMany: vi.fn(),
		},
	},
}))
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/features/negocios/lib/resolve-leader-chain-export', () => ({
	resolveLeaderChainForExport: vi.fn(async () => []),
}))
vi.mock('xlsx-js-style', () => ({
	utils: {
		json_to_sheet: vi.fn(() => ({})),
		book_new: vi.fn(() => ({})),
		book_append_sheet: vi.fn(),
		decode_range: vi.fn(() => ({ s: { c: 0, r: 0 }, e: { c: 0, r: 0 } })),
		encode_cell: vi.fn(() => 'A1'),
	},
	write: vi.fn(() => Buffer.from('')),
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { UserRole } from '@/features/auth/lib/roles'
import { POST } from '@/app/api/negocios/export/route'

const mockAuth = vi.mocked(auth)
const mockGetCurrentUser = vi.mocked(getCurrentUserByEmail)
const mockCount = vi.mocked(prisma.business.count)
const mockFindMany = vi.mocked(prisma.business.findMany)
const mockUserFindMany = vi.mocked(prisma.user.findMany)

function makeSession(email = 'leader@test.com') {
	return { user: { email } }
}

function makeUser(
	idUser: number,
	roleCode: string | null,
	levelCode: string | null,
	email = 'leader@test.com'
) {
	return {
		idUser,
		email,
		name: 'Test User',
		idRole: 1,
		role: roleCode ? { code: roleCode } : null,
		level: levelCode ? { code: levelCode } : null,
	}
}

function makeRequest(body: Record<string, unknown> = {}) {
	return new Request('http://localhost/api/negocios/export', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' },
	})
}

describe('POST /api/negocios/export — authorization gate (Nivel 2-6)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockCount.mockResolvedValue(0)
		mockFindMany.mockResolvedValue([])
		mockUserFindMany.mockResolvedValue([])
	})

	it('authorizes a Nivel 2 (LEVEL_2) user without admin-like role', async () => {
		mockAuth.mockResolvedValue(makeSession() as never)
		mockGetCurrentUser.mockResolvedValue(
			makeUser(10, UserRole.AGENTE, 'LEVEL_2') as never
		)
		mockCount.mockResolvedValue(0)

		const res = await POST(makeRequest())
		// 404 (no records) is fine — what matters is it's NOT 403 (unauthorized)
		expect(res.status).not.toBe(403)
	})

	it('authorizes a Nivel 6 / GENERAL_LEVEL (MIA) user without admin-like role', async () => {
		mockAuth.mockResolvedValue(makeSession() as never)
		mockGetCurrentUser.mockResolvedValue(
			makeUser(11, UserRole.AGENTE, 'GENERAL_LEVEL') as never
		)
		mockCount.mockResolvedValue(0)

		const res = await POST(makeRequest())
		expect(res.status).not.toBe(403)
	})

	it('rejects with 403 a user outside Nivel 2-6 and without admin-like role', async () => {
		mockAuth.mockResolvedValue(makeSession() as never)
		mockGetCurrentUser.mockResolvedValue(
			makeUser(12, UserRole.AGENTE, 'LEVEL_1') as never
		)

		const res = await POST(makeRequest())
		expect(res.status).toBe(403)
	})

	it('rejects with 403 a user with no role and no level', async () => {
		mockAuth.mockResolvedValue(makeSession() as never)
		mockGetCurrentUser.mockResolvedValue(makeUser(13, null, null) as never)

		const res = await POST(makeRequest())
		expect(res.status).toBe(403)
	})
})

describe('POST /api/negocios/export — hierarchy scope (bug fix: no leakage)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockCount.mockResolvedValue(0)
		mockFindMany.mockResolvedValue([])
	})

	it('non-admin Nivel 2-6 exporter scope is restricted via visibleUserIds (same as GET)', async () => {
		const leaderId = 50
		const subordinateId = 51

		mockAuth.mockResolvedValue(makeSession() as never)
		mockGetCurrentUser.mockResolvedValue(
			makeUser(leaderId, UserRole.AGENTE, 'LEVEL_2') as never
		)

		mockUserFindMany.mockResolvedValue([
			{ idUser: leaderId, idUserLeader: null },
			{ idUser: subordinateId, idUserLeader: leaderId },
		] as never)

		mockCount.mockResolvedValue(0)

		await POST(makeRequest())

		// resolveVisibleUserIds must have triggered the BFS lookup (non-admin scope)
		expect(mockUserFindMany).toHaveBeenCalledTimes(1)

		// The where clause used for count() must scope to [leaderId, subordinateId]
		const whereArg = mockCount.mock.calls[0]?.[0]?.where
		const whereStr = JSON.stringify(whereArg ?? {})
		expect(whereStr).toContain('"in"')
		expect(whereStr).toContain(`${leaderId}`)
		expect(whereStr).toContain(`${subordinateId}`)
	})

	it('admin-like exporter is NOT scoped (no idUser filter, no BFS call)', async () => {
		mockAuth.mockResolvedValue(makeSession() as never)
		mockGetCurrentUser.mockResolvedValue(
			makeUser(60, UserRole.ADMIN, null) as never
		)
		mockCount.mockResolvedValue(0)

		await POST(makeRequest())

		expect(mockUserFindMany).not.toHaveBeenCalled()
		const whereArg = mockCount.mock.calls[0]?.[0]?.where
		const whereStr = JSON.stringify(whereArg ?? {})
		expect(whereStr).not.toContain('"idUser"')
	})
})

describe('POST /api/negocios/export — regression: existing error paths still work', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 404 "No hay registros para exportar" when filtered scope yields zero rows', async () => {
		mockAuth.mockResolvedValue(makeSession() as never)
		mockGetCurrentUser.mockResolvedValue(
			makeUser(70, UserRole.ADMIN, null) as never
		)
		mockCount.mockResolvedValue(0)

		const res = await POST(makeRequest())
		expect(res.status).toBe(404)
		const json = await res.json()
		expect(json.error).toBe('No hay registros para exportar')
	})
})
