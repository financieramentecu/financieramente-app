import { describe, it, expect, vi, beforeEach } from 'vitest'
import { obtenerComisionesPreliquidadas } from '../services/pre-liquidacion.service'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

vi.mock('@/features/email/lib/preliquidacion-resumen-notification', () => ({
	sendResumenPreliquidacionEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/prisma', () => ({
	prisma: {
		fileImport: { findUnique: vi.fn() },
		settlementCommission: { findMany: vi.fn() },
	},
}))

const mockFileImport = vi.mocked(prisma.fileImport.findUnique)
const mockFindMany = vi.mocked(prisma.settlementCommission.findMany)

function makeFileImport(overrides = {}) {
	return {
		idFileImport: 7,
		nameFile: 'POLIZA-ENERO-2026',
		fileType: 'POLIZA',
		loadDate: new Date('2026-01-15T10:00:00Z'),
		totalRecord: 20,
		sincronizadoRecord: 10,
		rezagadoRecord: 2,
		user: { name: 'Jane', lastName: 'Doe' },
		...overrides,
	}
}

function makeSettlement(idSettlementCommission: number, overrides = {}) {
	return {
		idSettlementCommission,
		idBusiness: 1,
		contract: `CT-00${idSettlementCommission}`,
		commissionValue: new Decimal(100),
		baseCommission: new Decimal(100),
		discountPercentage: new Decimal(0.12),
		clawbackPercentage: new Decimal(0),
		isClawback: false,
		isLag: false,
		syncDate: new Date('2026-01-10T00:00:00Z'),
		lagDate: null,
		startDate: new Date('2026-01-01'),
		endDate: new Date('2026-01-31'),
		descripcion: 'BASE',
		business: {
			contract: `CT-00${idSettlementCommission}`,
			user: { name: 'Agent', lastName: 'One' },
		},
		...overrides,
	}
}

describe('obtenerComisionesPreliquidadas', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns null when fileImport does not exist', async () => {
		mockFileImport.mockResolvedValue(null)

		const result = await obtenerComisionesPreliquidadas(999)

		expect(result).toBeNull()
		expect(mockFindMany).not.toHaveBeenCalled()
	})

	it('calls prisma.settlementCommission.findMany with status PRE-SETTLED and the correct fileId', async () => {
		mockFileImport.mockResolvedValue(makeFileImport() as never)
		mockFindMany.mockResolvedValue([])

		await obtenerComisionesPreliquidadas(7)

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					idFileImport: 7,
					status: { in: ['SYNCHRONIZED', 'PRE-SETTLED', 'SETTLED', 'LAG'] },
				}),
			})
		)
	})

	it('returns an empty registros array when no PRE-SETTLED records exist for the file', async () => {
		mockFileImport.mockResolvedValue(makeFileImport() as never)
		mockFindMany.mockResolvedValue([])

		const result = await obtenerComisionesPreliquidadas(7)

		expect(result).not.toBeNull()
		expect(result!.registros).toEqual([])
		expect(result!.archivo.idFileImport).toBe(7)
	})

	it('returns exactly the records returned by Prisma when PRE-SETTLED records exist', async () => {
		mockFileImport.mockResolvedValue(makeFileImport() as never)
		mockFindMany.mockResolvedValue([
			makeSettlement(100),
			makeSettlement(101),
			makeSettlement(102),
		] as never)

		const result = await obtenerComisionesPreliquidadas(7)

		expect(result).not.toBeNull()
		expect(result!.registros).toHaveLength(3)
		expect(result!.registros[0].idSettlementCommission).toBe(100)
		expect(result!.registros[1].idSettlementCommission).toBe(101)
		expect(result!.registros[2].idSettlementCommission).toBe(102)
	})

	it('maps the archivo fields correctly from fileImport', async () => {
		mockFileImport.mockResolvedValue(makeFileImport() as never)
		mockFindMany.mockResolvedValue([])

		const result = await obtenerComisionesPreliquidadas(7)

		expect(result!.archivo).toMatchObject({
			idFileImport: 7,
			nombreArchivo: 'POLIZA-ENERO-2026',
			fileType: 'POLIZA',
			usuarioCargo: 'Jane Doe',
			fechaCarga: '2026-01-15',
			totalRegistros: 20,
		})
	})

	it('maps individual registro fields correctly', async () => {
		mockFileImport.mockResolvedValue(makeFileImport() as never)
		mockFindMany.mockResolvedValue([makeSettlement(200)] as never)

		const result = await obtenerComisionesPreliquidadas(7)

		const reg = result!.registros[0]
		expect(reg.idSettlementCommission).toBe(200)
		expect(reg.idBusiness).toBe(1)
		expect(reg.nombreAsesor).toBe('Agent One')
		expect(reg.tipo).toBe('BASE')
		expect(reg.esClawback).toBe(false)
		expect(reg.esRezagado).toBe(false)
	})
})
