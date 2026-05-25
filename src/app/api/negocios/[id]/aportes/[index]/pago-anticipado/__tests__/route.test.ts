import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/auth', () => ({
	auth: vi.fn(),
}))

vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))

vi.mock('@/features/negocios/services/payment-state.service', () => ({
	markPagoAnticipado: vi.fn(),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
	getUserAgent: vi.fn().mockReturnValue('test-agent'),
}))

import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { markPagoAnticipado } from '@/features/negocios/services/payment-state.service'

function makeRequest() {
	return new Request(
		'http://localhost/api/negocios/10/aportes/1/pago-anticipado',
		{ method: 'POST', headers: { 'content-type': 'application/json' } }
	)
}

function makeParams(id = '10', index = '1') {
	return { params: Promise.resolve({ id, index }) }
}

const adminUser = {
	idUser: 1,
	email: 'admin@test.com',
	role: { code: UserRole.ADMIN },
}

const agenteUser = {
	idUser: 2,
	email: 'agente@test.com',
	role: { code: UserRole.AGENTE },
}

const updatedPayment = {
	installmentIndex: 1,
	status: 'PAGO_ANTICIPADO' as const,
	dateAnchored: null,
	expectedDate: null,
	portfolioDate: null,
	earlyPaymentDate: '2025-05-15T00:00:00.000Z',
	portfolioPaymentDate: null,
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(auth).mockResolvedValue({ user: { email: 'admin@test.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)
})

describe('POST /api/negocios/[id]/aportes/[index]/pago-anticipado', () => {
	it('returns 200 on happy path', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(adminUser as never)
		vi.mocked(markPagoAnticipado).mockResolvedValue({
			ok: true,
			payment: updatedPayment,
		})

		const res = await POST(makeRequest(), makeParams())
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body.data.status).toBe('PAGO_ANTICIPADO')
	})

	it('returns 403 for AGENTE role', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(agenteUser as never)

		const res = await POST(makeRequest(), makeParams())
		expect(res.status).toBe(403)
	})

	it('returns 409 on CONFLICT', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(adminUser as never)
		vi.mocked(markPagoAnticipado).mockResolvedValue({
			ok: false,
			code: 'CONFLICT',
		})

		const res = await POST(makeRequest(), makeParams())
		expect(res.status).toBe(409)
	})

	it('returns 401 when not authenticated', async () => {
		vi.mocked(auth).mockResolvedValue(null)

		const res = await POST(makeRequest(), makeParams())
		expect(res.status).toBe(401)
	})
})
