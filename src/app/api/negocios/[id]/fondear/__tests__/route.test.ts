import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { NextResponse } from 'next/server'
import { UserRole } from '@/features/auth/lib/roles'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
import {
	mockUserWithRole,
} from '@/features/shared/__tests__/fixtures/mockUserWithRole'
import {
	mockPrismaBusiness,
	mockPrismaBusinessEmitido,
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
vi.mock('@/features/negocios/mappers/business-entity.mapper')
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		BUSINESS_FUNDED: 'BUSINESS_FUNDED',
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

/** Helper: build a user mock with a given role */
function buildUserWithRole(email: string, roleCode: UserRole) {
	return {
		...mockUserWithRole,
		email,
		idUser: 10,
		idRole: 1,
		role: {
			idRole: 1,
			code: roleCode,
			name: roleCode,
			description: '',
			active: true,
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-01'),
		},
	}
}

describe('POST /api/negocios/[id]/fondear', () => {
	const mockAuth = vi.mocked(auth)
	const mockGetCurrentUserByEmail = vi.mocked(getCurrentUserByEmail)
	const mockPrismaFindUnique = vi.mocked(prisma.business.findUnique)
	const mockPrismaUpdate = vi.mocked(prisma.business.update)
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

	// ─── 4.1 Happy Path ──────────────────────────────────────────────────────
	describe('Happy Path', () => {
		it('debe fondear un negocio EMITIDO sin anualidades y retornar 200 con status FONDEADO y dateAnchored', async () => {
			const mockSession = { user: { email: 'admin@example.com' } }
			const mockAdminUser = buildUserWithRole('admin@example.com', UserRole.ADMIN)

			const mockExistingBusiness = {
				...mockPrismaBusinessEmitido,
				status: BUSINESS_STATUS.EMITIDO,
				_count: { payments: 0 },
			}

			const dateAnchored = new Date('2025-04-18T12:00:00.000Z')
			const mockFundedBusiness = {
				...mockPrismaBusinessEmitido,
				status: BUSINESS_STATUS.FONDEADO,
				dateAnchored,
			}

			const mockEntity = {
				id: 2,
				status: BUSINESS_STATUS.FONDEADO,
				dateAnchored: dateAnchored.toISOString(),
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(mockExistingBusiness as never)
			mockPrismaUpdate.mockResolvedValue(mockFundedBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue(mockEntity as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/2/fondear',
				{ method: 'POST' }
			)

			const params = Promise.resolve({ id: '2' })
			const response = await POST(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(200)
			expect(responseData.data.status).toBe(BUSINESS_STATUS.FONDEADO)
			expect(responseData.data.dateAnchored).not.toBeNull()
			expect(mockPrismaUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { idBusiness: 2 },
					data: expect.objectContaining({
						status: BUSINESS_STATUS.FONDEADO,
						dateAnchored: expect.any(Date),
					}),
				})
			)
			expect(mockLogAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.BUSINESS_FUNDED,
					email: 'admin@example.com',
				})
			)
		})
	})

	// ─── 4.2 Status Guard ────────────────────────────────────────────────────
	describe('Status Guard', () => {
		it('debe retornar 400 cuando el negocio está en estado VENTA_EFECTUADA', async () => {
			const mockSession = { user: { email: 'admin@example.com' } }
			const mockAdminUser = buildUserWithRole('admin@example.com', UserRole.ADMIN)

			const mockVentaEfectuadaBusiness = {
				...mockPrismaBusiness,
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
				_count: { payments: 0 },
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(mockVentaEfectuadaBusiness as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/fondear',
				{ method: 'POST' }
			)

			const params = Promise.resolve({ id: '1' })
			const response = await POST(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.data).toBeNull()
			expect(responseData.error).toContain('Emitido')
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})

		it('debe retornar 400 cuando el negocio ya está en estado FONDEADO', async () => {
			const mockSession = { user: { email: 'admin@example.com' } }
			const mockAdminUser = buildUserWithRole('admin@example.com', UserRole.ADMIN)

			const mockFondeadoBusiness = {
				...mockPrismaBusinessEmitido,
				status: BUSINESS_STATUS.FONDEADO,
				_count: { payments: 0 },
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(mockFondeadoBusiness as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/2/fondear',
				{ method: 'POST' }
			)

			const params = Promise.resolve({ id: '2' })
			const response = await POST(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.data).toBeNull()
			expect(responseData.error).toContain('Emitido')
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})
	})

	// ─── 4.3 AnnualPayments Guard ────────────────────────────────────────────
	describe('AnnualPayments Guard', () => {
		it('debe retornar 400 cuando el negocio EMITIDO tiene annualPayments > 0', async () => {
			const mockSession = { user: { email: 'admin@example.com' } }
			const mockAdminUser = buildUserWithRole('admin@example.com', UserRole.ADMIN)

			const mockEmitidoWithAPs = {
				...mockPrismaBusinessEmitido,
				status: BUSINESS_STATUS.EMITIDO,
				_count: { payments: 2 },
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(mockEmitidoWithAPs as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/2/fondear',
				{ method: 'POST' }
			)

			const params = Promise.resolve({ id: '2' })
			const response = await POST(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.data).toBeNull()
			expect(responseData.error).toContain('anualidades')
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})
	})

	// ─── 4.4 Role Guard ──────────────────────────────────────────────────────
	describe('Role Guard', () => {
		it('debe retornar 403 cuando el usuario tiene rol AGENTE', async () => {
			const mockSession = { user: { email: 'agente@example.com' } }
			const mockAgenteUser = buildUserWithRole(
				'agente@example.com',
				UserRole.AGENTE
			)

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAgenteUser)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/fondear',
				{ method: 'POST' }
			)

			const params = Promise.resolve({ id: '1' })
			const response = await POST(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(403)
			expect(responseData.data).toBeNull()
			expect(responseData.error).toContain('permisos')
			expect(mockPrismaFindUnique).not.toHaveBeenCalled()
		})

		it('debe retornar 401 cuando no hay sesión', async () => {
			mockAuth.mockResolvedValue(null as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/fondear',
				{ method: 'POST' }
			)

			const params = Promise.resolve({ id: '1' })
			const response = await POST(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({ data: null, error: 'No autorizado' })
		})

		it('debe retornar 404 cuando el usuario no existe', async () => {
			const mockSession = { user: { email: 'nobody@example.com' } }

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(null)

			const request = new Request(
				'http://localhost:3000/api/negocios/1/fondear',
				{ method: 'POST' }
			)

			const params = Promise.resolve({ id: '1' })
			const response = await POST(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Usuario no encontrado',
			})
		})

		it('debe retornar 404 cuando el negocio no existe', async () => {
			const mockSession = { user: { email: 'admin@example.com' } }
			const mockAdminUser = buildUserWithRole('admin@example.com', UserRole.ADMIN)

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(null)

			const request = new Request(
				'http://localhost:3000/api/negocios/999/fondear',
				{ method: 'POST' }
			)

			const params = Promise.resolve({ id: '999' })
			const response = await POST(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Negocio no encontrado',
			})
		})

		it('debe retornar 400 cuando el id no es un número válido', async () => {
			const mockSession = { user: { email: 'admin@example.com' } }

			mockAuth.mockResolvedValue(mockSession as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/abc/fondear',
				{ method: 'POST' }
			)

			const params = Promise.resolve({ id: 'abc' })
			const response = await POST(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData).toEqual({
				data: null,
				error: 'ID de negocio inválido',
			})
		})
	})
})
