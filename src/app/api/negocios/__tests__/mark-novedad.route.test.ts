import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PATCH } from '../[id]/mark-novedad/route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { markNovedadSchema } from '@/features/negocios/lib/business-api.schemas'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { NextResponse } from 'next/server'
import {
	BUSINESS_STATUS,
	BUSINESS_NOVEDAD_STATUS,
} from '@/features/negocios/types/business-entity.types'
import { mockUserWithRole } from '@/features/shared/__tests__/fixtures/mockUserWithRole'
import { mockPrismaBusiness } from '@/features/negocios/__tests__/fixtures/mock-prisma-business'

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
	markNovedadSchema: {
		safeParse: vi.fn(),
	},
}))
vi.mock('@/features/negocios/mappers/business-entity.mapper')
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		BUSINESS_NOVEDAD_MARKED: 'BUSINESS_NOVEDAD_MARKED',
		BUSINESS_NOVEDAD_UNMARKED: 'BUSINESS_NOVEDAD_UNMARKED',
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

describe('PATCH /api/negocios/[id]/mark-novedad', () => {
	const mockAuth = vi.mocked(auth)
	const mockGetCurrentUserByEmail = vi.mocked(getCurrentUserByEmail)
	const mockPrismaFindUnique = vi.mocked(prisma.business.findUnique)
	const mockPrismaUpdate = vi.mocked(prisma.business.update)
	const mockMarkNovedadSchema = vi.mocked(markNovedadSchema)
	const mockPrismaBusinessToEntity = vi.mocked(prismaBusinessToEntity)
	const mockLogAuditEvent = vi.mocked(logAuditEvent)
	const mockNextResponseJson = vi.mocked(NextResponse.json)

	const mockAdminUser = {
		...mockUserWithRole,
		idUser: 10,
		idRole: 5,
		email: 'admin@example.com',
	}

	const mockSession = {
		user: { email: 'admin@example.com' },
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

	function buildRequest(id: string, body: unknown) {
		return new Request(`http://localhost:3000/api/negocios/${id}/mark-novedad`, {
			method: 'PATCH',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' },
		})
	}

	describe('Casos de Autenticación', () => {
		it('debe retornar 401 cuando no hay sesión', async () => {
			mockAuth.mockResolvedValue(null as never)

			const response = await PATCH(buildRequest('1', { action: 'MARK' }), {
				params: Promise.resolve({ id: '1' }),
			})
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({ data: null, error: 'No autorizado' })
			expect(mockGetCurrentUserByEmail).not.toHaveBeenCalled()
		})
	})

	describe('Casos de Validación', () => {
		it('debe retornar 400 cuando el ID no es un número válido', async () => {
			mockAuth.mockResolvedValue(mockSession as never)

			const response = await PATCH(buildRequest('abc', { action: 'MARK' }), {
				params: Promise.resolve({ id: 'abc' }),
			})
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData).toEqual({
				data: null,
				error: 'ID de negocio inválido',
			})
		})

		it('debe retornar 400 cuando el body es inválido', async () => {
			mockAuth.mockResolvedValue(mockSession as never)
			mockMarkNovedadSchema.safeParse.mockReturnValue({
				success: false,
				error: { issues: [{ message: 'Acción inválida' }] },
			} as never)

			const response = await PATCH(buildRequest('1', { action: 'BOGUS' }), {
				params: Promise.resolve({ id: '1' }),
			})
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.error).toBe('Acción inválida')
		})
	})

	describe('Casos de No Encontrado', () => {
		it('debe retornar 404 cuando el usuario no existe', async () => {
			mockAuth.mockResolvedValue(mockSession as never)
			mockMarkNovedadSchema.safeParse.mockReturnValue({
				success: true,
				data: { action: 'MARK' },
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(null)

			const response = await PATCH(buildRequest('1', { action: 'MARK' }), {
				params: Promise.resolve({ id: '1' }),
			})
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Usuario no encontrado',
			})
		})

		it('debe retornar 404 cuando el negocio no existe', async () => {
			mockAuth.mockResolvedValue(mockSession as never)
			mockMarkNovedadSchema.safeParse.mockReturnValue({
				success: true,
				data: { action: 'MARK' },
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(null)

			const response = await PATCH(buildRequest('999', { action: 'MARK' }), {
				params: Promise.resolve({ id: '999' }),
			})
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Negocio no encontrado',
			})
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})
	})

	describe('MARK', () => {
		it('debe retornar 409 cuando el negocio no está en VENTA_EFECTUADA', async () => {
			mockAuth.mockResolvedValue(mockSession as never)
			mockMarkNovedadSchema.safeParse.mockReturnValue({
				success: true,
				data: { action: 'MARK' },
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue({
				...mockPrismaBusiness,
				status: BUSINESS_STATUS.EMITIDO,
				novedadStatus: null,
			} as never)

			const response = await PATCH(buildRequest('1', { action: 'MARK' }), {
				params: Promise.resolve({ id: '1' }),
			})

			expect(response.status).toBe(409)
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})

		it('debe retornar 409 cuando novedadStatus ya es PENDIENTE', async () => {
			mockAuth.mockResolvedValue(mockSession as never)
			mockMarkNovedadSchema.safeParse.mockReturnValue({
				success: true,
				data: { action: 'MARK' },
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue({
				...mockPrismaBusiness,
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
				novedadStatus: BUSINESS_NOVEDAD_STATUS.PENDIENTE,
			} as never)

			const response = await PATCH(buildRequest('1', { action: 'MARK' }), {
				params: Promise.resolve({ id: '1' }),
			})

			expect(response.status).toBe(409)
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})

		it('debe marcar novedad exitosamente y registrar auditoría', async () => {
			mockAuth.mockResolvedValue(mockSession as never)
			mockMarkNovedadSchema.safeParse.mockReturnValue({
				success: true,
				data: { action: 'MARK' },
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue({
				...mockPrismaBusiness,
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
				novedadStatus: null,
			} as never)

			const updatedBusiness = {
				...mockPrismaBusiness,
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
				novedadStatus: BUSINESS_NOVEDAD_STATUS.PENDIENTE,
				novedadMarkedAt: new Date('2026-07-30T12:00:00.000Z'),
			}
			mockPrismaUpdate.mockResolvedValue(updatedBusiness as never)
			const mockEntity = { id: 1, novedadStatus: BUSINESS_NOVEDAD_STATUS.PENDIENTE }
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const response = await PATCH(buildRequest('1', { action: 'MARK' }), {
				params: Promise.resolve({ id: '1' }),
			})
			const responseData = await response.json()

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { idBusiness: 1 },
				data: {
					novedadStatus: BUSINESS_NOVEDAD_STATUS.PENDIENTE,
					novedadMarkedAt: expect.any(Date),
				},
				include: expect.any(Object),
			})
			expect(mockLogAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: mockAdminUser.idUser,
					action: AuditAction.BUSINESS_NOVEDAD_MARKED,
					email: 'admin@example.com',
					ipAddress: '127.0.0.1',
					userAgent: 'test-agent',
				})
			)
			expect(response.status).toBe(200)
			expect(responseData).toEqual({ data: mockEntity })
		})
	})

	describe('UNMARK', () => {
		it('debe retornar 409 cuando novedadStatus no es PENDIENTE', async () => {
			mockAuth.mockResolvedValue(mockSession as never)
			mockMarkNovedadSchema.safeParse.mockReturnValue({
				success: true,
				data: { action: 'UNMARK' },
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue({
				...mockPrismaBusiness,
				novedadStatus: null,
			} as never)

			const response = await PATCH(buildRequest('1', { action: 'UNMARK' }), {
				params: Promise.resolve({ id: '1' }),
			})

			expect(response.status).toBe(409)
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})

		it('debe desmarcar novedad exitosamente y registrar auditoría', async () => {
			mockAuth.mockResolvedValue(mockSession as never)
			mockMarkNovedadSchema.safeParse.mockReturnValue({
				success: true,
				data: { action: 'UNMARK' },
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue({
				...mockPrismaBusiness,
				novedadStatus: BUSINESS_NOVEDAD_STATUS.PENDIENTE,
				novedadMarkedAt: new Date('2026-07-30T12:00:00.000Z'),
			} as never)

			const updatedBusiness = {
				...mockPrismaBusiness,
				novedadStatus: null,
				novedadMarkedAt: null,
			}
			mockPrismaUpdate.mockResolvedValue(updatedBusiness as never)
			const mockEntity = { id: 1, novedadStatus: null }
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const response = await PATCH(buildRequest('1', { action: 'UNMARK' }), {
				params: Promise.resolve({ id: '1' }),
			})
			const responseData = await response.json()

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { idBusiness: 1 },
				data: {
					novedadStatus: null,
					novedadMarkedAt: null,
				},
				include: expect.any(Object),
			})
			expect(mockLogAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.BUSINESS_NOVEDAD_UNMARKED,
				})
			)
			expect(response.status).toBe(200)
			expect(responseData).toEqual({ data: mockEntity })
		})
	})

	describe('Casos de Errores de Base de Datos', () => {
		it('debe retornar 500 cuando update falla', async () => {
			mockAuth.mockResolvedValue(mockSession as never)
			mockMarkNovedadSchema.safeParse.mockReturnValue({
				success: true,
				data: { action: 'MARK' },
			} as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue({
				...mockPrismaBusiness,
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
				novedadStatus: null,
			} as never)
			mockPrismaUpdate.mockRejectedValue(new Error('Update failed'))

			const response = await PATCH(buildRequest('1', { action: 'MARK' }), {
				params: Promise.resolve({ id: '1' }),
			})
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error interno del servidor',
			})
		})
	})
})
