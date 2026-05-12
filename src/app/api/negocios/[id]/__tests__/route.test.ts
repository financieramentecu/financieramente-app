import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from '../route'
import { recalcularComisionesPorCambioOrigen } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import { validateProductConfigurationExists } from '@/features/negocios/services/product-configuration.service'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

const { mockPrismaUpdate, mockPrismaFindFirst } = vi.hoisted(() => ({
	mockPrismaUpdate: vi.fn().mockResolvedValue({ idBusiness: 10, status: 'EMITIDO' }),
	mockPrismaFindFirst: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: { 
			findFirst: (...args: unknown[]) => mockPrismaFindFirst(...args),
			update: (...args: unknown[]) => mockPrismaUpdate(...args)
		},
		clientOrigin: { findFirst: vi.fn() },
		user: { findUnique: vi.fn() },
		buyPeriodicity: { findUnique: vi.fn() },
		product: { findUnique: vi.fn() },
		payment: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
		$transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => unknown) => {
			const tx = {
				business: {
					update: mockPrismaUpdate,
					findMany: vi.fn().mockResolvedValue([]),
					deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
					createMany: vi.fn().mockResolvedValue({ count: 0 }),
					findFirst: mockPrismaFindFirst,
				},
				payment: {
					findMany: vi.fn().mockResolvedValue([]),
					deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
					createMany: vi.fn().mockResolvedValue({ count: 0 }),
				},
				user: {
					findUnique: vi.fn().mockResolvedValue({ idLevel: 1 }),
				},
				productConfiguration: {
					findFirst: vi.fn().mockResolvedValue({ idProductConfiguration: 1 }),
				},
			}
			return await cb(tx)
		}),
	},
}))
vi.mock('@/features/pre-liquidacion/services/pre-liquidacion.service', () => ({
	recalcularComisionesPorCambioOrigen: vi.fn(),
	sincronizarYCalcularRegistroRezagado: vi.fn().mockResolvedValue({
		success: true,
		mensaje: '',
	}),
}))
vi.mock('@/features/negocios/services/product-configuration.service', () => ({
	validateProductConfigurationExists: vi.fn(),
}))
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/features/negocios/actions/find-product-percentage-commission', () => ({
	findProductPercentageCommission: vi.fn().mockResolvedValue({
		data: { idProductPercentageCommission: 1 },
	}),
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	AuditAction: { BUSINESS_UPDATED: 'BUSINESS_UPDATED' },
	getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
	getUserAgent: vi.fn().mockReturnValue('test-agent'),
}))
vi.mock('@/features/negocios/actions/find-product-percentage-commission', () => ({
	findProductPercentageCommission: vi.fn().mockResolvedValue({ data: { idProductPercentageCommission: 1 } }),
}))
vi.mock('@/features/negocios/mappers/business-entity.mapper', () => ({
	prismaBusinessToEntity: vi.fn().mockReturnValue({
		id: 10,
		status: 'EMITIDO',
		dateIssued: null,
	}),
}))

