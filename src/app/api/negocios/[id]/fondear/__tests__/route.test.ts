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
import { assertHasSupports } from '@/features/negocios/services/business-date-anchored.service'

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
vi.mock('@/features/negocios/services/business-date-anchored.service', () => ({
	assertHasSupports: vi.fn(),
}))
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
	const mockAssertHasSupports = vi.mocked(assertHasSupports)

	beforeEach(() => {
		vi.clearAllMocks()
		mockAssertHasSupports.mockResolvedValue({ ok: true })
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

	// ─── 4.5 fundedDate (fondeo directo con fecha) ────────────────────────
	describe('fundedDate', () => {
		it('debe anclar dateAnchored a las 12:00 UTC de la fundedDate provista', async () => {
			const mockSession = { user: { email: 'admin@example.com' } }
			const mockAdminUser = buildUserWithRole('admin@example.com', UserRole.ADMIN)

			const mockExistingBusiness = {
				...mockPrismaBusinessEmitido,
				status: BUSINESS_STATUS.EMITIDO,
				_count: { payments: 0 },
			}

			const dateAnchored = new Date('2026-06-15T12:00:00.000Z')
			const mockFundedBusiness = {
				...mockPrismaBusinessEmitido,
				status: BUSINESS_STATUS.FONDEADO,
				dateAnchored,
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(mockExistingBusiness as never)
			mockPrismaUpdate.mockResolvedValue(mockFundedBusiness as never)
			mockPrismaBusinessToEntity.mockReturnValue({
				id: 2,
				status: BUSINESS_STATUS.FONDEADO,
				dateAnchored: dateAnchored.toISOString(),
			} as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/2/fondear',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ fundedDate: '2026-06-15' }),
				}
			)

			const params = Promise.resolve({ id: '2' })
			const response = await POST(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(200)
			expect(mockPrismaUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: BUSINESS_STATUS.FONDEADO,
						dateAnchored: new Date('2026-06-15T12:00:00.000Z'),
					}),
				})
			)
			expect(mockLogAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.stringContaining('2026-06-15'),
				})
			)
			expect(responseData.data.status).toBe(BUSINESS_STATUS.FONDEADO)
		})

		it('debe retornar 400 cuando fundedDate tiene formato inválido', async () => {
			const mockSession = { user: { email: 'admin@example.com' } }
			const mockAdminUser = buildUserWithRole('admin@example.com', UserRole.ADMIN)

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)

			const request = new Request(
				'http://localhost:3000/api/negocios/2/fondear',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ fundedDate: '15-06-2026' }),
				}
			)

			const params = Promise.resolve({ id: '2' })
			const response = await POST(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.data).toBeNull()
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})

		it('debe retornar 400 cuando fundedDate es una fecha futura', async () => {
			const mockSession = { user: { email: 'admin@example.com' } }
			const mockAdminUser = buildUserWithRole('admin@example.com', UserRole.ADMIN)

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)

			const farFutureDate = '2099-01-01'
			const request = new Request(
				'http://localhost:3000/api/negocios/2/fondear',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ fundedDate: farFutureDate }),
				}
			)

			const params = Promise.resolve({ id: '2' })
			const response = await POST(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.data).toBeNull()
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})

		it('debe fondear sin fundedDate usando la fecha actual (comportamiento previo intacto)', async () => {
			const mockSession = { user: { email: 'admin@example.com' } }
			const mockAdminUser = buildUserWithRole('admin@example.com', UserRole.ADMIN)

			const mockExistingBusiness = {
				...mockPrismaBusinessEmitido,
				status: BUSINESS_STATUS.EMITIDO,
				_count: { payments: 0 },
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(mockExistingBusiness as never)
			mockPrismaUpdate.mockResolvedValue({
				...mockPrismaBusinessEmitido,
				status: BUSINESS_STATUS.FONDEADO,
				dateAnchored: new Date(),
			} as never)
			mockPrismaBusinessToEntity.mockReturnValue({
				id: 2,
				status: BUSINESS_STATUS.FONDEADO,
			} as never)

			// No body at all — preserves the original no-body request shape
			const request = new Request(
				'http://localhost:3000/api/negocios/2/fondear',
				{ method: 'POST' }
			)

			const params = Promise.resolve({ id: '2' })
			const response = await POST(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(200)
			expect(mockPrismaUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: BUSINESS_STATUS.FONDEADO,
						dateAnchored: expect.any(Date),
					}),
				})
			)
			expect(responseData.data.status).toBe(BUSINESS_STATUS.FONDEADO)
		})
	})

	// ─── 4.6 Support Guard ───────────────────────────────────────────────────
	describe('Support Guard', () => {
		it('debe retornar 409 cuando el negocio tiene 0 soportes activos', async () => {
			const mockSession = { user: { email: 'admin@example.com' } }
			const mockAdminUser = buildUserWithRole('admin@example.com', UserRole.ADMIN)

			const mockExistingBusiness = {
				...mockPrismaBusinessEmitido,
				status: BUSINESS_STATUS.EMITIDO,
				_count: { payments: 0 },
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(mockExistingBusiness as never)
			mockAssertHasSupports.mockResolvedValue({ ok: false, code: 'NO_SUPPORTS' })

			const request = new Request(
				'http://localhost:3000/api/negocios/2/fondear',
				{ method: 'POST' }
			)

			const params = Promise.resolve({ id: '2' })
			const response = await POST(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(409)
			expect(responseData.data).toBeNull()
			expect(responseData.error).toBe('No se puede fondear sin soportes adjuntos')
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
			expect(mockLogAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.stringContaining('"businessId":2'),
				})
			)
		})

		it('debe proceder con el fondeo cuando el negocio tiene soportes activos (happy path sin cambios)', async () => {
			const mockSession = { user: { email: 'admin@example.com' } }
			const mockAdminUser = buildUserWithRole('admin@example.com', UserRole.ADMIN)

			const mockExistingBusiness = {
				...mockPrismaBusinessEmitido,
				status: BUSINESS_STATUS.EMITIDO,
				_count: { payments: 0 },
			}

			const dateAnchored = new Date('2025-04-18T12:00:00.000Z')
			mockAuth.mockResolvedValue(mockSession as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
			mockPrismaFindUnique.mockResolvedValue(mockExistingBusiness as never)
			mockAssertHasSupports.mockResolvedValue({ ok: true })
			mockPrismaUpdate.mockResolvedValue({
				...mockPrismaBusinessEmitido,
				status: BUSINESS_STATUS.FONDEADO,
				dateAnchored,
			} as never)
			mockPrismaBusinessToEntity.mockReturnValue({
				id: 2,
				status: BUSINESS_STATUS.FONDEADO,
				dateAnchored: dateAnchored.toISOString(),
			} as never)

			const request = new Request(
				'http://localhost:3000/api/negocios/2/fondear',
				{ method: 'POST' }
			)

			const params = Promise.resolve({ id: '2' })
			const response = await POST(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(200)
			expect(responseData.data.status).toBe(BUSINESS_STATUS.FONDEADO)
		})
	})
})
