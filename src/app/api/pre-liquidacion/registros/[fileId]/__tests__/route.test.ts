import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { auth } from '@/lib/auth/nextauth'
import { obtenerRegistrosParaLiquidacion } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/lib/auth/nextauth')
vi.mock('@/features/pre-liquidacion/services/pre-liquidacion.service', () => ({
	obtenerRegistrosParaLiquidacion: vi.fn(),
}))

const mockAuth = vi.mocked(auth)
const mockObtenerRegistros = vi.mocked(obtenerRegistrosParaLiquidacion)

function makeParams(fileId: string) {
	return { params: Promise.resolve({ fileId }) }
}

describe('GET /api/pre-liquidacion/registros/[fileId]', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when unauthenticated', async () => {
		mockAuth.mockResolvedValue(null as never)
		const request = new Request('http://localhost/api/pre-liquidacion/registros/1')
		const response = await GET(request, makeParams('1'))
		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body.data).toBeNull()
		expect(body.error).toBe('No autorizado')
		expect(mockObtenerRegistros).not.toHaveBeenCalled()
	})

	it('returns 403 for unauthorized role', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.AGENTE },
		} as never)
		const request = new Request('http://localhost/api/pre-liquidacion/registros/1')
		const response = await GET(request, makeParams('1'))
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body.data).toBeNull()
		expect(body.error).toContain('Sin permisos')
		expect(mockObtenerRegistros).not.toHaveBeenCalled()
	})

	it('returns 200 with correct shape for allowed role (ANALISTA_SOPORTE)', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.ANALISTA_SOPORTE },
		} as never)
		const mockData = {
			archivo: {
				idFileImport: 1,
				nombreArchivo: 'test.xlsx',
				fileType: 'VOLUNTARIA',
				usuarioCargo: 'John Doe',
				fechaCarga: '2024-01-15',
				totalRegistros: 10,
				sincronizados: 2,
				rezagados: 0,
				estado: 'LOAD',
			},
			registros: [
				{
					idSettlementCommission: 100,
					idBusiness: 1,
					contrato: 'C-001',
					nombreAsesor: 'Jane Smith',
					nombreCliente: 'John Doe',
					status: 'SYNCHRONIZED',
					tipo: 'BASE',
					monto: 1000,
					baseComision: 1000,
					porcentajeDescuento: 0.1,
					porcentajeClawback: 0,
					esClawback: false,
					esRezagado: false,
					fechaSincronizacion: '2024-01-10T00:00:00.000Z',
					fechaRezagado: null,
					fechaInicio: '2024-01-01',
					fechaFin: '2024-12-31',
				},
			],
		}
		mockObtenerRegistros.mockResolvedValue(mockData)

		const request = new Request('http://localhost/api/pre-liquidacion/registros/1')
		const response = await GET(request, makeParams('1'))
		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.data).toEqual(mockData)
		expect(body.data.archivo).toHaveProperty('fileType')
		expect(body.data.archivo.fileType).toBe('VOLUNTARIA')
		expect(Array.isArray(body.data.registros)).toBe(true)
		expect(mockObtenerRegistros).toHaveBeenCalledWith(1)
	})

	it('returns 404 when file does not exist', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.ADMIN },
		} as never)
		mockObtenerRegistros.mockResolvedValue(null)

		const request = new Request('http://localhost/api/pre-liquidacion/registros/999')
		const response = await GET(request, makeParams('999'))
		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body.data).toBeNull()
		expect(body.error).toContain('Archivo no encontrado')
	})

	it('returns 400 when fileId is invalid', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', role: UserRole.ADMIN },
		} as never)

		const request = new Request('http://localhost/api/pre-liquidacion/registros/0')
		const response = await GET(request, makeParams('0'))
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body.data).toBeNull()
	})
})
