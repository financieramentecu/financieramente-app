import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth')
vi.mock('@/features/negocios/services/user.service')
vi.mock('@/features/auth/lib/audit-logger', () => ({
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'test-agent'),
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	AuditAction: { BUSINESS_DATE_ANCHORED_UPDATED: 'BUSINESS_DATE_ANCHORED_UPDATED' },
}))
vi.mock('@/features/negocios/services/business-date-anchored.service', () => ({
	updateBusinessDateAnchored: vi.fn(),
}))

import { PATCH } from '../route'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { updateBusinessDateAnchored } from '@/features/negocios/services/business-date-anchored.service'
import { UserRole } from '@/features/auth/lib/roles'

const adminUser = {
	idUser: 1,
	email: 'admin@test.com',
	role: { code: UserRole.ADMIN },
}

const agenteUser = {
	idUser: 3,
	email: 'agente@test.com',
	role: { code: UserRole.AGENTE },
}

const validSession = { user: { email: 'admin@test.com' } }

function makeRequest(body: unknown) {
	return new Request('http://localhost/api/negocios/1/date-anchored', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
}

const routeParams = { params: Promise.resolve({ id: '1' }) }

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(auth).mockResolvedValue(validSession as Awaited<ReturnType<typeof auth>>)
	vi.mocked(getCurrentUserByEmail).mockResolvedValue(
		adminUser as ReturnType<typeof getCurrentUserByEmail> extends Promise<infer T> ? T : never
	)
	vi.mocked(updateBusinessDateAnchored).mockResolvedValue({
		ok: true,
		business: { id: 1, dateAnchored: '2020-01-15T12:00:00.000Z' } as never,
	})
})

describe('PATCH /api/negocios/[id]/date-anchored', () => {
	it('returns 200 with the updated business for an authorized past date', async () => {
		const req = makeRequest({ dateAnchored: '2020-01-15' })
		const res = await PATCH(req, routeParams)

		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.data).toBeDefined()
		expect(updateBusinessDateAnchored).toHaveBeenCalled()
	})

	it('returns 400 for a future date', async () => {
		const future = new Date()
		future.setFullYear(future.getFullYear() + 1)
		const futureStr = future.toISOString().slice(0, 10)

		const req = makeRequest({ dateAnchored: futureStr })
		const res = await PATCH(req, routeParams)

		expect(res.status).toBe(400)
		expect(updateBusinessDateAnchored).not.toHaveBeenCalled()
	})

	it('returns 400 for malformed body', async () => {
		const req = makeRequest({ dateAnchored: 'not-a-date' })
		const res = await PATCH(req, routeParams)

		expect(res.status).toBe(400)
	})

	it('returns 403 for a user without canFundPayments permission', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(
			agenteUser as ReturnType<typeof getCurrentUserByEmail> extends Promise<infer T> ? T : never
		)
		const req = makeRequest({ dateAnchored: '2020-01-15' })
		const res = await PATCH(req, routeParams)

		expect(res.status).toBe(403)
		expect(updateBusinessDateAnchored).not.toHaveBeenCalled()
	})

	it('returns 403 for CONSULTOR (read-only) — canFundPayments already excludes it', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 9,
			email: 'consultor@test.com',
			role: { code: UserRole.CONSULTOR },
		} as ReturnType<typeof getCurrentUserByEmail> extends Promise<infer T> ? T : never)
		const req = makeRequest({ dateAnchored: '2020-01-15' })
		const res = await PATCH(req, routeParams)

		expect(res.status).toBe(403)
		expect(updateBusinessDateAnchored).not.toHaveBeenCalled()
	})

	it('returns 404 when the business does not exist', async () => {
		vi.mocked(updateBusinessDateAnchored).mockResolvedValue({
			ok: false,
			code: 'NOT_FOUND',
		})
		const req = makeRequest({ dateAnchored: '2020-01-15' })
		const res = await PATCH(req, routeParams)

		expect(res.status).toBe(404)
	})

	it('returns 401 when unauthenticated', async () => {
		vi.mocked(auth).mockResolvedValue(null)
		const req = makeRequest({ dateAnchored: '2020-01-15' })
		const res = await PATCH(req, routeParams)

		expect(res.status).toBe(401)
	})
})
