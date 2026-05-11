import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
	getPpcForNewBusinesses,
	validateProductConfigurationExists,
} from '../../services/product-configuration.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		productConfiguration: {
			findFirst: vi.fn(),
			findUnique: vi.fn(),
		},
		productPercentageCommission: {
			findFirst: vi.fn(),
		},
	},
}))

const mockPcWithActivePpcAndCategories = {
	idProductConfiguration: 1,
	idProduct: 10,
	idClientOrigin: 2,
	idLevel: 3,
	productPercentageCommissions: [
		{
			idProductPercentageCommission: 1,
			active: true,
			productPercentageCommissionCategories: [{ id: 1, active: true }],
		},
	],
}

const mockPcWithActivePpcNoCategories = {
	idProductConfiguration: 1,
	idProduct: 10,
	idClientOrigin: 2,
	idLevel: 3,
	productPercentageCommissions: [
		{
			idProductPercentageCommission: 1,
			active: true,
			productPercentageCommissionCategories: [],
		},
	],
}

const mockPcNoPpc = {
	idProductConfiguration: 1,
	idProduct: 10,
	idClientOrigin: 2,
	idLevel: 3,
	productPercentageCommissions: [],
}

describe('validateProductConfigurationExists', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns { valid: true } when ProductConfiguration exists with active PPC and categories', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findFirst as any).mockResolvedValue(
			mockPcWithActivePpcAndCategories
		)

		const result = await validateProductConfigurationExists(3, 10)

		expect(result).toEqual({ valid: true })
	})

	it('returns { valid: false } when no ProductConfiguration exists (findFirst returns null)', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findFirst as any).mockResolvedValue(null)

		const result = await validateProductConfigurationExists(3, 10)

		expect(result.valid).toBe(false)
		expect((result as { valid: false; reason: string }).reason).toContain('No existe configuración')
	})

	it('returns { valid: false } when ProductConfiguration exists but has no active PPC', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findFirst as any).mockResolvedValue(mockPcNoPpc)

		const result = await validateProductConfigurationExists(3, 10)

		expect(result.valid).toBe(false)
		expect((result as { valid: false; reason: string }).reason).toContain('comisiones activas')
	})

	it('returns { valid: false } when active PPC exists but has no distribution categories', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findFirst as any).mockResolvedValue(
			mockPcWithActivePpcNoCategories
		)

		const result = await validateProductConfigurationExists(3, 10)

		expect(result.valid).toBe(false)
		expect((result as { valid: false; reason: string }).reason).toContain('reglas de distribución')
	})

	it('calls prisma.productConfiguration.findFirst with idLevel and active level/product filters', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findFirst as any).mockResolvedValue(null)

		await validateProductConfigurationExists(5, 7)

		expect(prisma.productConfiguration.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					idProduct: 7,
					idLevel: 5,
					level: { status: true },
					product: { status: true },
				}),
			})
		)
	})

	it('returns { valid: false } when level is inactive (findFirst returns null due to level.status filter)', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findFirst as any).mockResolvedValue(null)

		const result = await validateProductConfigurationExists(3, 10)

		expect(result.valid).toBe(false)
		expect((result as { valid: false; reason: string }).reason).toContain('No existe configuración')
	})

	it('returns { valid: false } when product is inactive (findFirst returns null due to product.status filter)', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findFirst as any).mockResolvedValue(null)

		const result = await validateProductConfigurationExists(7, 99)

		expect(result.valid).toBe(false)
		expect((result as { valid: false; reason: string }).reason).toContain('No existe configuración')
	})
})

describe('getPpcForNewBusinesses', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	// --- lookup by (idProduct, idLevel) with active level + product filters ---

	it('debería buscar PPC solo por idProduct e idLevel (sin idClientOrigin)', async () => {
		const specificPpc = { idProductPercentageCommission: 10, active: true }
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findFirst as any).mockResolvedValue({
			productPercentageCommissionNewBusinesses: specificPpc,
		})

		const result = await getPpcForNewBusinesses({
			idLevel: 2,
			idProduct: 1,
		})

		expect(result).toEqual({ configExists: true, ppc: specificPpc })
		// Must NOT call fallback query
		expect(prisma.productPercentageCommission.findFirst).not.toHaveBeenCalled()
	})

	it('debería lanzar error cuando no existe configuración para el par producto-nivel', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findFirst as any).mockResolvedValue(null)

		await expect(
			getPpcForNewBusinesses({ idProduct: 1, idLevel: 99 })
		).rejects.toThrow(
			'No existe configuración de distribución para el producto y nivel seleccionados'
		)

		// Must NOT fall back to any other PPC
		expect(prisma.productPercentageCommission.findFirst).not.toHaveBeenCalled()
	})

	it('returns specific PPC and skips fallback lookup when new-business PPC exists', async () => {
		const specificPpc = { idProductPercentageCommission: 10, active: true }
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findFirst as any).mockResolvedValue({
			productPercentageCommissionNewBusinesses: specificPpc,
		})

		const result = await getPpcForNewBusinesses({
			idLevel: 3,
			idProduct: 1,
		})

		expect(result).toEqual({ configExists: true, ppc: specificPpc })
		expect(prisma.productPercentageCommission.findFirst).not.toHaveBeenCalled()
	})

	it('returns ppc as null when configuration exists but has no new-business PPC assigned', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findFirst as any).mockResolvedValue({
			productPercentageCommissionNewBusinesses: null,
		})

		const result = await getPpcForNewBusinesses({
			idLevel: 3,
			idProduct: 1,
		})

		expect(result).toEqual({ configExists: true, ppc: null })
		// No fallback lookup
		expect(prisma.productPercentageCommission.findFirst).not.toHaveBeenCalled()
	})

	it('calls findFirst with level.status and product.status active filters', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findFirst as any).mockResolvedValue({
			productPercentageCommissionNewBusinesses: null,
		})

		await getPpcForNewBusinesses({ idProduct: 5, idLevel: 2 })

		expect(prisma.productConfiguration.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					idProduct: 5,
					idLevel: 2,
					level: { status: true },
					product: { status: true },
				}),
			})
		)
	})
})
