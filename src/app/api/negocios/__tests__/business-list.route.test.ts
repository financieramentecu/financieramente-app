import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '../route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { businessListParamsSchema } from '@/features/negocios/lib/business-api.schemas'
import { prismaBusinessListToEntities } from '@/features/negocios/mappers/business-entity.mapper'
import { NextResponse } from 'next/server'
import { UserRole } from '@/features/auth/lib/roles'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
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
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			count: vi.fn(),
			findMany: vi.fn(),
		},
	},
}))
vi.mock('@/features/negocios/services/user.service')
vi.mock('@/features/negocios/lib/business-api.schemas', () => ({
	businessListParamsSchema: {
		safeParse: vi.fn(),
	},
}))
vi.mock('@/features/negocios/mappers/business-entity.mapper')
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

describe('GET /api/negocios', () => {
	const mockAuth = vi.mocked(auth)
	const mockGetCurrentUserByEmail = vi.mocked(getCurrentUserByEmail)
	const mockPrismaCount = vi.mocked(prisma.business.count)
	const mockPrismaFindMany = vi.mocked(prisma.business.findMany)
	const mockBusinessListParamsSchema = vi.mocked(businessListParamsSchema)
	const mockPrismaBusinessListToEntities = vi.mocked(
		prismaBusinessListToEntities
	)
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
		it('debe listar negocios exitosamente con parámetros por defecto', async () => {
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

			const mockBusinesses = [mockPrismaBusiness, mockPrismaBusinessEmitido]
			const mockEntities = [
				{ id: 1, contract: 'PN0001234' },
				{ id: 2, contract: 'PN0005678' },
			]

			mockAuth.mockResolvedValue(mockSession as never)
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: null,
					status: null,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaCount.mockResolvedValue(2)
			mockPrismaFindMany.mockResolvedValue(mockBusinesses as never)
			mockPrismaBusinessListToEntities.mockReturnValue(mockEntities as never)

			const request = new Request('http://localhost:3000/api/negocios')
			const response = await GET(request)
			const responseData = await response.json()

			expect(mockAuth).toHaveBeenCalledTimes(1)
			expect(mockGetCurrentUserByEmail).toHaveBeenCalledWith(
				'admin@example.com'
			)
			expect(mockPrismaCount).toHaveBeenCalledWith({ where: {} })
			expect(mockPrismaFindMany).toHaveBeenCalledWith({
				where: {},
				include: expect.any(Object),
				orderBy: { createdAt: 'desc' },
				skip: 0,
				take: 10,
			})
			expect(mockPrismaBusinessListToEntities).toHaveBeenCalledWith(
				mockBusinesses
			)
			expect(response.status).toBe(200)
			expect(responseData.data.businesses).toEqual(mockEntities)
			expect(responseData.data.pagination).toEqual({
				page: 1,
				pageSize: 10,
				total: 2,
				totalPages: 1,
			})
		})

		it('debe listar negocios con paginación personalizada', async () => {
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

			const mockBusinesses = [mockPrismaBusiness]
			const mockEntities = [{ id: 1, contract: 'PN0001234' }]

			mockAuth.mockResolvedValue(mockSession as never)
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 2,
					pageSize: 5,
					search: null,
					status: null,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaCount.mockResolvedValue(15)
			mockPrismaFindMany.mockResolvedValue(mockBusinesses as never)
			mockPrismaBusinessListToEntities.mockReturnValue(mockEntities as never)

			const request = new Request(
				'http://localhost:3000/api/negocios?page=2&pageSize=5'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(mockPrismaFindMany).toHaveBeenCalledWith({
				where: {},
				include: expect.any(Object),
				orderBy: { createdAt: 'desc' },
				skip: 5, // (page - 1) * pageSize = (2 - 1) * 5 = 5
				take: 5,
			})
			expect(responseData.data.pagination).toEqual({
				page: 2,
				pageSize: 5,
				total: 15,
				totalPages: 3, // Math.ceil(15 / 5) = 3
			})
		})

		it('debe filtrar negocios por estado', async () => {
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

			const mockBusinesses = [mockPrismaBusinessEmitido]
			const mockEntities = [{ id: 2, contract: 'PN0005678' }]

			mockAuth.mockResolvedValue(mockSession as never)
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: null,
					status: BUSINESS_STATUS.EMITIDO,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaCount.mockResolvedValue(1)
			mockPrismaFindMany.mockResolvedValue(mockBusinesses as never)
			mockPrismaBusinessListToEntities.mockReturnValue(mockEntities as never)

			const request = new Request(
				'http://localhost:3000/api/negocios?status=EMITIDO'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(mockPrismaCount).toHaveBeenCalledWith({
				where: { AND: [{ status: BUSINESS_STATUS.EMITIDO }] },
			})
			expect(mockPrismaFindMany).toHaveBeenCalledWith({
				where: { AND: [{ status: BUSINESS_STATUS.EMITIDO }] },
				include: expect.any(Object),
				orderBy: { createdAt: 'desc' },
				skip: 0,
				take: 10,
			})
			expect(response.status).toBe(200)
			expect(responseData.data.businesses).toEqual(mockEntities)
		})

		it('debe filtrar negocios por rol AGENTE (solo sus negocios)', async () => {
			const mockSession = {
				user: {
					email: 'agent@example.com',
				},
			}

			const mockBusinesses = [mockPrismaBusiness]
			const mockEntities = [{ id: 1, contract: 'PN0001234' }]

			mockAuth.mockResolvedValue(mockSession as never)
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: null,
					status: null,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAgentUser)
			mockPrismaCount.mockResolvedValue(1)
			mockPrismaFindMany.mockResolvedValue(mockBusinesses as never)
			mockPrismaBusinessListToEntities.mockReturnValue(mockEntities as never)

			const request = new Request('http://localhost:3000/api/negocios')
			const response = await GET(request)
			const responseData = await response.json()

			expect(mockPrismaCount).toHaveBeenCalledWith({
				where: { AND: [{ idUser: mockAgentUser.idUser }] },
			})
			expect(mockPrismaFindMany).toHaveBeenCalledWith({
				where: { AND: [{ idUser: mockAgentUser.idUser }] },
				include: expect.any(Object),
				orderBy: { createdAt: 'desc' },
				skip: 0,
				take: 10,
			})
			expect(response.status).toBe(200)
			expect(responseData.data.businesses).toEqual(mockEntities)
		})

		it('debe combinar filtros de rol y estado', async () => {
			const mockSession = {
				user: {
					email: 'agent@example.com',
				},
			}

			const mockBusinesses = [mockPrismaBusinessVentaEfectuada]
			const mockEntities = [{ id: 1, contract: null }]

			mockAuth.mockResolvedValue(mockSession as never)
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: null,
					status: BUSINESS_STATUS.VENTA_EFECTUADA,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAgentUser)
			mockPrismaCount.mockResolvedValue(1)
			mockPrismaFindMany.mockResolvedValue(mockBusinesses as never)
			mockPrismaBusinessListToEntities.mockReturnValue(mockEntities as never)

			const request = new Request(
				'http://localhost:3000/api/negocios?status=VENTA_EFECTUADA'
			)
			await GET(request)

			expect(mockPrismaCount).toHaveBeenCalledWith({
				where: {
					AND: [
						{ idUser: mockAgentUser.idUser },
						{ status: BUSINESS_STATUS.VENTA_EFECTUADA },
					],
				},
			})
		})
	})

	describe('Búsqueda Unificada', () => {
		it('debe buscar por número de identificación del cliente', async () => {
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

			const mockBusinesses = [mockPrismaBusiness]
			const mockEntities = [{ id: 1 }]

			mockAuth.mockResolvedValue(mockSession as never)
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: '1234567890',
					status: null,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaCount.mockResolvedValue(1)
			mockPrismaFindMany.mockResolvedValue(mockBusinesses as never)
			mockPrismaBusinessListToEntities.mockReturnValue(mockEntities as never)

			const request = new Request(
				'http://localhost:3000/api/negocios?search=1234567890'
			)
			await GET(request)

			expect(mockPrismaFindMany).toHaveBeenCalledWith({
				where: {
					AND: [
						{
							OR: [
								{
									client: {
										OR: [
											{
												identityNumber: {
													contains: '1234567890',
													mode: 'insensitive',
												},
											},
											{
												name: {
													contains: '1234567890',
													mode: 'insensitive',
												},
											},
											{
												lastName: {
													contains: '1234567890',
													mode: 'insensitive',
												},
											},
											{
												email: {
													contains: '1234567890',
													mode: 'insensitive',
												},
											},
										],
									},
								},
								{
									contract: {
										contains: '1234567890',
										mode: 'insensitive',
									},
								},
								{ idBusiness: 1234567890 },
							],
						},
					],
				},
				include: expect.any(Object),
				orderBy: { createdAt: 'desc' },
				skip: 0,
				take: 10,
			})
		})

		it('debe buscar por nombre del cliente', async () => {
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

			const mockBusinesses = [mockPrismaBusiness]
			const mockEntities = [{ id: 1 }]

			mockAuth.mockResolvedValue(mockSession as never)
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: 'María',
					status: null,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaCount.mockResolvedValue(1)
			mockPrismaFindMany.mockResolvedValue(mockBusinesses as never)
			mockPrismaBusinessListToEntities.mockReturnValue(mockEntities as never)

			const request = new Request(
				'http://localhost:3000/api/negocios?search=María'
			)
			await GET(request)

			expect(mockPrismaFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						AND: expect.arrayContaining([
							{
								OR: expect.arrayContaining([
									{
										client: {
											OR: expect.arrayContaining([
												{
													name: {
														contains: 'María',
														mode: 'insensitive',
													},
												},
											]),
										},
									},
								]),
							},
						]),
					}),
				})
			)
		})

		it('debe buscar por número de contrato', async () => {
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

			const mockBusinesses = [mockPrismaBusinessEmitido]
			const mockEntities = [{ id: 2 }]

			mockAuth.mockResolvedValue(mockSession as never)
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: 'PN0005678',
					status: null,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaCount.mockResolvedValue(1)
			mockPrismaFindMany.mockResolvedValue(mockBusinesses as never)
			mockPrismaBusinessListToEntities.mockReturnValue(mockEntities as never)

			const request = new Request(
				'http://localhost:3000/api/negocios?search=PN0005678'
			)
			await GET(request)

			expect(mockPrismaFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						AND: expect.arrayContaining([
							{
								OR: expect.arrayContaining([
									{
										contract: {
											contains: 'PN0005678',
											mode: 'insensitive',
										},
									},
								]),
							},
						]),
					}),
				})
			)
		})

		it('debe buscar por ID del negocio cuando el término es numérico', async () => {
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

			const mockBusinesses = [mockPrismaBusiness]
			const mockEntities = [{ id: 1 }]

			mockAuth.mockResolvedValue(mockSession as never)
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: '1',
					status: null,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaCount.mockResolvedValue(1)
			mockPrismaFindMany.mockResolvedValue(mockBusinesses as never)
			mockPrismaBusinessListToEntities.mockReturnValue(mockEntities as never)

			const request = new Request('http://localhost:3000/api/negocios?search=1')
			await GET(request)

			expect(mockPrismaFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						AND: expect.arrayContaining([
							{
								OR: expect.arrayContaining([{ idBusiness: 1 }]),
							},
						]),
					}),
				})
			)
		})

		it('debe ignorar espacios en blanco en la búsqueda', async () => {
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
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: '  María  ',
					status: null,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaCount.mockResolvedValue(0)
			mockPrismaFindMany.mockResolvedValue([] as never)
			mockPrismaBusinessListToEntities.mockReturnValue([] as never)

			const request = new Request(
				'http://localhost:3000/api/negocios?search=  María  '
			)
			await GET(request)

			expect(mockPrismaFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						AND: expect.arrayContaining([
							{
								OR: expect.arrayContaining([
									{
										client: {
											OR: expect.arrayContaining([
												{
													name: {
														contains: 'María',
														mode: 'insensitive',
													},
												},
											]),
										},
									},
								]),
							},
						]),
					}),
				})
			)
		})

		it('debe combinar búsqueda con filtros de rol y estado', async () => {
			const mockSession = {
				user: {
					email: 'agent@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: 'PN0001234',
					status: BUSINESS_STATUS.VENTA_EFECTUADA,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAgentUser)
			mockPrismaCount.mockResolvedValue(0)
			mockPrismaFindMany.mockResolvedValue([] as never)
			mockPrismaBusinessListToEntities.mockReturnValue([] as never)

			const request = new Request(
				'http://localhost:3000/api/negocios?search=PN0001234&status=VENTA_EFECTUADA'
			)
			await GET(request)

			expect(mockPrismaCount).toHaveBeenCalledWith({
				where: {
					AND: [
						{ idUser: mockAgentUser.idUser },
						{ status: BUSINESS_STATUS.VENTA_EFECTUADA },
						{
							OR: expect.arrayContaining([
								{
									contract: {
										contains: 'PN0001234',
										mode: 'insensitive',
									},
								},
							]),
						},
					],
				},
			})
		})
	})

	describe('Casos de Autenticación', () => {
		it('debe retornar 401 cuando no hay sesión', async () => {
			mockAuth.mockResolvedValue(null as never)

			const request = new Request('http://localhost:3000/api/negocios')
			const response = await GET(request)
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

			const request = new Request('http://localhost:3000/api/negocios')
			const response = await GET(request)
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({
				data: null,
				error: 'No autorizado',
			})
		})
	})

	describe('Casos de Validación de Parámetros', () => {
		it('debe retornar 400 cuando los parámetros son inválidos', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: false,
				error: {
					message: 'pageSize debe ser menor o igual a 100',
				},
			} as never)

			const request = new Request(
				'http://localhost:3000/api/negocios?pageSize=200'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData).toEqual({
				data: null,
				error: 'pageSize debe ser menor o igual a 100',
			})
			expect(mockGetCurrentUserByEmail).not.toHaveBeenCalled()
		})

		it('debe retornar 400 cuando el estado es inválido', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: false,
				error: {
					message: 'Estado inválido',
				},
			} as never)

			const request = new Request(
				'http://localhost:3000/api/negocios?status=INVALIDO'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.error).toBe('Estado inválido')
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
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: null,
					status: null,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(null)

			const request = new Request('http://localhost:3000/api/negocios')
			const response = await GET(request)
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Usuario no encontrado',
			})
		})
	})

	describe('Casos de Paginación', () => {
		it('debe calcular correctamente totalPages cuando hay resto', async () => {
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
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: null,
					status: null,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaCount.mockResolvedValue(25)
			mockPrismaFindMany.mockResolvedValue([] as never)
			mockPrismaBusinessListToEntities.mockReturnValue([] as never)

			const request = new Request('http://localhost:3000/api/negocios')
			const response = await GET(request)
			const responseData = await response.json()

			expect(responseData.data.pagination.totalPages).toBe(3) // Math.ceil(25 / 10) = 3
		})

		it('debe retornar página vacía cuando no hay resultados', async () => {
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
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: null,
					status: null,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaCount.mockResolvedValue(0)
			mockPrismaFindMany.mockResolvedValue([] as never)
			mockPrismaBusinessListToEntities.mockReturnValue([] as never)

			const request = new Request('http://localhost:3000/api/negocios')
			const response = await GET(request)
			const responseData = await response.json()

			expect(responseData.data.businesses).toEqual([])
			expect(responseData.data.pagination).toEqual({
				page: 1,
				pageSize: 10,
				total: 0,
				totalPages: 0,
			})
		})
	})

	describe('Casos de Errores de Base de Datos', () => {
		it('debe retornar 500 cuando count falla', async () => {
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
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: null,
					status: null,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaCount.mockRejectedValue(new Error('Database error'))

			const request = new Request('http://localhost:3000/api/negocios')
			const response = await GET(request)
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error interno del servidor',
			})
		})

		it('debe retornar 500 cuando findMany falla', async () => {
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
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: null,
					status: null,
				},
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaCount.mockResolvedValue(10)
			mockPrismaFindMany.mockRejectedValue(new Error('Query failed'))

			const request = new Request('http://localhost:3000/api/negocios')
			const response = await GET(request)
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
			mockBusinessListParamsSchema.safeParse.mockReturnValue({
				success: true,
				data: {
					page: 1,
					pageSize: 10,
					search: null,
					status: null,
				},
			} as never)
			mockGetCurrentUserByEmail.mockRejectedValue(
				new Error('Database connection error')
			)

			const request = new Request('http://localhost:3000/api/negocios')
			const response = await GET(request)
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error interno del servidor',
			})
		})
	})
})
