import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
	prisma: {
		user: { findUnique: vi.fn() },
		level: { findMany: vi.fn() },
		commissionDiscount: { findFirst: vi.fn().mockResolvedValue(null) },
		productConfiguration: { findFirst: vi.fn().mockResolvedValue(null) },
	},
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { calculateCommission } from '../calculate-commission'

const LEVELS = [
	{ idLevel: 1, code: 'LEVEL_0', name: 'N0', idNextLevel: 2, status: true },
	{ idLevel: 2, code: 'LEVEL_1', name: 'N1', idNextLevel: null, status: true },
	{
		idLevel: 9,
		code: 'PARTNER_EXTERNAL',
		name: 'Partner',
		idNextLevel: null,
		status: true,
	},
]

const baseParams = {
	idCompany: 1,
	idProduct: 1,
	idClientOrigin: 1,
	idLevelView: 2,
	idLevelOrigin: 1,
	montoVenta: 1000,
	trm: 4000,
	descuento: 0,
	clawback: 0,
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(auth).mockResolvedValue({
		user: { id: '5', role: 'ADMIN' },
	} as never)
	vi.mocked(prisma.user.findUnique).mockResolvedValue({
		idLevel: 1,
		level: { code: 'LEVEL_0' },
		role: { code: 'ADMIN' },
	} as never)
	vi.mocked(prisma.level.findMany).mockResolvedValue(LEVELS as never)
})

describe('calculateCommission rejects PARTNER_EXTERNAL levels (PA-03, LVL-01)', () => {
	it.each([
		['origin', { idLevelOrigin: 9 }],
		['view', { idLevelView: 9 }],
	])(
		'refuses PARTNER_EXTERNAL as the %s level before reading configuration',
		async (_label, override) => {
			const result = await calculateCommission({ ...baseParams, ...override })

			expect(result.success).toBe(false)
			expect(result.error).toBe(
				'El nivel seleccionado no participa en la distribución de comisiones'
			)
			expect(prisma.productConfiguration.findFirst).not.toHaveBeenCalled()
		}
	)

	it('does not apply that rejection to regular levels', async () => {
		const result = await calculateCommission(baseParams)

		expect(result.error).not.toBe(
			'El nivel seleccionado no participa en la distribución de comisiones'
		)
		expect(prisma.productConfiguration.findFirst).toHaveBeenCalled()
	})
})