const mockProductConfiguration = {
	idProductConfiguration: 1,
	idProduct: 5,
	idClientOrigin: 1,
	idCategory: 3,
}


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
		mockPrismaFindFirst.mockImplementation(({ where }: any) => {
			if (typeof where.idBusiness === 'number' || typeof where.idBusiness === 'string') return Promise.resolve(mockBusiness)
			return Promise.resolve(null)
		})
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.clientOrigin.findFirst as any).mockResolvedValue({ idClientOrigin: 2, status: true })
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(validateProductConfigurationExists as any).mockResolvedValue({ valid: true })

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
		mockPrismaFindFirst.mockImplementation(({ where }: any) => {
			if (typeof where.idBusiness === 'number' || typeof where.idBusiness === 'string') return Promise.resolve(mockBusiness)
			return Promise.resolve(null)
		})

		const req = new Request('http://localhost:3000/api/negocios/10', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ idClientOrigin: 2 }),
		})

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const res = await PUT(req, { params: Promise.resolve({ id: '10' }) } as any)
		const data = await res.json() as { error: string }

		expect(res.status).toBe(400)
		expect(data.error).toContain('Solo se puede cambiar el origen en negocios con estado EMITIDO.')
		expect(recalcularComisionesPorCambioOrigen).not.toHaveBeenCalled()
	})

	it('should return 400 with a clear message when validateProductConfigurationExists returns false', async () => {
		const mockSession = { user: { email: 'admin@test.com' } }
		const mockCurUser = { idUser: 1, name: 'Admin', role: { code: 'ADMIN' } }
		const mockBusiness = { idBusiness: 10, status: 'EMITIDO' }

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(auth as any).mockResolvedValue(mockSession)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(getCurrentUserByEmail as any).mockResolvedValue(mockCurUser)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		mockPrismaFindFirst.mockImplementation(({ where }: any) => {
			if (typeof where.idBusiness === 'number' || typeof where.idBusiness === 'string') return Promise.resolve(mockBusiness)
			return Promise.resolve(null)
		})
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.clientOrigin.findFirst as any).mockResolvedValue({ idClientOrigin: 2, status: true })
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(validateProductConfigurationExists as any).mockResolvedValue({
			valid: false,
			reason: 'No existe configuración de distribución para el origen, producto y categoría del negocio. Configurá la distribución antes de cambiar el origen.',
		})

		const req = new Request('http://localhost:3000/api/negocios/10', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ idClientOrigin: 2 }),
		})

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const res = await PUT(req, { params: Promise.resolve({ id: '10' }) } as any)
		const data = await res.json() as { error: string }

		expect(res.status).toBe(400)
		expect(data.error).toContain('No existe configuración de distribución')
		expect(recalcularComisionesPorCambioOrigen).not.toHaveBeenCalled()
	})

	it('should call recalcularComisionesPorCambioOrigen and return 200 when validateProductConfigurationExists returns true', async () => {
		const mockSession = { user: { email: 'admin@test.com' } }
		const mockCurUser = { idUser: 1, name: 'Admin', role: { code: 'ADMIN' } }
		const mockBusiness = { idBusiness: 10, status: 'EMITIDO' }

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(auth as any).mockResolvedValue(mockSession)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(getCurrentUserByEmail as any).mockResolvedValue(mockCurUser)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		mockPrismaFindFirst.mockImplementation(({ where }: any) => {
			if (typeof where.idBusiness === 'number' || typeof where.idBusiness === 'string') return Promise.resolve(mockBusiness)
			return Promise.resolve(null)
		})
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.clientOrigin.findFirst as any).mockResolvedValue({ idClientOrigin: 2, status: true })
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(validateProductConfigurationExists as any).mockResolvedValue({ valid: true })

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

	it('sets dateIssued when assigning contract from VENTA_EFECTUADA to EMITIDO', async () => {
		const mockSession = { user: { email: 'admin@test.com' } }
		const mockCurUser = {
			idUser: 1,
			name: 'Admin',
			role: { code: 'ADMIN' },
			idRole: 1,
		}
		const mockBusinessVe = {
			idBusiness: 10,
			status: 'VENTA_EFECTUADA',
			dateIssued: null,
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(auth as any).mockResolvedValue(mockSession)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(getCurrentUserByEmail as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockCurUser)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		mockPrismaFindFirst
			.mockResolvedValueOnce(mockBusinessVe)
			.mockResolvedValueOnce(null)
		mockPrismaUpdate.mockResolvedValue({ idBusiness: 10, status: 'EMITIDO' })

		const req = new Request('http://localhost:3000/api/negocios/10', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ contract: 'PN7777777' }),
		})

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const res = await PUT(req, { params: Promise.resolve({ id: '10' }) } as any)

		expect(res.status).toBe(200)
		expect(mockPrismaUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idBusiness: 10 },
				data: expect.objectContaining({
					status: 'EMITIDO',
					contract: 'PN7777777',
					dateIssued: expect.any(Date),
				}),
			})
		)
	})

	it('does not set dateIssued when editing contract while already EMITIDO', async () => {
		const mockSession = { user: { email: 'admin@test.com' } }
		const mockCurUser = {
			idUser: 1,
			name: 'Admin',
			role: { code: 'ADMIN' },
			idRole: 1,
		}
		const priorIssued = new Date('2024-01-02T12:00:00.000Z')
		const mockBusinessEmitido = {
			idBusiness: 10,
			status: 'EMITIDO',
			dateIssued: priorIssued,
			contract: 'PN-OLD',
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(auth as any).mockResolvedValue(mockSession)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(getCurrentUserByEmail as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockCurUser)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		mockPrismaFindFirst
			.mockResolvedValueOnce(mockBusinessEmitido)
			.mockResolvedValueOnce(null)
		mockPrismaUpdate.mockResolvedValue({ idBusiness: 10, status: 'EMITIDO' })

		const req = new Request('http://localhost:3000/api/negocios/10', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ contract: 'PN-NEW999' }),
		})

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const res = await PUT(req, { params: Promise.resolve({ id: '10' }) } as any)

		expect(res.status).toBe(200)
		const updateArg = mockPrismaUpdate.mock.calls[0][0]
		expect(updateArg.data).not.toHaveProperty('dateIssued')
		expect(updateArg.data).toEqual(
			expect.objectContaining({
				contract: 'PN-NEW999',
				status: 'EMITIDO',
			})
		)
	})
})
