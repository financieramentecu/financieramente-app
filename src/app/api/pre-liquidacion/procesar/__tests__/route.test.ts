import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { auth } from '@/lib/auth/nextauth'
import { procesarPreLiquidacion } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/lib/auth/nextauth')
vi.mock('@/features/pre-liquidacion/services/pre-liquidacion.service', () => ({
	procesarPreLiquidacion: vi.fn(),
}))

const mockAuth = vi.mocked(auth)
const mockProcesarPreLiquidacion = vi.mocked(procesarPreLiquidacion)

function makeRequest(body: unknown) {
	return new Request('http://localhost/api/pre-liquidacion/procesar', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
}

describe('POST /api/pre-liquidacion/procesar', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when unauthenticated', async () => {
		mockAuth.mockResolvedValue(null as never)

		const response = await POST(makeRequest({ fileImportId: 1, mes: '2026-01' }) as never)

		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body.error).toBe('No autorizado')
		expect(mockProcesarPreLiquidacion).not.toHaveBeenCalled()
	})

	it('returns 403 when role is not in ALLOWED_ROLES (AGENTE)', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.AGENTE },
		} as never)

		const response = await POST(makeRequest({ fileImportId: 1, mes: '2026-01' }) as never)

		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body.error).toBe('Forbidden')
		expect(mockProcesarPreLiquidacion).not.toHaveBeenCalled()
	})

	it('returns 403 when role is ANALISTA_SOPORTE (not in ALLOWED_ROLES)', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '2', role: UserRole.ANALISTA_SOPORTE },
		} as never)

		const response = await POST(makeRequest({ fileImportId: 1, mes: '2026-01' }) as never)

		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body.error).toBe('Forbidden')
		expect(mockProcesarPreLiquidacion).not.toHaveBeenCalled()
	})

	it('returns 403 when role is DEFAULT', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '3', role: UserRole.DEFAULT },
		} as never)

		const response = await POST(makeRequest({ fileImportId: 1, mes: '2026-01' }) as never)

		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body.error).toBe('Forbidden')
	})

	it('returns 200 for ADMIN role when service succeeds', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '10', role: UserRole.ADMIN },
		} as never)
		mockProcesarPreLiquidacion.mockResolvedValue({
			success: true,
			registrosProcesados: 5,
			mensaje: 'Pre-liquidación completada: 5 registros procesados',
		})

		const response = await POST(makeRequest({ fileImportId: 1, mes: '2026-01' }) as never)

		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.success).toBe(true)
		expect(body.registrosProcesados).toBe(5)
		expect(mockProcesarPreLiquidacion).toHaveBeenCalledOnce()
	})

	it('returns 200 for ASISTENTE_GERENCIA_OPERATIVA role when service succeeds', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '11', role: UserRole.ASISTENTE_GERENCIA_OPERATIVA },
		} as never)
		mockProcesarPreLiquidacion.mockResolvedValue({
			success: true,
			registrosProcesados: 3,
			mensaje: 'Pre-liquidación completada: 3 registros procesados',
		})

		const response = await POST(makeRequest({ fileImportId: 2, mes: '2026-02' }) as never)

		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.success).toBe(true)
		expect(mockProcesarPreLiquidacion).toHaveBeenCalledOnce()
	})

	it('returns 400 when body is missing both mes and date range', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '10', role: UserRole.ADMIN },
		} as never)

		const response = await POST(makeRequest({ fileImportId: 1 }) as never)

		expect(response.status).toBe(400)
		expect(mockProcesarPreLiquidacion).not.toHaveBeenCalled()
	})
})
