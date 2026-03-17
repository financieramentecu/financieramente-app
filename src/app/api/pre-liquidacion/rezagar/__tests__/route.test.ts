import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { auth } from '@/lib/auth/nextauth'
import { rezagarRegistros } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/lib/auth/nextauth')
vi.mock('@/features/pre-liquidacion/services/pre-liquidacion.service', () => ({
	rezagarRegistros: vi.fn(),
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	AuditAction: { COMMISSION_LAGGED: 'COMMISSION_LAGGED' },
}))

const mockAuth = vi.mocked(auth)
const mockRezagarRegistros = vi.mocked(rezagarRegistros)

describe('POST /api/pre-liquidacion/rezagar', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when unauthenticated', async () => {
		mockAuth.mockResolvedValue(null as never)
		const request = new Request(
			'http://localhost/api/pre-liquidacion/rezagar',
			{
				method: 'POST',
				body: JSON.stringify({ ids: [1, 2] }),
			}
		)
		const response = await POST(request as never)
		expect(response.status).toBe(401)
		expect(mockRezagarRegistros).not.toHaveBeenCalled()
	})

	it('returns 403 for unauthorized role', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.DEFAULT },
		} as never)
		const request = new Request(
			'http://localhost/api/pre-liquidacion/rezagar',
			{
				method: 'POST',
				body: JSON.stringify({ ids: [1, 2] }),
			}
		)
		const response = await POST(request as never)
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body.error).toContain('Sin permisos')
		expect(mockRezagarRegistros).not.toHaveBeenCalled()
	})

	it('validates body and returns 400 when ids is empty', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.ADMIN },
		} as never)
		const request = new Request(
			'http://localhost/api/pre-liquidacion/rezagar',
			{
				method: 'POST',
				body: JSON.stringify({ ids: [] }),
			}
		)
		const response = await POST(request as never)
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body.data).toBeNull()
		expect(body.error).toBe('Datos inválidos')
		expect(mockRezagarRegistros).not.toHaveBeenCalled()
	})

	it('returns 200 with lagged count when allowed role', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '10', role: UserRole.ASISTENTE_GERENCIA_OPERATIVA },
		} as never)
		mockRezagarRegistros.mockResolvedValue({ lagged: 2 })

		const request = new Request(
			'http://localhost/api/pre-liquidacion/rezagar',
			{
				method: 'POST',
				body: JSON.stringify({ ids: [4, 5] }),
			}
		)
		const response = await POST(request as never)
		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.data).toEqual({ lagged: 2 })
		expect(mockRezagarRegistros).toHaveBeenCalledWith([4, 5], 10)
	})
})
