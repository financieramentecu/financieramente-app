import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { auth } from '@/lib/auth/nextauth'
import { obtenerDistribucionComision } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import { UserRole } from '@/features/auth/lib/roles'
import type { DistribucionComision } from '@/features/pre-liquidacion/types/types'

vi.mock('@/lib/auth/nextauth')
vi.mock(
	'@/features/pre-liquidacion/services/pre-liquidacion.service',
	() => ({
		obtenerDistribucionComision: vi.fn(),
	})
)
vi.mock('@/lib/prisma', () => ({
	prisma: {
		comissionDistribution: {
			findMany: vi.fn().mockResolvedValue([]),
		},
	},
}))
vi.mock('@/features/auth/lib/hierarchy', () => ({
	canViewUserDistributions: vi.fn().mockResolvedValue(false),
	isHierarchyBypassRole: vi.fn().mockReturnValue(false),
}))

const mockAuth = vi.mocked(auth)
const mockObtenerDistribucion = vi.mocked(obtenerDistribucionComision)

function makeParams(settlementCommissionId: string) {
	return { params: Promise.resolve({ settlementCommissionId }) }
}

function makeDistribucion(
	overrides: Partial<DistribucionComision> = {}
): DistribucionComision {
	return {
		idSettlementCommission: 10,
		commission_value: 1000,
		categoria: 'CARTERA',
		producto: 'Seguro de Vida',
		origen: 'DIRECTO',
		nombreAsesor: 'Juan Pérez',
		distribuciones: [
			{
				idComissionDistribution: 1,
				idBeneficiaryUser: 42,
				beneficiarioNombre: 'María Beneficiario',
				categoria: 'GENERAL',
				value_commision: 1000,
				applied_discount_percentace: 0.12,
				discount_total: 120,
				value_commission_with_discount: 880,
				commission_porcentaje: 0.5,
				percentaje_applied: 0,
				value_clawback: 0,
				comisionNeta: 880,
			},
		],
		...overrides,
	}
}

describe('GET /api/pre-liquidacion/distribucion/[settlementCommissionId]', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when session is null (unauthenticated)', async () => {
		mockAuth.mockResolvedValue(null as never)

		const request = new Request(
			'http://localhost/api/pre-liquidacion/distribucion/10'
		)
		const response = await GET(request, makeParams('10'))

		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body.data).toBeNull()
		expect(body.error).toBe('No autorizado')
		expect(mockObtenerDistribucion).not.toHaveBeenCalled()
	})

	it('returns 403 when role is not in allowed list (AGENTE)', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.AGENTE },
		} as never)

		const request = new Request(
			'http://localhost/api/pre-liquidacion/distribucion/10'
		)
		const response = await GET(request, makeParams('10'))

		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body.data).toBeNull()
		expect(body.error).toContain('Sin permisos')
		expect(mockObtenerDistribucion).not.toHaveBeenCalled()
	})

	it('returns 403 when role is DEFAULT', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.DEFAULT },
		} as never)

		const request = new Request(
			'http://localhost/api/pre-liquidacion/distribucion/10'
		)
		const response = await GET(request, makeParams('10'))

		expect(response.status).toBe(403)
		expect(mockObtenerDistribucion).not.toHaveBeenCalled()
	})

	it('returns 400 when settlementCommissionId is non-numeric', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.ADMIN },
		} as never)

		const request = new Request(
			'http://localhost/api/pre-liquidacion/distribucion/abc'
		)
		const response = await GET(request, makeParams('abc'))

		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body.data).toBeNull()
		expect(body.error).toContain('inválido')
		expect(mockObtenerDistribucion).not.toHaveBeenCalled()
	})

	it('returns 400 when settlementCommissionId is 0', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.ADMIN },
		} as never)

		const request = new Request(
			'http://localhost/api/pre-liquidacion/distribucion/0'
		)
		const response = await GET(request, makeParams('0'))

		expect(response.status).toBe(400)
		expect(mockObtenerDistribucion).not.toHaveBeenCalled()
	})

	it('returns 404 when service returns null', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.ADMIN },
		} as never)
		mockObtenerDistribucion.mockResolvedValue(null)

		const request = new Request(
			'http://localhost/api/pre-liquidacion/distribucion/999'
		)
		const response = await GET(request, makeParams('999'))

		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body.data).toBeNull()
		expect(body.error).toContain('no encontrada')
	})

	it('returns 200 with correctly shaped ApiResponse for ADMIN role', async () => {
		const distribucion = makeDistribucion()
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.ADMIN },
		} as never)
		mockObtenerDistribucion.mockResolvedValue({ distribucion })

		const request = new Request(
			'http://localhost/api/pre-liquidacion/distribucion/10'
		)
		const response = await GET(request, makeParams('10'))

		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.data).toBeDefined()
		expect(body.data.distribucion.idSettlementCommission).toBe(10)
		expect(body.data.distribucion.nombreAsesor).toBe('Juan Pérez')
		expect(Array.isArray(body.data.distribucion.distribuciones)).toBe(true)
		expect(body.data.distribucion.distribuciones[0].idBeneficiaryUser).toBe(42)
		expect(body.data.distribucion.distribuciones[0].beneficiarioNombre).toBe(
			'María Beneficiario'
		)
		expect(mockObtenerDistribucion).toHaveBeenCalledWith(10)
	})

	it('returns 200 for ASISTENTE_GERENCIA_OPERATIVA role', async () => {
		const distribucion = makeDistribucion()
		mockAuth.mockResolvedValue({
			user: { id: '2', role: UserRole.ASISTENTE_GERENCIA_OPERATIVA },
		} as never)
		mockObtenerDistribucion.mockResolvedValue({ distribucion })

		const request = new Request(
			'http://localhost/api/pre-liquidacion/distribucion/10'
		)
		const response = await GET(request, makeParams('10'))

		expect(response.status).toBe(200)
	})

	it('returns 200 for ANALISTA_SOPORTE role', async () => {
		const distribucion = makeDistribucion()
		mockAuth.mockResolvedValue({
			user: { id: '3', role: UserRole.ANALISTA_SOPORTE },
		} as never)
		mockObtenerDistribucion.mockResolvedValue({ distribucion })

		const request = new Request(
			'http://localhost/api/pre-liquidacion/distribucion/10'
		)
		const response = await GET(request, makeParams('10'))

		expect(response.status).toBe(200)
	})

	it('calls the service with the parsed integer id', async () => {
		const distribucion = makeDistribucion({ idSettlementCommission: 55 })
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.ADMIN },
		} as never)
		mockObtenerDistribucion.mockResolvedValue({ distribucion })

		const request = new Request(
			'http://localhost/api/pre-liquidacion/distribucion/55'
		)
		await GET(request, makeParams('55'))

		expect(mockObtenerDistribucion).toHaveBeenCalledWith(55)
	})
})
