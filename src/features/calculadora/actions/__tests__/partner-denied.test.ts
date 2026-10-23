import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/auth/nextauth', () => ({ auth: vi.fn() }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
	prisma: {
		user: { findUnique: vi.fn() },
		commissionDiscount: { findFirst: vi.fn().mockResolvedValue(null) },
		productConfiguration: { findFirst: vi.fn().mockResolvedValue(null) },
	},
}))

import { auth } from '@/lib/auth/nextauth'
import { auth as authAlias } from '@/auth'
import { prisma } from '@/lib/prisma'
import { calculateCommission } from '../calculate-commission'
import { getProductDistribution } from '../get-product-distribution'

const params = { idProduct: 1, trm: 4000 } as never

beforeEach(() => {
	vi.clearAllMocks()
})

describe('calculadora Server Actions deny callers without calculadora permission', () => {
	it.each(['PARTNER', 'DEFAULT'])(
		'calculateCommission refuses %s before touching data',
		async (role) => {
			vi.mocked(authAlias).mockResolvedValue({
				user: { id: '5', role },
			} as never)
			vi.mocked(auth).mockResolvedValue({ user: { id: '5', role } } as never)

			const result = await calculateCommission(params)

			expect(result.success).toBe(false)
			expect(result.error).toBe('Sin permisos')
			expect(prisma.user.findUnique).not.toHaveBeenCalled()
		}
	)

	it('calculateCommission keeps working past the guard for an AGENTE', async () => {
		vi.mocked(authAlias).mockResolvedValue({
			user: { id: '5', role: 'AGENTE' },
		} as never)
		vi.mocked(auth).mockResolvedValue({
			user: { id: '5', role: 'AGENTE' },
		} as never)
		vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never)

		await calculateCommission(params)

		expect(prisma.user.findUnique).toHaveBeenCalled()
	})

	it.each(['PARTNER', 'DEFAULT'])(
		'getProductDistribution refuses %s',
		async (role) => {
			vi.mocked(auth).mockResolvedValue({ user: { role } } as never)

			const result = await getProductDistribution(1, 1)

			expect(result.success).toBe(false)
			expect(result.data).toEqual([])
			expect(prisma.productConfiguration.findFirst).not.toHaveBeenCalled()
		}
	)

	it('getProductDistribution refuses an anonymous caller', async () => {
		vi.mocked(auth).mockResolvedValue(null as never)
		const result = await getProductDistribution(1, 1)
		expect(result.success).toBe(false)
		expect(prisma.productConfiguration.findFirst).not.toHaveBeenCalled()
	})

	it('getProductDistribution reaches the data layer for a CONSULTOR', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { role: 'CONSULTOR' } } as never)
		await getProductDistribution(1, 1)
		expect(prisma.productConfiguration.findFirst).toHaveBeenCalled()
	})
})
