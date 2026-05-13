import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, PUT } from '../[id]/route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSubordinateUserIds } from '@/features/negocios/services/user-hierarchy.service'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { updateBusinessSchema } from '@/features/negocios/lib/business-api.schemas'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
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
	mockPrismaBusinessVentaEfectuada,
} from '@/features/negocios/__tests__/fixtures/mock-prisma-business'

// Mock de módulos externos
vi.mock('@/auth')
vi.mock('@/features/negocios/actions/find-product-percentage-commission', () => ({
	findProductPercentageCommission: vi.fn().mockResolvedValue({
		data: { idProductPercentageCommission: 1 },
	}),
}))
vi.mock('@/features/pre-liquidacion/services/pre-liquidacion.service')
vi.mock('@/features/negocios/services/product-configuration.service')
vi.mock('@/features/negocios/services/user-hierarchy.service', () => ({
	getSubordinateUserIds: vi.fn().mockImplementation(() => Promise.resolve([])),
}))


vi.mock('@/lib/prisma', () => {
	const commonEntity = {
		idBusiness: 1,
		idUser: 20,
		idProduct: 1,
		status: 'VENTA_EFECTUADA',
		contract: null,
		term: 12,
		value: 10000,
		idBuyPeriodicity: 1,
		idCurrency: 1,
		idClientOrigin: 1,
		numAportes: 12,
		idProductPercentageCommission: 1,
		productPercentageCommission: {
			productConfiguration: {
				idProduct: 1,
				idLevel: 1,
				product: {
					name: 'Product 1',
					company: { name: 'Company 1' },
				},
			},
		},
	}

	const mockBusiness = { 
		findFirst: vi.fn(), 
		update: vi.fn().mockResolvedValue(commonEntity) 
	}
	const mockPayment = { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), createMany: vi.fn().mockResolvedValue({ count: 0 }) }
	const mockUser = { findUnique: vi.fn().mockResolvedValue({ idLevel: 1 }), findMany: vi.fn().mockResolvedValue([]) }

	return {
		prisma: {
			business: mockBusiness,
			clientOrigin: { findFirst: vi.fn().mockResolvedValue({ idClientOrigin: 1, name: 'Origin 1' }) },
			user: mockUser,
			product: { findUnique: vi.fn() },
			buyPeriodicity: { findUnique: vi.fn() },
			payment: mockPayment,
			$transaction: vi.fn(async (cb: (tx: unknown) => unknown) => {
				return await cb({
					business: mockBusiness,
					payment: mockPayment,
					user: mockUser,
				})
			}),
		},
	}
})

