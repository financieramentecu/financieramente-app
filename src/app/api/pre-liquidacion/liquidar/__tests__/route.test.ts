import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { auth } from '@/lib/auth/nextauth'
import { liquidarRegistros } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/lib/auth/nextauth')
vi.mock('@/features/pre-liquidacion/services/pre-liquidacion.service', () => ({
	liquidarRegistros: vi.fn(),
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	AuditAction: { COMMISSION_SETTLED: 'COMMISSION_SETTLED' },
}))

const mockAuth = vi.mocked(auth)
const mockLiquidarRegistros = vi.mocked(liquidarRegistros)

describe('POST /api/pre-liquidacion/liquidar', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when unauthenticated', async () => {
		mockAuth.mockResolvedValue(null as never)
		const request = new Request(
			'http://localhost/api/pre-liquidacion/liquidar',
			{
				method: 'POST',
				body: JSON.stringify({ ids: [1, 2], fileId: 1 }),
			}
		)
		const response = await POST(request as never)
		expect(response.status).toBe(401)
		expect(mockLiquidarRegistros).not.toHaveBeenCalled()
	})

	it('returns 403 for unauthorized role', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.AGENTE },
		} as never)
		const request = new Request(
			'http://localhost/api/pre-liquidacion/liquidar',
			{
				method: 'POST',
				body: JSON.stringify({ ids: [1, 2], fileId: 1 }),
			}
		)
		const response = await POST(request as never)
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body.error).toContain('Sin permisos')
		expect(mockLiquidarRegistros).not.toHaveBeenCalled()
	})

	it('validates body and returns 400 when ids is empty', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.ADMIN },
		} as never)
		const request = new Request(
			'http://localhost/api/pre-liquidacion/liquidar',
			{
				method: 'POST',
				body: JSON.stringify({ ids: [], fileId: 1 }),
			}
		)
		const response = await POST(request as never)
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body.data).toBeNull()
		expect(body.error).toBe('Datos inválidos')
		expect(mockLiquidarRegistros).not.toHaveBeenCalled()
	})

	it('validates body and returns 400 when fileId is missing', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.ADMIN },
		} as never)
		const request = new Request(
			'http://localhost/api/pre-liquidacion/liquidar',
			{
				method: 'POST',
				body: JSON.stringify({ ids: [1, 2] }),
			}
		)
		const response = await POST(request as never)
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body.data).toBeNull()
		expect(mockLiquidarRegistros).not.toHaveBeenCalled()
	})

	it('returns 200 with liquidated and fileCompleted when allowed role', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '10', role: UserRole.ANALISTA_SOPORTE },
		} as never)
		mockLiquidarRegistros.mockResolvedValue({
			liquidated: 3,
			fileCompleted: false,
		})

		const request = new Request(
			'http://localhost/api/pre-liquidacion/liquidar',
			{
				method: 'POST',
				body: JSON.stringify({ ids: [1, 2, 3], fileId: 1 }),
			}
		)
		const response = await POST(request as never)
		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.data).toEqual({ liquidated: 3, fileCompleted: false })
		expect(mockLiquidarRegistros).toHaveBeenCalledWith([1, 2, 3], 10, 1)
	})
})
