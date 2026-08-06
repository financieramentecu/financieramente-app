import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PATCH } from '../[id]/cancel/route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { cancelBusinessSchema } from '@/features/negocios/lib/business-api.schemas'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { NextResponse } from 'next/server'
import { UserRole } from '@/features/auth/lib/roles'
import {
	BUSINESS_STATUS,
	BUSINESS_NOVEDAD_STATUS,
} from '@/features/negocios/types/business-entity.types'
import {
	mockUserWithRole,
	mockAgentUser,
} from '@/features/shared/__tests__/fixtures/mockUserWithRole'
import {
	mockPrismaBusiness,
	mockPrismaBusinessEmitido,
	mockPrismaBusinessCancelado,
} from '@/features/negocios/__tests__/fixtures/mock-prisma-business'

// Mock de módulos externos
vi.mock('@/auth')
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
	},
}))
vi.mock('@/features/negocios/services/user.service')
vi.mock('@/features/negocios/lib/business-api.schemas', () => ({
	cancelBusinessSchema: {
		safeParse: vi.fn(),
	},
}))
vi.mock('@/features/negocios/mappers/business-entity.mapper')
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		BUSINESS_CANCELLED: 'BUSINESS_CANCELLED',
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

describe('PATCH /api/negocios/[id]/cancel', () => {
	const mockAuth = vi.mocked(auth)
	const mockGetCurrentUserByEmail = vi.mocked(getCurrentUserByEmail)
	const mockPrismaFindUnique = vi.mocked(prisma.business.findUnique)
	const mockPrismaUpdate = vi.mocked(prisma.business.update)
	const mockCancelBusinessSchema = vi.mocked(cancelBusinessSchema)
	const mockPrismaBusinessToEntity = vi.mocked(prismaBusinessToEntity)
	const mockLogAuditEvent = vi.mocked(logAuditEvent)
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
		it('debe cancelar negocio exitosamente con rol ADMIN', async () => {
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
					description:
						'Acceso total a todos los módulos y configuración del sistema',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const mockExistingBusiness = {
				...mockPrismaBusiness,
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
			}

			const mockCancelledBusiness = {
				...mockPrismaBusiness,
				status: BUSINESS_STATUS.CANCELADO,
				observations:
					'[CANCELADO] Cliente solicitó cancelación por cambio de planes',
			}

			const mockEntity = {
				id: 1,
				status: BUSINESS_STATUS.CANCELADO,
				contract: mockPrismaBusiness.contract,
			}

			const requestBody = {
				reason: 'Cliente solicitó cancelación por cambio de planes',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(mockExistingBusiness as never)
			mockPrismaUpdate.mockResolvedValue(mockCancelledBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
					headers: {
						'Content-Type': 'application/json',
					},
				}
			)

			const params = Promise.resolve({ id: '1' })
			const response = await PATCH(request, { params })
			const responseData = await response.json()

			expect(mockAuth).toHaveBeenCalledTimes(1)
			expect(mockCancelBusinessSchema.safeParse).toHaveBeenCalledWith(
				requestBody
			)
			expect(mockGetCurrentUserByEmail).toHaveBeenCalledWith(
				'admin@example.com'
			)
			expect(mockPrismaFindUnique).toHaveBeenCalledWith({
				where: { idBusiness: 1 },
			})
			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { idBusiness: 1 },
				data: {
					status: BUSINESS_STATUS.CANCELADO,
					observations: `[CANCELADO] ${requestBody.reason}`,
				},
				include: expect.any(Object),
			})
			expect(mockLogAuditEvent).toHaveBeenCalledWith({
				userId: mockAdminUser.idUser,
				roleId: mockAdminUser.idRole,
				action: AuditAction.BUSINESS_CANCELLED,
				email: 'admin@example.com',
				ipAddress: '127.0.0.1',
				userAgent: 'test-agent',
				details: expect.stringContaining('businessId'),
			})
			expect(mockPrismaBusinessToEntity).toHaveBeenCalledWith(
				mockCancelledBusiness
			)
			expect(response.status).toBe(200)
			expect(responseData).toEqual({ data: mockEntity })
		})

		it('debe cancelar negocio exitosamente con rol ANALISTA_SOPORTE', async () => {
			const mockSession = {
				user: {
					email: 'analista@example.com',
				},
			}

			const mockAnalistaUser = {
				...mockUserWithRole,
				email: 'analista@example.com',
				role: {
					idRole: 1,
					code: UserRole.ANALISTA_SOPORTE,
					name: 'Analista de Soporte',
					description: 'Acceso limitado a negocios y reportes de negocio',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const mockExistingBusiness = {
				...mockPrismaBusinessEmitido,
				status: BUSINESS_STATUS.EMITIDO,
			}

			const mockCancelledBusiness = {
				...mockExistingBusiness,
				status: BUSINESS_STATUS.CANCELADO,
				observations: '[CANCELADO] Error en documentación del cliente',
			}

			const mockEntity = {
				id: 2,
				status: BUSINESS_STATUS.CANCELADO,
			}

			const requestBody = {
				reason: 'Error en documentación del cliente',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAnalistaUser)
			mockPrismaFindUnique.mockResolvedValue(mockExistingBusiness as never)
			mockPrismaUpdate.mockResolvedValue(mockCancelledBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/2/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '2' })
			const response = await PATCH(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(200)
			expect(responseData.data.status).toBe(BUSINESS_STATUS.CANCELADO)
		})

		it('debe cancelar negocio exitosamente con rol ASISTENTE_GERENCIA_OPERATIVA', async () => {
			const mockSession = {
				user: {
					email: 'asistente@example.com',
				},
			}

			const mockAsistenteUser = {
				...mockUserWithRole,
				email: 'asistente@example.com',
				role: {
					idRole: 1,
					code: UserRole.ASISTENTE_GERENCIA_OPERATIVA,
					name: 'Asistente Operativo de Gerencia',
					description: 'Acceso completo al sistema excepto administración',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const mockExistingBusiness = {
				...mockPrismaBusiness,
				status: BUSINESS_STATUS.EMITIDO,
			}

			const mockCancelledBusiness = {
				...mockExistingBusiness,
				status: BUSINESS_STATUS.CANCELADO,
				observations: '[CANCELADO] Decisión gerencial',
			}

			const mockEntity = {
				id: 1,
				status: BUSINESS_STATUS.CANCELADO,
			}

			const requestBody = {
				reason: 'Decisión gerencial',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAsistenteUser)
			mockPrismaFindUnique.mockResolvedValue(mockExistingBusiness as never)
			mockPrismaUpdate.mockResolvedValue(mockCancelledBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '1' })
			const response = await PATCH(request, { params })

			expect(response.status).toBe(200)
		})
	})

	describe('Casos de Autenticación', () => {
		it('debe retornar 401 cuando no hay sesión', async () => {
			mockAuth.mockResolvedValue(null as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify({ reason: 'Motivo de prueba largo suficiente' }),
				}
			)

			const params = Promise.resolve({ id: '1' })
			const response = await PATCH(request, { params })
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

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify({ reason: 'Motivo de prueba largo suficiente' }),
				}
			)

			const params = Promise.resolve({ id: '1' })
			const response = await PATCH(request, { params })
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

			const request = new Request(
				'http://localhost:3000/api/negocios/abc/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify({ reason: 'Motivo de prueba largo suficiente' }),
				}
			)

			const params = Promise.resolve({ id: 'abc' })
			const response = await PATCH(request, { params })
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

			const request = new Request(
				'http://localhost:3000/api/negocios//cancel',
				{
					method: 'PATCH',
					body: JSON.stringify({ reason: 'Motivo de prueba largo suficiente' }),
				}
			)

			const params = Promise.resolve({ id: '' })
			const response = await PATCH(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.error).toBe('ID de negocio inválido')
		})
	})

	describe('Casos de Validación de Body', () => {
		it('debe retornar 400 cuando el motivo es muy corto', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const requestBody = {
				reason: 'Corto',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: false,
				error: {
					issues: [{ message: 'El motivo debe tener al menos 20 caracteres' }],
				},
			} as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '1' })
			const response = await PATCH(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.error).toBe(
				'El motivo debe tener al menos 20 caracteres'
			)
		})

		it('debe retornar 400 cuando el motivo es muy largo', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const requestBody = {
				reason: 'a'.repeat(501),
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: false,
				error: {
					issues: [{ message: 'El motivo no puede exceder 500 caracteres' }],
				},
			} as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '1' })
			const response = await PATCH(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.error).toBe(
				'El motivo no puede exceder 500 caracteres'
			)
		})

		it('debe retornar 400 cuando el motivo falta', async () => {
			const mockSession = {
				user: {
					email: 'admin@example.com',
				},
			}

			const requestBody = {}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: false,
				error: {
					issues: [{ message: 'Datos inválidos' }],
				},
			} as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '1' })
			const response = await PATCH(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.error).toBe('Datos inválidos')
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
				reason: 'Cliente solicitó cancelación por cambio de planes',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(null)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '1' })
			const response = await PATCH(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Usuario no encontrado',
			})
		})
	})

	describe('Casos de Permisos', () => {
		it('debe retornar 403 cuando el usuario es AGENTE', async () => {
			const mockSession = {
				user: {
					email: 'agent@example.com',
				},
			}

			const requestBody = {
				reason: 'Cliente solicitó cancelación por cambio de planes',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAgentUser)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '1' })
			const response = await PATCH(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(403)
			expect(responseData).toEqual({
				data: null,
				error: 'No tiene permisos para cancelar negocios',
			})
			expect(mockPrismaFindUnique).not.toHaveBeenCalled()
		})

		it('debe retornar 403 cuando el usuario tiene rol DEFAULT', async () => {
			const mockSession = {
				user: {
					email: 'default@example.com',
				},
			}

			const mockDefaultUser = {
				...mockUserWithRole,
				email: 'default@example.com',
				role: {
					idRole: 1,
					code: UserRole.DEFAULT,
					name: 'Default',
					description: 'Rol por defecto',
					active: true,
					createdAt: new Date('2024-01-01'),
					updatedAt: new Date('2024-01-01'),
				},
			}

			const requestBody = {
				reason: 'Cliente solicitó cancelación por cambio de planes',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockDefaultUser)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '1' })
			const response = await PATCH(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(403)
			expect(responseData.error).toBe(
				'No tiene permisos para cancelar negocios'
			)
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
				reason: 'Cliente solicitó cancelación por cambio de planes',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(null)

			const request = new Request(
				'http://localhost:3000/api/negocios/999/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '999' })
			const response = await PATCH(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Negocio no encontrado',
			})
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})
	})

	describe('Casos de Estado del Negocio', () => {
		it('debe retornar 400 cuando el negocio ya está cancelado', async () => {
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
				reason: 'Cliente solicitó cancelación por cambio de planes',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(
				mockPrismaBusinessCancelado as never
			)

			const request = new Request(
				'http://localhost:3000/api/negocios/3/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '3' })
			const response = await PATCH(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData).toEqual({
				data: null,
				error: 'El negocio ya está cancelado',
			})
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})

		it('debe retornar 400 cuando el negocio está en estado no cancelable', async () => {
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

			const mockBusinessCancelado = {
				...mockPrismaBusiness,
				status: 'OTRO_ESTADO' as typeof BUSINESS_STATUS.CANCELADO,
			}

			const requestBody = {
				reason: 'Cliente solicitó cancelación por cambio de planes',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(mockBusinessCancelado as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '1' })
			const response = await PATCH(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.error).toBe(
				'Solo se pueden cancelar negocios en estado Venta Efectuada, Emitido o Fondeado'
			)
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})
	})

	describe('Casos de Errores de Base de Datos', () => {
		it('debe retornar 500 cuando findUnique falla', async () => {
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
				reason: 'Cliente solicitó cancelación por cambio de planes',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockRejectedValue(new Error('Database error'))

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '1' })
			const response = await PATCH(request, { params })
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
				...mockPrismaBusiness,
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
			}

			const requestBody = {
				reason: 'Cliente solicitó cancelación por cambio de planes',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(mockExistingBusiness as never)
			mockPrismaUpdate.mockRejectedValue(new Error('Update failed'))

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '1' })
			const response = await PATCH(request, { params })
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

			const requestBody = {
				reason: 'Cliente solicitó cancelación por cambio de planes',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockRejectedValue(
				new Error('Database connection error')
			)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '1' })
			const response = await PATCH(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error interno del servidor',
			})
		})
	})

	describe('Verificación de Observaciones', () => {
		it('debe agregar el prefijo [CANCELADO] a las observaciones', async () => {
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
				...mockPrismaBusiness,
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
			}

			const mockCancelledBusiness = {
				...mockExistingBusiness,
				status: BUSINESS_STATUS.CANCELADO,
				observations: '[CANCELADO] Motivo de prueba',
			}

			const mockEntity = {
				id: 1,
				status: BUSINESS_STATUS.CANCELADO,
			}

			const requestBody = {
				reason: 'Motivo de prueba',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(mockExistingBusiness as never)
			mockPrismaUpdate.mockResolvedValue(mockCancelledBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '1' })
			await PATCH(request, { params })

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { idBusiness: 1 },
				data: {
					status: BUSINESS_STATUS.CANCELADO,
					observations: '[CANCELADO] Motivo de prueba',
				},
				include: expect.any(Object),
			})
		})
	})

	describe('Verificación de Audit Log', () => {
		it('debe registrar el evento de cancelación con todos los detalles', async () => {
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
				...mockPrismaBusiness,
				idBusiness: 123,
				status: BUSINESS_STATUS.EMITIDO,
			}

			const mockCancelledBusiness = {
				...mockExistingBusiness,
				status: BUSINESS_STATUS.CANCELADO,
				observations: '[CANCELADO] Razón de cancelación',
			}

			const mockEntity = {
				id: 123,
				status: BUSINESS_STATUS.CANCELADO,
			}

			const requestBody = {
				reason: 'Razón de cancelación',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(mockExistingBusiness as never)
			mockPrismaUpdate.mockResolvedValue(mockCancelledBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/123/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
					headers: {
						'x-forwarded-for': '192.168.1.1',
						'user-agent': 'Mozilla/5.0',
					},
				}
			)

			const params = Promise.resolve({ id: '123' })
			await PATCH(request, { params })

			expect(mockLogAuditEvent).toHaveBeenCalledWith({
				userId: 10,
				roleId: 5,
				action: AuditAction.BUSINESS_CANCELLED,
				email: 'admin@example.com',
				ipAddress: '127.0.0.1',
				userAgent: 'test-agent',
				details: expect.stringContaining('"businessId":123'),
			})

			const auditCall = mockLogAuditEvent.mock.calls[0][0]
			const details = JSON.parse(auditCall.details as string)
			expect(details.businessId).toBe(123)
			expect(details.previousStatus).toBe(BUSINESS_STATUS.EMITIDO)
			expect(details.reason).toBe('Razón de cancelación')
		})
	})

	describe('Persistencia de Novedad al Cancelar', () => {
		it('debe dejar intacta una novedad PENDIENTE al cancelar el negocio', async () => {
			const mockSession = {
				user: { email: 'admin@example.com' },
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

			const markedAt = new Date('2026-07-01T10:00:00.000Z')

			const mockExistingBusiness = {
				...mockPrismaBusiness,
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
				novedadStatus: BUSINESS_NOVEDAD_STATUS.PENDIENTE,
				novedadMarkedAt: markedAt,
			}

			const mockCancelledBusiness = {
				...mockExistingBusiness,
				status: BUSINESS_STATUS.CANCELADO,
				observations: '[CANCELADO] Motivo de prueba con novedad pendiente',
			}

			const requestBody = {
				reason: 'Motivo de prueba con novedad pendiente',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(mockExistingBusiness as never)
			mockPrismaUpdate.mockResolvedValue(mockCancelledBusiness as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '1' })
			await PATCH(request, { params })

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { idBusiness: 1 },
				data: {
					status: BUSINESS_STATUS.CANCELADO,
					observations: `[CANCELADO] ${requestBody.reason}`,
				},
				include: expect.any(Object),
			})

			const updateCallData = mockPrismaUpdate.mock.calls[0][0].data
			expect(updateCallData).not.toHaveProperty('novedadStatus')
			expect(updateCallData).not.toHaveProperty('novedadMarkedAt')
		})

		it('debe dejar intacta cualquier novedad no-null (ej. SOMETIDA_DEVOLUCION) al cancelar el negocio (D10)', async () => {
			const mockSession = {
				user: { email: 'admin@example.com' },
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
				...mockPrismaBusiness,
				status: BUSINESS_STATUS.EMITIDO,
				novedadStatus: BUSINESS_NOVEDAD_STATUS.SOMETIDA_DEVOLUCION,
			}

			const mockCancelledBusiness = {
				...mockExistingBusiness,
				status: BUSINESS_STATUS.CANCELADO,
				observations: '[CANCELADO] Motivo de prueba con novedad sometida a devolución',
			}

			const requestBody = {
				reason: 'Motivo de prueba con novedad sometida a devolución',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCancelBusinessSchema.safeParse.mockReturnValue({
				success: true,
				data: requestBody,
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(mockExistingBusiness as never)
			mockPrismaUpdate.mockResolvedValue(mockCancelledBusiness as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/cancel',
				{
					method: 'PATCH',
					body: JSON.stringify(requestBody),
				}
			)

			const params = Promise.resolve({ id: '1' })
			await PATCH(request, { params })

			const updateCallData = mockPrismaUpdate.mock.calls[0][0].data
			expect(updateCallData).not.toHaveProperty('novedadStatus')
		})
	})
})
