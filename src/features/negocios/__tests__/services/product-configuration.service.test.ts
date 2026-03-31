import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { validateProductConfigurationExists } from '../../services/product-configuration.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		productConfiguration: {
			findUnique: vi.fn(),
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

		const result = await validateProductConfigurationExists(3, 10, 2)

		expect(result).toEqual({ valid: true })
	})

	it('returns { valid: false } when no ProductConfiguration exists (findUnique returns null)', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findUnique as any).mockResolvedValue(null)

		const result = await validateProductConfigurationExists(3, 10, 2)

		expect(result.valid).toBe(false)
		expect((result as { valid: false; reason: string }).reason).toContain('No existe configuración')
	})

	it('returns { valid: false } when ProductConfiguration exists but has no active PPC', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findUnique as any).mockResolvedValue(mockPcNoPpc)

		const result = await validateProductConfigurationExists(3, 10, 2)

		expect(result.valid).toBe(false)
		expect((result as { valid: false; reason: string }).reason).toContain('comisiones activas')
	})

	it('returns { valid: false } when active PPC exists but has no distribution categories', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findUnique as any).mockResolvedValue(
			mockPcWithActivePpcNoCategories
		)

		const result = await validateProductConfigurationExists(3, 10, 2)

		expect(result.valid).toBe(false)
		expect((result as { valid: false; reason: string }).reason).toContain('reglas de distribución')
	})

	it('calls prisma.productConfiguration.findUnique with the correct composite key', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(prisma.productConfiguration.findUnique as any).mockResolvedValue(null)

		await validateProductConfigurationExists(5, 7, 9)

		expect(prisma.productConfiguration.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					idProduct_idClientOrigin_idCategory: {
						idProduct: 7,
						idClientOrigin: 9,
						idCategory: 5,
					},
				},
			})
		)
	})
})
