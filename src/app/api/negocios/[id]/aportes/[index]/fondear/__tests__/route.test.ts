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
	markPrimerPagoFondeado: vi.fn(),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
	getUserAgent: vi.fn().mockReturnValue('test-agent'),
}))

import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { markPrimerPagoFondeado } from '@/features/negocios/services/payment-state.service'

function makeRequest(body?: unknown) {
	return new Request(
		'http://localhost/api/negocios/10/aportes/1/fondear',
		{
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body ?? { fondeoDate: '2024-01-15' }),
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
	status: 'FONDEADO' as const,
	dateAnchored: '2024-01-15T00:00:00.000Z',
	expectedDate: null,
	portfolioDate: null,
	earlyPaymentDate: null,
	portfolioPaymentDate: null,
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(auth).mockResolvedValue({ user: { email: 'admin@test.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)
})

describe('POST /api/negocios/[id]/aportes/[index]/fondear', () => {
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

	it('returns 400 when fondeoDate is missing from body', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(adminUser as never)

		const res = await POST(makeRequest({}), makeParams())
		expect(res.status).toBe(400)
	})

	it('returns 400 when fondeoDate has invalid format', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(adminUser as never)

		const res = await POST(makeRequest({ fondeoDate: '15-01-2024' }), makeParams())
		expect(res.status).toBe(400)
	})

	it('returns 200 on happy path with ADMIN role', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(adminUser as never)
		vi.mocked(markPrimerPagoFondeado).mockResolvedValue({
			ok: true,
			payment: updatedPayment,
		})

		const res = await POST(makeRequest(), makeParams())
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body.data.status).toBe('FONDEADO')
		expect(body.data.dateAnchored).toBe('2024-01-15T00:00:00.000Z')
	})

	it('returns 200 on happy path with ANALISTA_SOPORTE role', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { email: 'analista@test.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(analistaSoporteUser as never)
		vi.mocked(markPrimerPagoFondeado).mockResolvedValue({
			ok: true,
			payment: updatedPayment,
		})

		const res = await POST(makeRequest(), makeParams())
		expect(res.status).toBe(200)
	})

	it('returns 409 on CONFLICT', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(adminUser as never)
		vi.mocked(markPrimerPagoFondeado).mockResolvedValue({
			ok: false,
			code: 'CONFLICT',
		})

		const res = await POST(makeRequest(), makeParams())
		expect(res.status).toBe(409)
	})

	it('returns 404 when NOT_FOUND', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(adminUser as never)
		vi.mocked(markPrimerPagoFondeado).mockResolvedValue({
			ok: false,
			code: 'NOT_FOUND',
		})

		const res = await POST(makeRequest(), makeParams())
		expect(res.status).toBe(404)
	})
})
