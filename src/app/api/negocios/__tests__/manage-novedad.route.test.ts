import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PATCH } from '../[id]/manage-novedad/route'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import {
	getNovedadContext,
	updateNovedadStatus,
} from '@/features/negocios/services/business-novedad.service'
import { manageNovedadSchema } from '@/features/negocios/lib/business-api.schemas'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { NextResponse } from 'next/server'
import { UserRole } from '@/features/auth/lib/roles'
import { BUSINESS_NOVEDAD_STATUS } from '@/features/negocios/types/business-entity.types'
import {
	mockUserWithRole,
	mockAgentUser,
	createMockUserWithRole,
} from '@/features/shared/__tests__/fixtures/mockUserWithRole'
import { mockPrismaBusiness } from '@/features/negocios/__tests__/fixtures/mock-prisma-business'

vi.mock('@/auth')
vi.mock('@/features/negocios/services/user.service')
vi.mock('@/features/negocios/services/business-novedad.service')
vi.mock('@/features/negocios/lib/business-api.schemas', () => ({
	manageNovedadSchema: {
		safeParse: vi.fn(),
	},
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		BUSINESS_NOVEDAD_STATUS_CHANGED: 'BUSINESS_NOVEDAD_STATUS_CHANGED',
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

describe('PATCH /api/negocios/[id]/manage-novedad', () => {
	const mockAuth = vi.mocked(auth)
	const mockGetCurrentUserByEmail = vi.mocked(getCurrentUserByEmail)
	const mockGetNovedadContext = vi.mocked(getNovedadContext)
	const mockUpdateNovedadStatus = vi.mocked(updateNovedadStatus)
	const mockManageNovedadSchema = vi.mocked(manageNovedadSchema)
	const mockLogAuditEvent = vi.mocked(logAuditEvent)
	const mockNextResponseJson = vi.mocked(NextResponse.json)

	const mockAnalistaUser = { ...mockUserWithRole, idUser: 10, idRole: 1 }
	const mockAdminUser = createMockUserWithRole(UserRole.ADMIN)
	const mockSession = { user: { email: 'analista@example.com' } }

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
		return new Request(`http://localhost:3000/api/negocios/${id}/manage-novedad`, {
			method: 'PATCH',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' },
		})
	}

	it('returns 401 when there is no session', async () => {
		mockAuth.mockResolvedValue(null as never)

		const response = await PATCH(
			buildRequest('1', { novedadStatus: 'DECLINADA' }),
			{ params: Promise.resolve({ id: '1' }) }
		)

		expect(response.status).toBe(401)
		expect(mockGetCurrentUserByEmail).not.toHaveBeenCalled()
	})

	it('returns 403 when the role is outside [ADMIN, ANALISTA_SOPORTE]', async () => {
		mockAuth.mockResolvedValue(mockSession as never)
		mockGetCurrentUserByEmail.mockResolvedValue(mockAgentUser)

		const response = await PATCH(
			buildRequest('1', { novedadStatus: 'DECLINADA' }),
			{ params: Promise.resolve({ id: '1' }) }
		)

		expect(response.status).toBe(403)
		expect(mockGetNovedadContext).not.toHaveBeenCalled()
	})

	it('returns 400 for an invalid business id', async () => {
		mockAuth.mockResolvedValue(mockSession as never)
		mockGetCurrentUserByEmail.mockResolvedValue(mockAnalistaUser)

		const response = await PATCH(
			buildRequest('abc', { novedadStatus: 'DECLINADA' }),
			{ params: Promise.resolve({ id: 'abc' }) }
		)

		expect(response.status).toBe(400)
	})

	it('returns 400 when the body sets novedadStatus to NUEVA', async () => {
		mockAuth.mockResolvedValue(mockSession as never)
		mockGetCurrentUserByEmail.mockResolvedValue(mockAnalistaUser)
		mockManageNovedadSchema.safeParse.mockReturnValue({
			success: false,
			error: { issues: [{ message: 'Datos inválidos' }] },
		} as never)

		const response = await PATCH(
			buildRequest('1', { novedadStatus: 'NUEVA' }),
			{ params: Promise.resolve({ id: '1' }) }
		)

		expect(response.status).toBe(400)
	})

	it('returns 404 when the business does not exist', async () => {
		mockAuth.mockResolvedValue(mockSession as never)
		mockGetCurrentUserByEmail.mockResolvedValue(mockAnalistaUser)
		mockManageNovedadSchema.safeParse.mockReturnValue({
			success: true,
			data: { novedadStatus: 'DECLINADA' },
		} as never)
		mockGetNovedadContext.mockResolvedValue(null)

		const response = await PATCH(
			buildRequest('999', { novedadStatus: 'DECLINADA' }),
			{ params: Promise.resolve({ id: '999' }) }
		)

		expect(response.status).toBe(404)
		expect(mockUpdateNovedadStatus).not.toHaveBeenCalled()
	})

	it('returns 404 when novedadStatus is null (never marked)', async () => {
		mockAuth.mockResolvedValue(mockSession as never)
		mockGetCurrentUserByEmail.mockResolvedValue(mockAnalistaUser)
		mockManageNovedadSchema.safeParse.mockReturnValue({
			success: true,
			data: { novedadStatus: 'DECLINADA' },
		} as never)
		mockGetNovedadContext.mockResolvedValue({
			business: mockPrismaBusiness,
			novedadStatus: null,
		})

		const response = await PATCH(
			buildRequest('1', { novedadStatus: 'DECLINADA' }),
			{ params: Promise.resolve({ id: '1' }) }
		)

		expect(response.status).toBe(404)
		expect(mockUpdateNovedadStatus).not.toHaveBeenCalled()
	})

	it('moves NUEVA -> SOMETIDA_DEVOLUCION for an ANALISTA_SOPORTE user and audits from/to', async () => {
		mockAuth.mockResolvedValue(mockSession as never)
		mockGetCurrentUserByEmail.mockResolvedValue(mockAnalistaUser)
		mockManageNovedadSchema.safeParse.mockReturnValue({
			success: true,
			data: { novedadStatus: 'SOMETIDA_DEVOLUCION' },
		} as never)
		mockGetNovedadContext.mockResolvedValue({
			business: { ...mockPrismaBusiness, novedadStatus: BUSINESS_NOVEDAD_STATUS.NUEVA },
			novedadStatus: BUSINESS_NOVEDAD_STATUS.NUEVA,
		})
		const mockEntity = { id: 1, novedadStatus: BUSINESS_NOVEDAD_STATUS.SOMETIDA_DEVOLUCION }
		mockUpdateNovedadStatus.mockResolvedValue(mockEntity as never)

		const response = await PATCH(
			buildRequest('1', { novedadStatus: 'SOMETIDA_DEVOLUCION' }),
			{ params: Promise.resolve({ id: '1' }) }
		)
		const responseData = await response.json()

		expect(mockUpdateNovedadStatus).toHaveBeenCalledWith(1, 'SOMETIDA_DEVOLUCION')
		expect(mockLogAuditEvent).toHaveBeenCalledTimes(1)
		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.BUSINESS_NOVEDAD_STATUS_CHANGED,
				details: expect.stringContaining('"from":"NUEVA"'),
			})
		)
		expect(response.status).toBe(200)
		expect(responseData).toEqual({ data: mockEntity })
	})

	it('reopens CANCELADA -> PENDIENTE for an ADMIN user (no terminal state)', async () => {
		mockAuth.mockResolvedValue({ user: { email: 'admin@example.com' } } as never)
		mockGetCurrentUserByEmail.mockResolvedValue(mockAdminUser)
		mockManageNovedadSchema.safeParse.mockReturnValue({
			success: true,
			data: { novedadStatus: 'PENDIENTE' },
		} as never)
		mockGetNovedadContext.mockResolvedValue({
			business: { ...mockPrismaBusiness, novedadStatus: BUSINESS_NOVEDAD_STATUS.CANCELADA },
			novedadStatus: BUSINESS_NOVEDAD_STATUS.CANCELADA,
		})
		const mockEntity = { id: 1, novedadStatus: BUSINESS_NOVEDAD_STATUS.PENDIENTE }
		mockUpdateNovedadStatus.mockResolvedValue(mockEntity as never)

		const response = await PATCH(
			buildRequest('1', { novedadStatus: 'PENDIENTE' }),
			{ params: Promise.resolve({ id: '1' }) }
		)

		expect(response.status).toBe(200)
		expect(mockUpdateNovedadStatus).toHaveBeenCalledWith(1, 'PENDIENTE')
	})
})
