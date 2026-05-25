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
	markCarteraPagado: vi.fn(),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
	getUserAgent: vi.fn().mockReturnValue('test-agent'),
}))

import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { markCarteraPagado } from '@/features/negocios/services/payment-state.service'

function makeRequest(body?: unknown) {
	return new Request(
		'http://localhost/api/negocios/10/aportes/1/cartera-pagado',
		{
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body ?? { paymentDate: '2025-05-20' }),
		}
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

const analistaSoporteUser = {
	idUser: 3,
	email: 'analista@test.com',
	role: { code: UserRole.ANALISTA_SOPORTE },
}

const agenteUser = {
	idUser: 2,
	email: 'agente@test.com',
	role: { code: UserRole.AGENTE },
}

const updatedPayment = {
	installmentIndex: 1,
	status: 'CARTERA_PAGADO' as const,
	dateAnchored: null,
	expectedDate: null,
	portfolioDate: '2025-05-10T00:00:00.000Z',
	earlyPaymentDate: null,
	portfolioPaymentDate: '2025-05-20T00:00:00.000Z',
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(auth).mockResolvedValue({ user: { email: 'admin@test.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)
})

describe('POST /api/negocios/[id]/aportes/[index]/cartera-pagado', () => {
	it('returns 401 when not authenticated', async () => {
		vi.mocked(auth).mockResolvedValue(null)

		const res = await POST(makeRequest(), makeParams())
		expect(res.status).toBe(401)
	})

	it('returns 403 for AGENTE role', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(agenteUser as never)

		const res = await POST(makeRequest(), makeParams())
		expect(res.status).toBe(403)
	})

	it('returns 400 when paymentDate is missing from body', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(adminUser as never)

		const res = await POST(makeRequest({}), makeParams())
		expect(res.status).toBe(400)
	})

	it('returns 400 when paymentDate has invalid format', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(adminUser as never)

		const res = await POST(makeRequest({ paymentDate: '20-05-2025' }), makeParams())
		expect(res.status).toBe(400)
	})

	it('returns 200 on happy path with ADMIN role', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(adminUser as never)
		vi.mocked(markCarteraPagado).mockResolvedValue({
			ok: true,
			payment: updatedPayment,
		})

		const res = await POST(makeRequest(), makeParams())
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body.data.status).toBe('CARTERA_PAGADO')
		expect(body.data.portfolioPaymentDate).toBe('2025-05-20T00:00:00.000Z')
	})

	it('returns 200 on happy path with ANALISTA_SOPORTE role', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { email: 'analista@test.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(analistaSoporteUser as never)
		vi.mocked(markCarteraPagado).mockResolvedValue({
			ok: true,
			payment: updatedPayment,
		})

		const res = await POST(makeRequest(), makeParams())
		expect(res.status).toBe(200)
	})

	it('returns 404 when payment not found', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(adminUser as never)
		vi.mocked(markCarteraPagado).mockResolvedValue({
			ok: false,
			code: 'NOT_FOUND',
		})

		const res = await POST(makeRequest(), makeParams())
		expect(res.status).toBe(404)
	})

	it('returns 409 on CONFLICT', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(adminUser as never)
		vi.mocked(markCarteraPagado).mockResolvedValue({
			ok: false,
			code: 'CONFLICT',
		})

		const res = await POST(makeRequest(), makeParams())
		expect(res.status).toBe(409)
	})
})
