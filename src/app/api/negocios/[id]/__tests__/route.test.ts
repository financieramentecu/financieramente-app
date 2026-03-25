import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from '../route'
import { recalcularComisionesPorCambioOrigen } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: { findFirst: vi.fn() },
		clientOrigin: { findFirst: vi.fn() },
	},
}))
vi.mock('@/features/pre-liquidacion/services/pre-liquidacion.service', () => ({
	recalcularComisionesPorCambioOrigen: vi.fn(),
}))
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/features/shared/services/audit-log.service', () => ({
	logAuditEvent: vi.fn(),
}))
vi.mock('@/features/negocios/mappers/business-entity.mapper', () => ({
	prismaBusinessToEntity: vi.fn().mockReturnValue({ id: 10, status: 'EMITIDO' }),
}))
vi.mock('@/features/shared/utils/request.utils', () => ({
	getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
	getUserAgent: vi.fn().mockReturnValue('test-agent'),
}))

describe('PUT /api/negocios/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should delegate origin updates to recalcularComisionesPorCambioOrigen when business is EMITIDO', async () => {
		const mockSession = { user: { email: 'admin@test.com' } }
		const mockCurUser = { idUser: 1, name: 'Admin', role: { code: 'ADMIN' } }
		const mockBusiness = { idBusiness: 10, status: 'EMITIDO' }
		
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(auth as any).mockResolvedValue(mockSession)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(getCurrentUserByEmail as any).mockResolvedValue(mockCurUser)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.business.findFirst as any)
			.mockResolvedValueOnce(mockBusiness) // primer findFirst (validar negocio)
			.mockResolvedValueOnce(mockBusiness) // segundo findFirst (después de actualizar)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.clientOrigin.findFirst as any).mockResolvedValue({ idClientOrigin: 2, status: true })

		const req = new Request('http://localhost:3000/api/negocios/10', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ idClientOrigin: 2 }),
		})

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const res = await PUT(req, { params: Promise.resolve({ id: '10' }) } as any)
		await res.json()

		expect(res.status).toBe(200)
		expect(recalcularComisionesPorCambioOrigen).toHaveBeenCalledWith(
			10,
			2,
			{ idUser: 1, name: 'Admin' }
		)
	})

	it('should return 400 if trying to change origin of a non-EMITIDO business', async () => {
		const mockSession = { user: { email: 'admin@test.com' } }
		const mockCurUser = { idUser: 1, name: 'Admin', role: { code: 'ADMIN' } }
		const mockBusiness = { idBusiness: 10, status: 'VENTA_EFECTUADA' } // NOT EMITIDO
		
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(auth as any).mockResolvedValue(mockSession)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(getCurrentUserByEmail as any).mockResolvedValue(mockCurUser)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.business.findFirst as any).mockResolvedValue(mockBusiness)

		const req = new Request('http://localhost:3000/api/negocios/10', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ idClientOrigin: 2 }),
		})

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const res = await PUT(req, { params: Promise.resolve({ id: '10' }) } as any)
		const data = await res.json() as { error: string }

		expect(res.status).toBe(400)
		expect(data.error).toContain('Solo se puede cambiar el origen en negocios en estado Emitido')
		expect(recalcularComisionesPorCambioOrigen).not.toHaveBeenCalled()
	})
})
