import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, PUT } from '../[id]/route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { updateBusinessSchema } from '@/features/negocios/lib/business-api.schemas'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { NextResponse } from 'next/server'
import { UserRole } from '@/features/auth/lib/roles'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
import { recalcularComisionesPorCambioOrigen } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import { validateProductConfigurationExists } from '@/features/negocios/services/product-configuration.service'
import {
	mockUserWithRole,
	mockAgentUser,
} from '@/features/shared/__tests__/fixtures/mockUserWithRole'
import {
	mockPrismaBusiness,
	mockPrismaBusinessEmitido,
	mockPrismaBusinessVentaEfectuada,
} from '@/features/negocios/__tests__/fixtures/mock-prisma-business'

// Mock de módulos externos
vi.mock('@/auth')
vi.mock('@/features/pre-liquidacion/services/pre-liquidacion.service')
vi.mock('@/features/negocios/services/product-configuration.service')
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		clientOrigin: {
			findFirst: vi.fn(),
		},
	},
}))
vi.mock('@/features/negocios/services/user.service')
vi.mock('@/features/negocios/lib/business-api.schemas', () => ({
	updateBusinessSchema: {
		safeParse: vi.fn(),
	},
}))
vi.mock('@/features/negocios/mappers/business-entity.mapper')
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		BUSINESS_UPDATED: 'BUSINESS_UPDATED',
	},
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'test-agent'),
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