const mockPrisma = prisma as unknown as Record<string, unknown>
const mockUpdate = (mockPrisma.business as Record<string, unknown>).update as ReturnType<typeof vi.fn>
const mockFindFirst = (mockPrisma.business as Record<string, unknown>).findFirst as ReturnType<typeof vi.fn>
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
	const mockPrismaBusinessToEntity = vi.mocked(prismaBusinessToEntity)
	const mockNextResponseJson = vi.mocked(NextResponse.json)
	const mockGetSubordinateUserIds = vi.mocked(getSubordinateUserIds)

	beforeEach(() => {
		vi.clearAllMocks()
		// Default: no subordinates (returns empty array so visibleUserIds = [self])
		mockGetSubordinateUserIds.mockResolvedValue([])
		mockFindFirst.mockImplementation(({ where }: { where?: Record<string, unknown> }) => {
			if (where && (where.idBusiness || where.contract)) {
				// Retornar un mock genérico si no se especifica en el test
				return Promise.resolve(mockPrismaBusiness)
			}
			return Promise.resolve(null)
		})
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
			mockFindFirst.mockResolvedValue(mockPrismaBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request('http://localhost:3000/api/negocios/1')
			const params = Promise.resolve({ id: '1' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(mockAuth).toHaveBeenCalledTimes(1)
			expect(mockGetCurrentUserByEmail).toHaveBeenCalledWith(
				'admin@example.com'
			)
			expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
				where: { idBusiness: 1 },
			}))
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
			mockFindFirst.mockResolvedValue(mockPrismaBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request('http://localhost:3000/api/negocios/1')
			const params = Promise.resolve({ id: '1' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
				where: {
					idBusiness: 1,
					idUser: { in: [mockAgentUser.idUser] },
				},
			}))
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
			mockFindFirst.mockResolvedValue(null)

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
			mockFindFirst.mockResolvedValue(null)

			const request = new Request('http://localhost:3000/api/negocios/999')
			const params = Promise.resolve({ id: '999' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData.error).toBe('Negocio no encontrado')
			expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
				where: {
					idBusiness: 999,
					idUser: { in: [mockAgentUser.idUser] },
				},
			}))
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
			mockFindFirst.mockRejectedValue(new Error('Database error'))

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

	const commonExistingBusiness = {
		...mockPrismaBusinessVentaEfectuada,
		status: BUSINESS_STATUS.VENTA_EFECTUADA,
		idUser: 10,
	}

	const commonUpdatedBusiness = {
		...commonExistingBusiness,
		contract: 'PN0005678',
		status: BUSINESS_STATUS.EMITIDO,
		dateIssued: new Date('2025-01-10T12:00:00.000Z'),
	}

	const commonEntity = {
		id: 1,
		contract: 'PN0005678',
		status: BUSINESS_STATUS.EMITIDO,
	}

	const commonAdminUser = {
		...mockUserWithRole,
		idUser: 10,
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

	const commonSession = {
		user: {
			email: 'admin@example.com',
			name: 'Admin User',
		},
	}

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
			const requestBody = { contract: 'PN0005678' }

			mockAuth.mockResolvedValue(commonSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({ success: true, data: requestBody } as never)
			mockGetCurrentUserByEmail.mockResolvedValue(commonAdminUser)
			mockFindFirst
				.mockResolvedValueOnce(commonExistingBusiness as never)
				.mockResolvedValueOnce(null)
			mockUpdate.mockResolvedValue(commonUpdatedBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(commonEntity as never)

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(200)
			expect(responseData.data).toEqual(commonEntity)
			expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
				where: { idBusiness: 1 },
				data: expect.objectContaining({ contract: 'PN0005678' }),
			}))
		})

		it('debe actualizar negocio exitosamente con rol AGENTE (solo sus negocios)', async () => {
			const agentSession = { user: { email: 'agent@example.com' } }
			const agentUser = { ...commonAdminUser, idUser: 20, role: { ...commonAdminUser.role, idRole: 2, code: UserRole.AGENTE } }
			const agentBusiness = { ...commonExistingBusiness, idUser: 20 }
			const agentUpdated = { ...commonUpdatedBusiness, idUser: 20 }
			const requestBody = { contract: 'PN0009999' }

			mockAuth.mockResolvedValue(agentSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({ success: true, data: requestBody } as never)
			mockGetCurrentUserByEmail.mockResolvedValue(agentUser)
			mockFindFirst
				.mockResolvedValueOnce(agentBusiness as never)
				.mockResolvedValueOnce(null)
				.mockResolvedValue(agentUpdated as never)
			mockUpdate.mockResolvedValue(agentUpdated as never)
			mockPrismaBusinessToEntity.mockReturnValue(commonEntity as never)

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })

			expect(response.status).toBe(200)
			expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
				where: { idBusiness: 1, idUser: 20 },
			}))
		})

		it('debe retornar 400 cuando no se proporciona contract ni idClientOrigin', async () => {
			mockAuth.mockResolvedValue(commonSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({ success: true, data: {} } as never)

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify({}),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.error).toBe('Debe enviar al menos un campo para actualizar')
		})

		it('debe actualizar solo idClientOrigin cuando negocio está EMITIDO', async () => {
			const emitidoBusiness = { ...commonExistingBusiness, status: BUSINESS_STATUS.EMITIDO }
			const businessWithPpc = { ...emitidoBusiness, productPercentageCommission: { idProductPercentageCommission: 1, productConfiguration: { id: 1, idProduct: 1, idClientOrigin: 1, idCategory: 1 } } }
			const requestBody = { idClientOrigin: 2 }

			mockAuth.mockResolvedValue(commonSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({ success: true, data: requestBody } as never)
			mockGetCurrentUserByEmail.mockResolvedValue(commonAdminUser)
			mockUpdate.mockResolvedValue(commonUpdatedBusiness as never)
			mockFindFirst
				.mockResolvedValueOnce(emitidoBusiness as never)
				.mockResolvedValueOnce(businessWithPpc as never)
				.mockResolvedValue(commonUpdatedBusiness as never)
			mockClientOriginFindFirst.mockResolvedValue({ idClientOrigin: 2, name: 'Propio', status: true } as never)
			mockValidateProductConfigurationExists.mockResolvedValue({ valid: true })
			mockPrismaBusinessToEntity.mockReturnValue(commonEntity as never)

			const request = new Request('http://localhost:3000/api/negocios/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			await response.json()

			expect(response.status).toBe(200)
			expect(mockRecalcularComisionesPorCambioOrigen).toHaveBeenCalled()
		})
	})

	describe('Casos de Autenticación', () => {
		it('debe retornar 401 cuando no hay sesión', async () => {
			mockAuth.mockResolvedValue(null as never)
			const request = new Request('http://localhost:3000/api/negocios/1', { method: 'PUT', body: JSON.stringify({ contract: 'PN123' }) })
			const response = await PUT(request, { params: Promise.resolve({ id: '1' }) })
			expect(response.status).toBe(401)
		})
	})

	describe('Casos de Negocio No Encontrado', () => {
		it('debe retornar 404 cuando el negocio no existe', async () => {
			mockAuth.mockResolvedValue(commonSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({ success: true, data: { contract: 'PN123' } } as never)
			mockGetCurrentUserByEmail.mockResolvedValue(commonAdminUser)
			mockFindFirst.mockResolvedValue(null)

			const response = await PUT(new Request('http://localhost:3000/api/negocios/999', { method: 'PUT', body: JSON.stringify({ contract: 'PN123' }) }), { params: Promise.resolve({ id: '999' }) })
			expect(response.status).toBe(404)
		})
	})

	describe('Casos de Estado del Negocio', () => {
		it('debe retornar 400 cuando el negocio no está en estado VENTA_EFECTUADA ni EMITIDO', async () => {
			const canceledBusiness = { ...commonExistingBusiness, status: BUSINESS_STATUS.CANCELADO }
			mockAuth.mockResolvedValue(commonSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({ success: true, data: { contract: 'PN123' } } as never)
			mockGetCurrentUserByEmail.mockResolvedValue(commonAdminUser)
			mockFindFirst
				.mockResolvedValueOnce(canceledBusiness as never)
				.mockResolvedValueOnce(null)

			const response = await PUT(new Request('http://localhost:3000/api/negocios/1', { method: 'PUT', body: JSON.stringify({ contract: 'PN123' }) }), { params: Promise.resolve({ id: '1' }) })
			expect(response.status).toBe(400)
		})

		it('debe actualizar contrato cuando el negocio está EMITIDO y el usuario es administrador', async () => {
			const emitidoBusiness = { ...commonExistingBusiness, status: BUSINESS_STATUS.EMITIDO }
			mockAuth.mockResolvedValue(commonSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({ success: true, data: { contract: 'PN123' } } as never)
			mockGetCurrentUserByEmail.mockResolvedValue(commonAdminUser)
			mockFindFirst
				.mockResolvedValueOnce(emitidoBusiness as never)
				.mockResolvedValueOnce(null)
				.mockResolvedValue(commonUpdatedBusiness as never)
			mockUpdate.mockResolvedValue(commonUpdatedBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(commonEntity as never)

			const response = await PUT(new Request('http://localhost:3000/api/negocios/1', { method: 'PUT', body: JSON.stringify({ contract: 'PN123' }) }), { params: Promise.resolve({ id: '1' }) })
			expect(response.status).toBe(200)
		})

		it('debe retornar 403 cuando el negocio está en estado EMITIDO y el usuario es analista de soporte', async () => {
			const analystUser = { ...commonAdminUser, role: { ...commonAdminUser.role, code: UserRole.ANALISTA_SOPORTE } }
			const emitidoBusiness = { ...commonExistingBusiness, status: BUSINESS_STATUS.EMITIDO }
			mockAuth.mockResolvedValue({ user: { email: 'analyst@example.com' } } as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({ success: true, data: { contract: 'PN123' } } as never)
			mockGetCurrentUserByEmail.mockResolvedValue(analystUser)
			mockFindFirst
				.mockResolvedValueOnce(emitidoBusiness as never)
				.mockResolvedValueOnce(null)

			const response = await PUT(new Request('http://localhost:3000/api/negocios/1', { method: 'PUT', body: JSON.stringify({ contract: 'PN123' }) }), { params: Promise.resolve({ id: '1' }) })
			expect(response.status).toBe(403)
		})
	})

	describe('Casos de Contrato Duplicado', () => {
		it('debe retornar 409 cuando el contrato ya está asignado a otro negocio', async () => {
			const duplicateBusiness = { ...commonExistingBusiness, idBusiness: 2, contract: 'PN123' }
			mockAuth.mockResolvedValue(commonSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({ success: true, data: { contract: 'PN123' } } as never)
			mockGetCurrentUserByEmail.mockResolvedValue(commonAdminUser)
			mockFindFirst
				.mockResolvedValueOnce(commonExistingBusiness as never)
				.mockResolvedValueOnce(duplicateBusiness as never)

			const response = await PUT(new Request('http://localhost:3000/api/negocios/1', { method: 'PUT', body: JSON.stringify({ contract: 'PN123' }) }), { params: Promise.resolve({ id: '1' }) })
			expect(response.status).toBe(409)
		})
	})

	describe('Casos de Errores de Base de Datos', () => {
		it('debe retornar 500 cuando findFirst falla', async () => {
			mockAuth.mockResolvedValue(commonSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({ success: true, data: { contract: 'PN123' } } as never)
			mockGetCurrentUserByEmail.mockResolvedValue(commonAdminUser)
			mockFindFirst.mockRejectedValue(new Error('DB Error'))

			const response = await PUT(new Request('http://localhost:3000/api/negocios/1', { method: 'PUT', body: JSON.stringify({ contract: 'PN123' }) }), { params: Promise.resolve({ id: '1' }) })
			expect(response.status).toBe(500)
		})

		it('debe retornar 500 cuando update falla', async () => {
			mockAuth.mockResolvedValue(commonSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({ success: true, data: { contract: 'PN123' } } as never)
			mockGetCurrentUserByEmail.mockResolvedValue(commonAdminUser)
			mockFindFirst
				.mockResolvedValueOnce(commonExistingBusiness as never)
				.mockResolvedValueOnce(null)
				.mockResolvedValue(commonExistingBusiness as never)
			mockUpdate.mockRejectedValue(new Error('Update failed'))

			const response = await PUT(new Request('http://localhost:3000/api/negocios/1', { method: 'PUT', body: JSON.stringify({ contract: 'PN123' }) }), { params: Promise.resolve({ id: '1' }) })
			expect(response.status).toBe(500)
		})
	})

	describe('Verificación de Audit Log', () => {
		it('debe registrar el evento de actualización con todos los detalles', async () => {
			mockAuth.mockResolvedValue(commonSession as never)
			mockUpdateBusinessSchema.safeParse.mockReturnValue({ success: true, data: { contract: 'PN123' } } as never)
			mockGetCurrentUserByEmail.mockResolvedValue(commonAdminUser)
			mockFindFirst
				.mockResolvedValueOnce(commonExistingBusiness as never)
				.mockResolvedValueOnce(null)
				.mockResolvedValue(commonUpdatedBusiness as never)
			mockUpdate.mockResolvedValue(commonUpdatedBusiness as never)

			await PUT(new Request('http://localhost:3000/api/negocios/1', { method: 'PUT', body: JSON.stringify({ contract: 'PN123' }) }), { params: Promise.resolve({ id: '1' }) })
			expect(mockLogAuditEvent).toHaveBeenCalled()
		})
	})
})

