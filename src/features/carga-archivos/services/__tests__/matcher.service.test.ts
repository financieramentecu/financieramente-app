/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { findBusinessByContract } from '../matcher.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			findFirst: vi.fn(),
		},
	},
}))

describe('findBusinessByContract', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should return null if contract is empty', async () => {
		const result = await findBusinessByContract('')
		expect(result).toBeNull()
		expect(prisma.business.findFirst).not.toHaveBeenCalled()
	})

	it('should call prisma findFirst with correct where clause', async () => {
		const contract = 'CTO123'
		vi.mocked(prisma.business.findFirst).mockResolvedValue({ idBusiness: 1, createdAt: new Date() } as any)

		await findBusinessByContract(contract)

		expect(prisma.business.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { contract },
			})
		)
	})

	describe('isDistributionExcluded (PL-01)', () => {
		const found = (levelCode: string | null | undefined, extra = {}) =>
			({
				idBusiness: 7,
				createdAt: new Date('2026-01-01T00:00:00Z'),
				productPercentageCommission: {
					productConfiguration: { level: { code: levelCode } },
				},
				...extra,
			}) as any

		it('is true when the PPC configuration level is PARTNER_EXTERNAL', async () => {
			vi.mocked(prisma.business.findFirst).mockResolvedValue(found('PARTNER_EXTERNAL'))
			const result = await findBusinessByContract('CTO1')
			expect(result).toEqual({
				idBusiness: 7,
				createdAt: new Date('2026-01-01T00:00:00Z'),
				isDistributionExcluded: true,
			})
		})

		it.each(['LEVEL_0', 'LEVEL_3', 'GENERAL_LEVEL', 'partner_external', null, undefined])(
			'is false for level code %s',
			async (code) => {
				vi.mocked(prisma.business.findFirst).mockResolvedValue(found(code))
				const result = await findBusinessByContract('CTO1')
				expect(result?.isDistributionExcluded).toBe(false)
			}
		)

		it('is false when the PPC relation is missing', async () => {
			vi.mocked(prisma.business.findFirst).mockResolvedValue({
				idBusiness: 7,
				createdAt: new Date(),
				productPercentageCommission: null,
			} as any)
			const result = await findBusinessByContract('CTO1')
			expect(result?.isDistributionExcluded).toBe(false)
		})

		it('decides from the PPC level, not from the owner role', async () => {
			vi.mocked(prisma.business.findFirst).mockResolvedValue(
				found('PARTNER_EXTERNAL', { user: { role: { code: 'AGENTE' } } })
			)
			const result = await findBusinessByContract('CTO1')
			expect(result?.isDistributionExcluded).toBe(true)
			const call = vi.mocked(prisma.business.findFirst).mock.calls[0]?.[0] as any
			expect(JSON.stringify(call.select)).not.toContain('role')
			expect(call.select.productPercentageCommission.select.productConfiguration.select.level.select.code).toBe(true)
		})

		it('returns null when no business matches', async () => {
			vi.mocked(prisma.business.findFirst).mockResolvedValue(null)
			expect(await findBusinessByContract('NOPE')).toBeNull()
		})
	})
})