describe('GET /api/negocios/[id]', () => {
	const mockAuth = vi.mocked(auth)
	const mockGetCurrentUserByEmail = vi.mocked(getCurrentUserByEmail)
	const mockPrismaFindFirst = vi.mocked(prisma.business.findFirst)
	const mockPrismaBusinessToEntity = vi.mocked(prismaBusinessToEntity)
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
		it('debe obtener negocio exitosamente con rol ADMIN', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
					name: 'Admin User',
				},
			}

			const mockAdminUser = {
				...mockUserWithRole,
				email: 'admin@example.com',
				role: {
					idRole: 1,
					code: UserRole.ADMIN,
					name: 'Administrador del Sistema',
					description: 'Acceso total',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const mockEntity = {
				id: 1,
				contract: 'PN0001234',
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindFirst.mockResolvedValue(mockPrismaBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request('http://localhost:3000/api/negocios/1')
			const params = Promise.resolve({ id: '1' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(mockAuth).toHaveBeenCalledTimes(1)
			expect(mockGetCurrentUserByEmail).toHaveBeenCalledWith(
				'admin@example.com'
			)
			expect(mockPrismaFindFirst).toHaveBeenCalledWith({
				where: { idBusiness: 1 },
				include: expect.any(Object),
			})
			expect(mockPrismaBusinessToEntity).toHaveBeenCalledWith(
				mockPrismaBusiness
			)
			expect(response.status).toBe(200)
			expect(responseData).toEqual({ data: mockEntity })
		})

		it('debe obtener negocio exitosamente con rol AGENTE (solo sus negocios)', async () => {
			const mockSession = {
				user: {
					email: 'agent@example.com',
				},
			}

			const mockEntity = {
				id: 1,
				contract: 'PN0001234',
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAgentUser)
			mockPrismaFindFirst.mockResolvedValue(mockPrismaBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request('http://localhost:3000/api/negocios/1')
			const params = Promise.resolve({ id: '1' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(mockPrismaFindFirst).toHaveBeenCalledWith({
				where: {
					idBusiness: 1,
					idUser: mockAgentUser.idUser,
				},
				include: expect.any(Object),
			})
			expect(response.status).toBe(200)
			expect(responseData).toEqual({ data: mockEntity })
		})
	})

	describe('Casos de Autenticación', () => {
		it('debe retornar 401 cuando no hay sesión', async () => {
			mockAuth.mockResolvedValue(null as never)

			const request = new Request('http://localhost:3000/api/negocios/1')
			const params = Promise.resolve({ id: '1' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({
				data: null,
				error: 'No autorizado',
			})
			expect(mockGetCurrentUserByEmail).not.toHaveBeenCalled()
		})

		it('debe retornar 401 cuando la sesión no tiene email', async () => {
			mockAuth.mockResolvedValue({
				user: {
					name: 'User',
				},
			} as never)

			const request = new Request('http://localhost:3000/api/negocios/1')
			const params = Promise.resolve({ id: '1' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({
				data: null,
				error: 'No autorizado',
			})
		})
	})

	describe('Casos de Validación de ID', () => {
		it('debe retornar 400 cuando el ID no es un número válido', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)

			const request = new Request('http://localhost:3000/api/negocios/abc')
			const params = Promise.resolve({ id: 'abc' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData).toEqual({
				data: null,
				error: 'ID de negocio inválido',
			})
		})

		it('debe retornar 400 cuando el ID es una cadena vacía', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)

			const request = new Request('http://localhost:3000/api/negocios/')
			const params = Promise.resolve({ id: '' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.error).toBe('ID de negocio inválido')
		})
	})

	describe('Casos de Usuario No Encontrado', () => {
		it('debe retornar 404 cuando el usuario no existe', async () => {
			const mockSession = {
				user: {
					email: 'nonexistent@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(null)

			const request = new Request('http://localhost:3000/api/negocios/1')
			const params = Promise.resolve({ id: '1' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Usuario no encontrado',
			})
		})
	})

	describe('Casos de Negocio No Encontrado', () => {
		it('debe retornar 404 cuando el negocio no existe', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAdminUser = {
				...mockUserWithRole,
				email: 'admin@example.com',
				role: {
					idRole: 1,
					code: UserRole.ADMIN,
					name: 'Administrador del Sistema',
					description: 'Acceso total',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindFirst.mockResolvedValue(null)

			const request = new Request('http://localhost:3000/api/negocios/999')
			const params = Promise.resolve({ id: '999' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Negocio no encontrado',
			})
		})

		it('debe retornar 404 cuando agente intenta acceder a negocio de otro usuario', async () => {
			const mockSession = {
				user: {
					email: 'agent@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAgentUser)
			mockPrismaFindFirst.mockResolvedValue(null)

			const request = new Request('http://localhost:3000/api/negocios/999')
			const params = Promise.resolve({ id: '999' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData.error).toBe('Negocio no encontrado')
			expect(mockPrismaFindFirst).toHaveBeenCalledWith({
				where: {
					idBusiness: 999,
					idUser: mockAgentUser.idUser,
				},
				include: expect.any(Object),
			})
		})
	})

	describe('Casos de Errores de Base de Datos', () => {
		it('debe retornar 500 cuando findFirst falla', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAdminUser = {
				...mockUserWithRole,
				email: 'admin@example.com',
				role: {
					idRole: 1,
					code: UserRole.ADMIN,
					name: 'Administrador del Sistema',
					description: 'Acceso total',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindFirst.mockRejectedValue(new Error('Database error'))

			const request = new Request('http://localhost:3000/api/negocios/1')
			const params = Promise.resolve({ id: '1' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error interno del servidor',
			})
		})

		it('debe retornar 500 cuando getCurrentUserByEmail falla', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockRejectedValue(
				new Error('Database connection error')
			)

			const request = new Request('http://localhost:3000/api/negocios/1')
			const params = Promise.resolve({ id: '1' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error interno del servidor',
			})
		})
	})
})

describe('PUT /api/negocios/[id]', () => {
	const mockAuth = vi.mocked(auth)
	const mockGetCurrentUserByEmail = vi.mocked(getCurrentUserByEmail)
	const mockPrismaFindFirst = vi.mocked(prisma.business.findFirst)
	const mockPrismaUpdate = vi.mocked(prisma.business.update)
	const mockClientOriginFindFirst = vi.mocked(
		(prisma as unknown as { clientOrigin: { findFirst: ReturnType<typeof vi.fn> } })
			.clientOrigin.findFirst
	)
	const mockUpdateBusinessSchema = vi.mocked(updateBusinessSchema)
	const mockPrismaBusinessToEntity = vi.mocked(prismaBusinessToEntity)
	const mockLogAuditEvent = vi.mocked(logAuditEvent)
	const mockNextResponseJson = vi.mocked(NextResponse.json)
	const mockRecalcularComisionesPorCambioOrigen = vi.mocked(recalcularComisionesPorCambioOrigen)
	const mockValidateProductConfigurationExists = vi.mocked(validateProductConfigurationExists)

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
		it('debe actualizar negocio exitosamente agregando contrato y cambiando estado a EMITIDO', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
					name: 'Admin User',
				},
			}

			const mockAdminUser = {
				...mockUserWithRole,
				email: 'admin@example.com',
				role: {
					idRole: 1,
					code: UserRole.ADMIN,
					name: 'Administrador del Sistema',
					description: 'Acceso total',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const mockExistingBusiness = {
				...mockPrismaBusinessVentaEfectuada,
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
			}

			const mockUpdatedBusiness = {
				...mockExistingBusiness,
				contract: 'PN0005678',
				status: BUSINESS_STATUS.EMITIDO,
			}

			const mockEntity = {
				id: 1,
				contract: 'PN0005678',
				status: BUSINESS_STATUS.EMITIDO,
			}

			const requestBody = {
				contract: 'PN0005678',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindFirst
				.mockResolvedValueOnce(mockExistingBusiness as never) // Para verificar existencia
				.mockResolvedValueOnce(null) // Para verificar duplicado (no hay)
			mockPrismaUpdate.mockResolvedValue(mockUpdatedBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
				headers: {
					'Content-Type': 'application/json',
				},
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(mockAuth).toHaveBeenCalledTimes(1)
			expect(mockUpdateBusinessSchema.safeParse).toHaveBeenCalledWith(
				requestBody
			)
			expect(mockGetCurrentUserByEmail).toHaveBeenCalledWith(
				'admin@example.com'
			)
			expect(mockPrismaFindFirst).toHaveBeenCalledWith({
				where: { idBusiness: 1 },
			})
			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { idBusiness: 1 },
				data: {
					contract: 'PN0005678',
					status: BUSINESS_STATUS.EMITIDO,
				},
				include: expect.any(Object),
			})
			expect(mockLogAuditEvent).toHaveBeenCalledWith({
				userId: mockAdminUser.idUser,
				roleId: mockAdminUser.idRole,
				action: AuditAction.BUSINESS_UPDATED,
				email: 'admin@example.com',
				ipAddress: '127.0.0.1',
				userAgent: 'test-agent',
				details: expect.stringContaining('businessId'),
			})
			expect(mockPrismaBusinessToEntity).toHaveBeenCalledWith(
				mockUpdatedBusiness
			)
			expect(response.status).toBe(200)
			expect(responseData).toEqual({ data: mockEntity })
		})

		it('debe actualizar negocio exitosamente con rol AGENTE (solo sus negocios)', async () => {
			const mockSession = {
				user: {
					email: 'agent@example.com',
				},
			}

			const mockExistingBusiness = {
				...mockPrismaBusinessVentaEfectuada,
				idUser: mockAgentUser.idUser,
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
			}

			const mockUpdatedBusiness = {
				...mockExistingBusiness,
				contract: 'PN0009999',
				status: BUSINESS_STATUS.EMITIDO,
			}

			const mockEntity = {
				id: 1,
				contract: 'PN0009999',
				status: BUSINESS_STATUS.EMITIDO,
			}

			const requestBody = {
				contract: 'PN0009999',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAgentUser)
			mockPrismaFindFirst
				.mockResolvedValueOnce(mockExistingBusiness as never)
				.mockResolvedValueOnce(null)
			mockPrismaUpdate.mockResolvedValue(mockUpdatedBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })

			expect(mockPrismaFindFirst).toHaveBeenCalledWith({
				where: {
					idBusiness: 1,
					idUser: mockAgentUser.idUser,
				},
			})
			expect(response.status).toBe(200)
		})

		it('debe retornar 400 cuando no se proporciona contract ni idClientOrigin', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const requestBody = {}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(mockPrismaUpdate).not.toHaveBeenCalled()
			expect(response.status).toBe(400)
			expect(responseData.error).toBe('Debe enviar contract, idClientOrigin o idSettlementCommission')
		})

		it('debe actualizar solo idClientOrigin cuando negocio está EMITIDO', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
					name: 'Admin User',
				},
			}

			const mockAdminUser = {
				...mockUserWithRole,
				email: 'admin@example.com',
				role: {
					idRole: 1,
					code: UserRole.ADMIN,
					name: 'Administrador del Sistema',
					description: 'Acceso total',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const mockExistingBusiness = {
				...mockPrismaBusinessEmitido,
				idBusiness: 1,
				status: BUSINESS_STATUS.EMITIDO,
			}

			const mockUpdatedBusiness = {
				...mockExistingBusiness,
				idClientOrigin: 2,
			}

			const mockEntity = {
				id: 1,
				status: BUSINESS_STATUS.EMITIDO,
				clientOrigin: { id: 2, name: 'Propio' },
			}

			const requestBody = { idClientOrigin: 2 }

			const mockBusinessWithPpc = {
				...mockExistingBusiness,
				productPercentageCommission: {
					idProductPercentageCommission: 1,
					productConfiguration: {
						id: 1,
						idProduct: 1,
						idClientOrigin: 1,
						idCategory: 1,
					},
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindFirst
				.mockResolvedValueOnce(mockExistingBusiness as never) // 1st: validate business exists
				.mockResolvedValueOnce(mockBusinessWithPpc as never)  // 2nd: fetch PPC/productConfiguration
				.mockResolvedValueOnce(mockUpdatedBusiness as never)  // 3rd: fetch updated business after recalculate
			mockClientOriginFindFirst.mockResolvedValue({
				idClientOrigin: 2,
				name: 'Propio',
				status: true,
			} as never)
			mockValidateProductConfigurationExists.mockResolvedValue({ valid: true })
			mockPrismaUpdate.mockResolvedValue(mockUpdatedBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
				headers: {
					'Content-Type': 'application/json',
				},
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(mockClientOriginFindFirst).toHaveBeenCalledWith({
				where: { idClientOrigin: 2, status: true },
			})
			expect(mockRecalcularComisionesPorCambioOrigen).toHaveBeenCalledWith(
				1,
				2,
				{ idUser: mockAdminUser.idUser, name: mockAdminUser.name }
			)
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
			expect(mockLogAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.BUSINESS_UPDATED,
					details: expect.stringContaining('idClientOrigin'),
				})
			)
			expect(response.status).toBe(200)
			expect(responseData).toEqual({ data: mockEntity })
		})
	})

	describe('Casos de Autenticación', () => {
		it('debe retornar 401 cuando no hay sesión', async () => {
			mockAuth.mockResolvedValue(null as never)

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify({ contract: 'PN0005678' }),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({
				data: null,
				error: 'No autorizado',
			})
			expect(mockGetCurrentUserByEmail).not.toHaveBeenCalled()
		})

		it('debe retornar 401 cuando la sesión no tiene email', async () => {
			mockAuth.mockResolvedValue({
				user: {
					name: 'User',
				},
			} as never)

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify({ contract: 'PN0005678' }),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({
				data: null,
				error: 'No autorizado',
			})
		})
	})

	describe('Casos de Validación de ID', () => {
		it('debe retornar 400 cuando el ID no es un número válido', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)

			const request = new Request('http://localhost:3000/api/negocios/abc', {
				method: 'PUT',
				body: JSON.stringify({ contract: 'PN0005678' }),
			})

			const params = Promise.resolve({ id: 'abc' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData).toEqual({
				data: null,
				error: 'ID de negocio inválido',
			})
		})
	})

	describe('Casos de Validación de Body', () => {
		it('debe retornar 400 cuando el contrato tiene formato inválido', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const requestBody = {
				contract: 'PN@#$%',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: false,
				error: {
					issues: [
						{
							message:
								'El contrato solo puede contener letras, números y guiones',
						},
					],
				},
			} as never)

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.error).toBe(
				'El contrato solo puede contener letras, números y guiones'
			)
		})

		it('debe retornar 400 cuando el contrato es una cadena vacía', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const requestBody = {
				contract: '',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: false,
				error: {
					issues: [{ message: 'El número de contrato es obligatorio' }],
				},
			} as never)

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.error).toBe('El número de contrato es obligatorio')
		})
	})

	describe('Casos de Usuario No Encontrado', () => {
		it('debe retornar 404 cuando el usuario no existe', async () => {
			const mockSession = {
				user: {
					email: 'nonexistent@example.com',
				},
			}

			const requestBody = {
				contract: 'PN0005678',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(null)

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Usuario no encontrado',
			})
		})
	})

	describe('Casos de Negocio No Encontrado', () => {
		it('debe retornar 404 cuando el negocio no existe', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAdminUser = {
				...mockUserWithRole,
				email: 'admin@example.com',
				role: {
					idRole: 1,
					code: UserRole.ADMIN,
					name: 'Administrador del Sistema',
					description: 'Acceso total',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const requestBody = {
				contract: 'PN0005678',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindFirst.mockResolvedValue(null)

			const request = new Request('http://localhost:3000/api/negocios/999', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '999' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Negocio no encontrado',
			})
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})

		it('debe retornar 404 cuando agente intenta actualizar negocio de otro usuario', async () => {
			const mockSession = {
				user: {
					email: 'agent@example.com',
				},
			}

			const requestBody = {
				contract: 'PN0005678',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAgentUser)
			mockPrismaFindFirst.mockResolvedValue(null)

			const request = new Request('http://localhost:3000/api/negocios/999', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '999' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData.error).toBe('Negocio no encontrado')
			expect(mockPrismaFindFirst).toHaveBeenCalledWith({
				where: {
					idBusiness: 999,
					idUser: mockAgentUser.idUser,
				},
			})
		})
	})

	describe('Casos de Estado del Negocio', () => {
		it('debe retornar 400 cuando el negocio no está en estado VENTA_EFECTUADA', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAdminUser = {
				...mockUserWithRole,
				email: 'admin@example.com',
				role: {
					idRole: 1,
					code: UserRole.ADMIN,
					name: 'Administrador del Sistema',
					description: 'Acceso total',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const mockExistingBusiness = {
				...mockPrismaBusinessEmitido,
				status: BUSINESS_STATUS.CANCELADO,
			}

			const requestBody = {
				contract: 'PN0005678',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindFirst.mockResolvedValue(mockExistingBusiness as never)

			const request = new Request('http://localhost:3000/api/negocios/2', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '2' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData).toEqual({
				data: null,
				error: 'Solo se pueden editar negocios en estado Venta Efectuada o Emitido',
			})
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})

		it('debe actualizar contrato cuando el negocio está EMITIDO y el usuario es administrador', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAdminUser = {
				...mockUserWithRole,
				email: 'admin@example.com',
				role: {
					idRole: 1,
					code: UserRole.ADMIN,
					name: 'Administrador del Sistema',
					description: 'Acceso total',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const mockExistingBusiness = {
				...mockPrismaBusinessEmitido,
				idBusiness: 2,
				status: BUSINESS_STATUS.EMITIDO,
				contract: 'OLD123',
			}

			const mockUpdatedBusiness = {
				...mockExistingBusiness,
				contract: 'PN0005678',
				status: BUSINESS_STATUS.EMITIDO,
			}

			const mockEntity = {
				id: 2,
				contract: 'PN0005678',
				status: BUSINESS_STATUS.EMITIDO,
			}

			const requestBody = {
				contract: 'PN0005678',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindFirst
				.mockResolvedValueOnce(mockExistingBusiness as never)
				.mockResolvedValueOnce(null)
			mockPrismaUpdate.mockResolvedValue(mockUpdatedBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request('http://localhost:3000/api/negocios/2', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '2' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(200)
			expect(responseData.data).toEqual(mockEntity)
			expect(mockPrismaUpdate).toHaveBeenCalled()
		})

		it('debe retornar 403 cuando el negocio está en estado EMITIDO y el usuario es analista de soporte', async () => {
			const mockSession = {
				user: {
					email: 'analyst@example.com',
				},
			}

			const mockAnalystUser = {
				...mockUserWithRole,
				email: 'analyst@example.com',
				role: {
					idRole: 3,
					code: UserRole.ANALISTA_SOPORTE,
					name: 'Analista de Soporte',
					description: 'Acceso limitado',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const mockExistingBusiness = {
				...mockPrismaBusinessEmitido,
				status: BUSINESS_STATUS.EMITIDO,
			}

			const requestBody = {
				contract: 'PN0005678',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAnalystUser)
			mockPrismaFindFirst.mockResolvedValue(mockExistingBusiness as never)

			const request = new Request('http://localhost:3000/api/negocios/2', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '2' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(403)
			expect(responseData).toEqual({
				data: null,
				error:
					'Solo el administrador del sistema o el asistente de gerencia operativa pueden editar contratos en estado Emitido',
			})
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})
	})

	describe('Casos de Contrato Duplicado', () => {
		it('debe retornar 409 cuando el contrato ya está asignado a otro negocio', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAdminUser = {
				...mockUserWithRole,
				email: 'admin@example.com',
				role: {
					idRole: 1,
					code: UserRole.ADMIN,
					name: 'Administrador del Sistema',
					description: 'Acceso total',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const mockExistingBusiness = {
				...mockPrismaBusinessVentaEfectuada,
				idBusiness: 1,
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
			}

			const mockDuplicateBusiness = {
				...mockPrismaBusinessEmitido,
				idBusiness: 2,
				contract: 'PN0005678',
			}

			const requestBody = {
				contract: 'PN0005678',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindFirst
				.mockResolvedValueOnce(mockExistingBusiness as never)
				.mockResolvedValueOnce(mockDuplicateBusiness as never)

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(409)
			expect(responseData.error).toContain(
				"El número de contrato 'PN0005678' ya está asignado al negocio #2"
			)
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})

		it('debe permitir actualizar con el mismo contrato del mismo negocio', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAdminUser = {
				...mockUserWithRole,
				email: 'admin@example.com',
				role: {
					idRole: 1,
					code: UserRole.ADMIN,
					name: 'Administrador del Sistema',
					description: 'Acceso total',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const mockExistingBusiness = {
				...mockPrismaBusinessEmitido,
				idBusiness: 2,
				contract: 'PN0005678',
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
			}

			const mockUpdatedBusiness = {
				...mockExistingBusiness,
				contract: 'PN0005678',
			}

			const mockEntity = {
				id: 2,
				contract: 'PN0005678',
			}

			const requestBody = {
				contract: 'PN0005678',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindFirst
				.mockResolvedValueOnce(mockExistingBusiness as never)
				.mockResolvedValueOnce(null) // No hay duplicado porque es el mismo negocio
			mockPrismaUpdate.mockResolvedValue(mockUpdatedBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request('http://localhost:3000/api/negocios/2', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '2' })
			const response = await PUT(request, { params })

			expect(response.status).toBe(200)
			expect(mockPrismaUpdate).toHaveBeenCalled()
		})
	})

	describe('Casos de Errores de Base de Datos', () => {
		it('debe retornar 500 cuando findFirst falla', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAdminUser = {
				...mockUserWithRole,
				email: 'admin@example.com',
				role: {
					idRole: 1,
					code: UserRole.ADMIN,
					name: 'Administrador del Sistema',
					description: 'Acceso total',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const requestBody = {
				contract: 'PN0005678',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindFirst.mockRejectedValue(new Error('Database error'))

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error interno del servidor',
			})
		})

		it('debe retornar 500 cuando update falla', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAdminUser = {
				...mockUserWithRole,
				email: 'admin@example.com',
				role: {
					idRole: 1,
					code: UserRole.ADMIN,
					name: 'Administrador del Sistema',
					description: 'Acceso total',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const mockExistingBusiness = {
				...mockPrismaBusinessVentaEfectuada,
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
			}

			const requestBody = {
				contract: 'PN0005678',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindFirst
				.mockResolvedValueOnce(mockExistingBusiness as never)
				.mockResolvedValueOnce(null)
			mockPrismaUpdate.mockRejectedValue(new Error('Update failed'))

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error interno del servidor',
			})
		})
	})

	describe('Verificación de Audit Log', () => {
		it('debe registrar el evento de actualización con todos los detalles', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const mockAdminUser = {
				...mockUserWithRole,
				email: 'admin@example.com',
				idUser: 10,
				idRole: 5,
				role: {
					idRole: 5,
					code: UserRole.ADMIN,
					name: 'Administrador del Sistema',
					description: 'Acceso total',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const mockExistingBusiness = {
				...mockPrismaBusinessVentaEfectuada,
				idBusiness: 123,
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
			}

			const mockUpdatedBusiness = {
				...mockExistingBusiness,
				contract: 'PN0005678',
				status: BUSINESS_STATUS.EMITIDO,
			}

			const mockEntity = {
				id: 123,
				contract: 'PN0005678',
				status: BUSINESS_STATUS.EMITIDO,
			}

			const requestBody = {
				contract: 'PN0005678',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindFirst
				.mockResolvedValueOnce(mockExistingBusiness as never)
				.mockResolvedValueOnce(null)
			mockPrismaUpdate.mockResolvedValue(mockUpdatedBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request('http://localhost:3000/api/negocios/123', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
				headers: {
					'x-forwarded-for': '192.168.1.1',
					'user-agent': 'Mozilla/5.0',
				},
			})

			const params = Promise.resolve({ id: '123' })
			await PUT(request, { params })

			expect(mockLogAuditEvent).toHaveBeenCalledWith({
				userId: 10,
				roleId: 5,
				action: AuditAction.BUSINESS_UPDATED,
				email: 'admin@example.com',
				ipAddress: '127.0.0.1',
				userAgent: 'test-agent',
				details: expect.stringContaining('"businessId":123'),
			})

			const auditCall = mockLogAuditEvent.mock.calls[0][0]
			const details = JSON.parse(auditCall.details as string)
			expect(details.businessId).toBe(123)
			expect(details.previousStatus).toBe(BUSINESS_STATUS.VENTA_EFECTUADA)
			expect(details.newStatus).toBe(BUSINESS_STATUS.EMITIDO)
			expect(details.contract).toBe('PN0005678')
		})
	})
})
