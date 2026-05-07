import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
	getPpcForNewBusinesses,
	validateProductConfigurationExists,
} from '../../services/product-configuration.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		productConfiguration: {
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
	idCategory: 3,
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
	idCategory: 3,
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
	idCategory: 3,
	productPercentageCommissions: [],
}

describe('validateProductConfigurationExists', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns { valid: true } when ProductConfiguration exists with active PPC and categories', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findUnique as any).mockResolvedValue(
			mockPcWithActivePpcAndCategories
		)

		const result = await validateProductConfigurationExists(3, 10)

		expect(result).toEqual({ valid: true })
	})

	it('returns { valid: false } when no ProductConfiguration exists (findUnique returns null)', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findUnique as any).mockResolvedValue(null)

		const result = await validateProductConfigurationExists(3, 10)

		expect(result.valid).toBe(false)
		expect((result as { valid: false; reason: string }).reason).toContain('No existe configuración')
	})

	it('returns { valid: false } when ProductConfiguration exists but has no active PPC', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findUnique as any).mockResolvedValue(mockPcNoPpc)

		const result = await validateProductConfigurationExists(3, 10)

		expect(result.valid).toBe(false)
		expect((result as { valid: false; reason: string }).reason).toContain('comisiones activas')
	})

	it('returns { valid: false } when active PPC exists but has no distribution categories', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findUnique as any).mockResolvedValue(
			mockPcWithActivePpcNoCategories
		)

		const result = await validateProductConfigurationExists(3, 10)

		expect(result.valid).toBe(false)
		expect((result as { valid: false; reason: string }).reason).toContain('reglas de distribución')
	})

	it('calls prisma.productConfiguration.findUnique with composite key (idProduct, idCategory) only — no idClientOrigin', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findUnique as any).mockResolvedValue(null)

		await validateProductConfigurationExists(5, 7)

		expect(prisma.productConfiguration.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					idProduct_idCategory: {
						idProduct: 7,
						idCategory: 5,
					},
				},
			})
		)
	})
})

describe('getPpcForNewBusinesses', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	// --- NEW BEHAVIOR (Phase 3): lookup by (idProduct, idCategory) only, no fallback ---

	it('debería buscar PPC solo por idProduct e idCategory (sin idClientOrigin)', async () => {
		const specificPpc = { idProductPercentageCommission: 10, active: true }
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findUnique as any).mockResolvedValue({
			productPercentageCommissionNewBusinesses: specificPpc,
		})

		const result = await getPpcForNewBusinesses({
			idCategory: 2,
			idProduct: 1,
		})

		expect(result).toEqual({ configExists: true, ppc: specificPpc })
		// Must NOT call fallback query
		expect(prisma.productPercentageCommission.findFirst).not.toHaveBeenCalled()
	})

	it('debería lanzar error cuando no existe configuración para el par producto-categoría', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findUnique as any).mockResolvedValue(null)

		await expect(
			getPpcForNewBusinesses({ idProduct: 1, idCategory: 99 })
		).rejects.toThrow(
			'No existe configuración de distribución para el producto y categoría seleccionados. Configurá la distribución antes de continuar.'
		)

		// Must NOT fall back to any other PPC
		expect(prisma.productPercentageCommission.findFirst).not.toHaveBeenCalled()
	})

	it('returns specific PPC and skips fallback lookup when new-business PPC exists', async () => {
		const specificPpc = { idProductPercentageCommission: 10, active: true }
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findUnique as any).mockResolvedValue({
			productPercentageCommissionNewBusinesses: specificPpc,
		})

		const result = await getPpcForNewBusinesses({
			idCategory: 3,
			idProduct: 1,
		})

		expect(result).toEqual({ configExists: true, ppc: specificPpc })
		expect(prisma.productPercentageCommission.findFirst).not.toHaveBeenCalled()
	})

	it('returns ppc as null when configuration exists but has no new-business PPC assigned', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findUnique as any).mockResolvedValue({
			productPercentageCommissionNewBusinesses: null,
		})

		const result = await getPpcForNewBusinesses({
			idCategory: 3,
			idProduct: 1,
		})

		expect(result).toEqual({ configExists: true, ppc: null })
		// No fallback lookup
		expect(prisma.productPercentageCommission.findFirst).not.toHaveBeenCalled()
	})
})
