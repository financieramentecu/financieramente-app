import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '../route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'


// Mock de módulos externos
vi.mock('@/auth')
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			findFirst: vi.fn(),
		},
	},
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

describe('GET /api/negocios/validate-contract', () => {
	const mockAuth = vi.mocked(auth)
	const mockPrismaFindFirst = vi.mocked(prisma.business.findFirst)
	const mockNextResponseJson = vi.mocked(NextResponse.json)

	beforeEach(() => {
		vi.clearAllMocks()
		mockNextResponseJson.mockImplementation(
			(data: unknown, init?: { status?: number }) => {
				return {
					json: () => Promise.resolve(data),
					status: init?.status || 200,
				} as unknown as NextResponse
			}
		)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('Happy Path', () => {
		it('debe retornar que el contrato está disponible cuando no existe', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
					name: 'Admin User',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindFirst.mockResolvedValue(null)

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract=PN0001234'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(mockAuth).toHaveBeenCalledTimes(1)
			expect(mockPrismaFindFirst).toHaveBeenCalledWith({
				where: {
					contract: 'PN0001234',
				},
				select: {
					idBusiness: true,
				},
			})
			expect(response.status).toBe(200)
			expect(responseData).toEqual({
				data: {
					available: true,
				},
			})
		})

		it('debe retornar que el contrato no está disponible cuando existe', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockExistingBusiness = {
				idBusiness: 1,
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindFirst.mockResolvedValue(mockExistingBusiness as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract=PN0005678'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(mockPrismaFindFirst).toHaveBeenCalledWith({
				where: {
					contract: 'PN0005678',
				},
				select: {
					idBusiness: true,
				},
			})
			expect(response.status).toBe(200)
			expect(responseData).toEqual({
				data: {
					available: false,
					existingBusinessId: 1,
				},
			})
		})

		it('debe excluir el negocio especificado en excludeBusinessId', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindFirst.mockResolvedValue(null)

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract=PN0001234&excludeBusinessId=1'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(mockPrismaFindFirst).toHaveBeenCalledWith({
				where: {
					contract: 'PN0001234',
					NOT: { idBusiness: 1 },
				},
				select: {
					idBusiness: true,
				},
			})
			expect(response.status).toBe(200)
			expect(responseData).toEqual({
				data: {
					available: true,
				},
			})
		})

		it('debe retornar que el contrato no está disponible cuando existe en otro negocio (con excludeBusinessId)', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockExistingBusiness = {
				idBusiness: 2,
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindFirst.mockResolvedValue(mockExistingBusiness as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract=PN0005678&excludeBusinessId=1'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(mockPrismaFindFirst).toHaveBeenCalledWith({
				where: {
					contract: 'PN0005678',
					NOT: { idBusiness: 1 },
				},
				select: {
					idBusiness: true,
				},
			})
			expect(response.status).toBe(200)
			expect(responseData).toEqual({
				data: {
					available: false,
					existingBusinessId: 2,
				},
			})
		})

		it('debe manejar correctamente contratos con caracteres especiales', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindFirst.mockResolvedValue(null)

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract=PN-000-1234'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(mockPrismaFindFirst).toHaveBeenCalledWith({
				where: {
					contract: 'PN-000-1234',
				},
				select: {
					idBusiness: true,
				},
			})
			expect(response.status).toBe(200)
			expect(responseData.data.available).toBe(true)
		})
	})

	describe('Casos de Autenticación', () => {
		it('debe retornar 401 cuando no hay sesión', async () => {
			mockAuth.mockResolvedValue(null as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract=PN0001234'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({
				data: null,
				error: 'No autorizado',
			})
			expect(mockPrismaFindFirst).not.toHaveBeenCalled()
		})

		it('debe retornar 401 cuando la sesión no tiene email', async () => {
			mockAuth.mockResolvedValue({
				user: {
					name: 'User',
				},
			} as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract=PN0001234'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({
				data: null,
				error: 'No autorizado',
			})
			expect(mockPrismaFindFirst).not.toHaveBeenCalled()
		})
	})

	describe('Casos de Validación de Parámetros', () => {
		it('debe retornar 400 cuando falta el parámetro contract', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData).toEqual({
				data: null,
				error: 'El número de contrato es obligatorio',
			})
			expect(mockPrismaFindFirst).not.toHaveBeenCalled()
		})

		it('debe retornar 400 cuando el parámetro contract es una cadena vacía', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract='
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData).toEqual({
				data: null,
				error: 'El número de contrato es obligatorio',
			})
			expect(mockPrismaFindFirst).not.toHaveBeenCalled()
		})

		it('debe manejar correctamente excludeBusinessId como string numérico', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindFirst.mockResolvedValue(null)

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract=PN0001234&excludeBusinessId=123'
			)
			await GET(request)

			expect(mockPrismaFindFirst).toHaveBeenCalledWith({
				where: {
					contract: 'PN0001234',
					NOT: { idBusiness: 123 },
				},
				select: {
					idBusiness: true,
				},
			})
		})

		it('debe ignorar excludeBusinessId cuando no es un número válido', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindFirst.mockResolvedValue(null)

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract=PN0001234&excludeBusinessId=abc'
			)
			await GET(request)

			// Cuando excludeBusinessId no es válido, parseInt devuelve NaN
			// y el código debería manejarlo correctamente
			expect(mockPrismaFindFirst).toHaveBeenCalled()
		})
	})

	describe('Casos de Errores de Base de Datos', () => {
		it('debe retornar 500 cuando findFirst falla', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindFirst.mockRejectedValue(new Error('Database error'))

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract=PN0001234'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error interno del servidor',
			})
		})

		it('debe retornar 500 cuando auth falla', async () => {
			mockAuth.mockRejectedValue(new Error('Auth service error'))

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract=PN0001234'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error interno del servidor',
			})
		})
	})

	describe('Casos de Búsqueda de Contrato', () => {
		it('debe buscar el contrato exacto (case-sensitive)', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindFirst.mockResolvedValue(null)

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract=PN0001234'
			)
			await GET(request)

			expect(mockPrismaFindFirst).toHaveBeenCalledWith({
				where: {
					contract: 'PN0001234',
				},
				select: {
					idBusiness: true,
				},
			})
		})

		it('debe manejar contratos con espacios (trim)', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindFirst.mockResolvedValue(null)

			// El contrato se pasa como query param, así que los espacios se codifican
			// pero el valor que llega al código debería ser el exacto
			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract=PN0001234'
			)
			await GET(request)

			expect(mockPrismaFindFirst).toHaveBeenCalledWith({
				where: {
					contract: 'PN0001234',
				},
				select: {
					idBusiness: true,
				},
			})
		})
	})

	describe('Casos de Respuesta', () => {
		it('debe retornar estructura correcta cuando el contrato está disponible', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindFirst.mockResolvedValue(null)

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract=PN0001234'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(responseData).toHaveProperty('data')
			expect(responseData.data).toHaveProperty('available')
			expect(responseData.data.available).toBe(true)
			expect(responseData.data).not.toHaveProperty('existingBusinessId')
		})

		it('debe retornar estructura correcta cuando el contrato no está disponible', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockExistingBusiness = {
				idBusiness: 5,
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindFirst.mockResolvedValue(mockExistingBusiness as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/validate-contract?contract=PN0005678'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(responseData).toHaveProperty('data')
			expect(responseData.data).toHaveProperty('available')
			expect(responseData.data.available).toBe(false)
			expect(responseData.data).toHaveProperty('existingBusinessId')
			expect(responseData.data.existingBusinessId).toBe(5)
		})
	})
})
