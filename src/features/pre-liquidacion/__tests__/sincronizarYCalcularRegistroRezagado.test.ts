/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { sincronizarYCalcularRegistroRezagado } from '../services/pre-liquidacion.service'
import { Decimal } from '@prisma/client/runtime/library'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
	prisma: {
		$transaction: vi.fn(),
		settlementCommission: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		comissionDistribution: {
			create: vi.fn(),
		},
	},
}))

// Mock audit logger helper
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn().mockResolvedValue({ id: 888 }),
	AuditAction: {
		UPDATE: 'UPDATE', // o lo que corresponda en el enum
	},
}))

describe('sincronizarYCalcularRegistroRezagado', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('debería sincronizar exitosamente un registro rezagado', async () => {
		const mockIdSettlementCommission = 1
		const mockIdBusiness = 100

		const mockSettlement = {
			idSettlementCommission: mockIdSettlementCommission,
			status: 'LAG',
			baseCommission: new Decimal(1000),
			commissionValue: new Decimal(1000),
			discountPercentage: new Decimal(0),
			clawbackPercentage: new Decimal(0),
			originCommission: 'VENTA',
			contract: 'CONT-123',
			descripcion: 'Venta de prueba',
		}

		const mockBusiness = {
			idBusiness: mockIdBusiness,
			idProductPercentageCommission: 2,
			user: { idUser: 5, email: 'asesor@test.com' },
		}

		const mockConfigCategorias = [
			{
				id: 10,
				porcentajeDistribucion: new Decimal(0.1), // 10%
				porcentajePortfolio: null,
				level: {
					idLevel: 1,
					code: 'ASESOR',
					beneficiaryMode: 'OVERRIDE',
					idFixedBeneficiaryUser: null,
				},
			},
		]

		// Mock tx
		const mockTx = {
			settlementCommission: {
				findUnique: vi.fn().mockResolvedValue(mockSettlement),
				update: vi.fn().mockResolvedValue({ ...mockSettlement, status: 'SYNCHRONIZED' }),
			},
			business: {
				findFirst: vi.fn().mockResolvedValue(mockBusiness),
			},
			productPercentageCommissionCategory: {
				findMany: vi.fn().mockResolvedValue(mockConfigCategorias),
			},
			user: {
				findUnique: vi.fn().mockResolvedValue({
					idUser: 5,
					idLevel: 1,
					idUserLeader: null,
				}),
			},
			comissionDistribution: {
				create: vi.fn().mockResolvedValue({ id: 999 }),
			},
		}

		// Mock prisma.$transaction to execute the callback with mockTx
		vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
			return callback(mockTx)
		})

		await sincronizarYCalcularRegistroRezagado(
			mockIdSettlementCommission,
			'CONT-123'
		)

		// Verificaciones
		expect(mockTx.settlementCommission.findUnique).toHaveBeenCalledWith({
			where: { idSettlementCommission: mockIdSettlementCommission },
		})

		expect(mockTx.settlementCommission.update).toHaveBeenCalledWith({
			where: { idSettlementCommission: mockIdSettlementCommission },
			data: {
				idBusiness: mockIdBusiness,
				status: 'SYNCHRONIZED',
			},
		})

		expect(mockTx.comissionDistribution.create).toHaveBeenCalled()
	})

	it('debería lanzar error si el registro no está en estado LAG', async () => {
		const mockIdSettlementCommission = 1

		const mockSettlement = {
			idSettlementCommission: mockIdSettlementCommission,
			status: 'PRE-SETTLED', // Ya procesado
			baseCommission: new Decimal(1000),
		}

		const mockTx = {
			settlementCommission: {
				findUnique: vi.fn().mockResolvedValue(mockSettlement),
			},
			business: {
				findFirst: vi.fn().mockResolvedValue({ idBusiness: 100 }),
			},
		}

		vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
			return callback(mockTx)
		})

		const result = await sincronizarYCalcularRegistroRezagado(
			mockIdSettlementCommission,
			'CONT-123'
		)

		expect(result).toEqual({
			success: false,
			mensaje: expect.stringContaining('El registro debe estar en estado LAG'),
		})
	})
})
