import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth')
vi.mock('@/features/negocios/services/user.service')
vi.mock('@/features/auth/lib/audit-logger', () => ({
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'test-agent'),
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	AuditAction: {},
}))
vi.mock('@/features/negocios/services/payment-state.service', () => ({
	updatePaymentDateAnchored: vi.fn(),
}))

import { PATCH } from '../route'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { updatePaymentDateAnchored } from '@/features/negocios/services/payment-state.service'
import { UserRole } from '@/features/auth/lib/roles'

const adminUser = {
	idUser: 1,
	email: 'admin@test.com',
	role: { code: UserRole.ADMIN },
}

const analistaUser = {
	idUser: 2,
	email: 'analista@test.com',
	role: { code: UserRole.ANALISTA_SOPORTE },
}

const agenteUser = {
	idUser: 3,
	email: 'agente@test.com',
	role: { code: UserRole.AGENTE },
}

const coachUser = {
	idUser: 4,
	email: 'coach@test.com',
	role: { code: 'COACH' },
}

const validSession = { user: { email: 'admin@test.com' } }

function makeRequest(body: unknown) {
	return new Request(
		'http://localhost/api/negocios/1/aportes/1/date-anchored',
		{
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		}
	)
}

const routeParams = { params: Promise.resolve({ id: '1', index: '1' }) }

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(auth).mockResolvedValue(validSession as Awaited<ReturnType<typeof auth>>)
	vi.mocked(getCurrentUserByEmail).mockResolvedValue(adminUser as ReturnType<typeof getCurrentUserByEmail> extends Promise<infer T> ? T : never)
	vi.mocked(updatePaymentDateAnchored).mockResolvedValue({
		ok: true,
		payment: {
			installmentIndex: 1,
			status: 'FONDEADO',
			dateAnchored: '2026-06-15T12:00:00.000Z',
			expectedDate: null,
			portfolioDate: null,
			earlyPaymentDate: null,
			portfolioPaymentDate: null,
		},
	})
})

describe('PATCH /api/negocios/[id]/aportes/[index]/date-anchored', () => {
	describe('ADMIN → 200', () => {
		it('returns 200 with updated payment for ADMIN', async () => {
			const req = makeRequest({ dateAnchored: '2026-06-15' })
			const res = await PATCH(req, routeParams)

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data).toBeDefined()
			expect(body.data.dateAnchored).toBe('2026-06-15T12:00:00.000Z')
		})
	})

	describe('ANALISTA_SOPORTE → 200', () => {
		it('returns 200 with updated payment for ANALISTA_SOPORTE', async () => {
			vi.mocked(getCurrentUserByEmail).mockResolvedValue(analistaUser as ReturnType<typeof getCurrentUserByEmail> extends Promise<infer T> ? T : never)
			const req = makeRequest({ dateAnchored: '2026-06-15' })
			const res = await PATCH(req, routeParams)

			expect(res.status).toBe(200)
		})
	})

	describe('AGENTE → 403', () => {
		it('returns 403 for AGENTE role', async () => {
			vi.mocked(getCurrentUserByEmail).mockResolvedValue(agenteUser as ReturnType<typeof getCurrentUserByEmail> extends Promise<infer T> ? T : never)
			const req = makeRequest({ dateAnchored: '2026-06-15' })
			const res = await PATCH(req, routeParams)

			expect(res.status).toBe(403)
			expect(updatePaymentDateAnchored).not.toHaveBeenCalled()
		})
	})

	describe('COACH → 403', () => {
		it('returns 403 for COACH role', async () => {
			vi.mocked(getCurrentUserByEmail).mockResolvedValue(coachUser as ReturnType<typeof getCurrentUserByEmail> extends Promise<infer T> ? T : never)
			const req = makeRequest({ dateAnchored: '2026-06-15' })
			const res = await PATCH(req, routeParams)

			expect(res.status).toBe(403)
			expect(updatePaymentDateAnchored).not.toHaveBeenCalled()
		})
	})

	describe('CONSULTOR (read-only) → 403', () => {
		it('returns 403 — canFundPayments already excludes it', async () => {
			vi.mocked(getCurrentUserByEmail).mockResolvedValue({
				idUser: 9,
				email: 'consultor@test.com',
				role: { code: UserRole.CONSULTOR },
			} as ReturnType<typeof getCurrentUserByEmail> extends Promise<infer T> ? T : never)
			const req = makeRequest({ dateAnchored: '2026-06-15' })
			const res = await PATCH(req, routeParams)

			expect(res.status).toBe(403)
			expect(updatePaymentDateAnchored).not.toHaveBeenCalled()
		})
	})

	describe('invalid body → 400', () => {
		it('returns 400 for missing dateAnchored field', async () => {
			const req = makeRequest({})
			const res = await PATCH(req, routeParams)

			expect(res.status).toBe(400)
			expect(updatePaymentDateAnchored).not.toHaveBeenCalled()
		})

		it('returns 400 for invalid date format', async () => {
			const req = makeRequest({ dateAnchored: 'not-a-date' })
			const res = await PATCH(req, routeParams)

			expect(res.status).toBe(400)
		})
	})

	describe('non-FONDEADO payment → 409', () => {
		it('returns 409 when service returns CONFLICT', async () => {
			vi.mocked(updatePaymentDateAnchored).mockResolvedValue({ ok: false, code: 'CONFLICT' })
			const req = makeRequest({ dateAnchored: '2026-06-15' })
			const res = await PATCH(req, routeParams)

			expect(res.status).toBe(409)
		})
	})

	describe('unauthenticated → 401', () => {
		it('returns 401 when no session', async () => {
			vi.mocked(auth).mockResolvedValue(null)
			const req = makeRequest({ dateAnchored: '2026-06-15' })
			const res = await PATCH(req, routeParams)

			expect(res.status).toBe(401)
		})
	})
})
