import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { PUT } from '../route'

const createMany = vi.fn()
const deleteMany = vi.fn()
const findManyCategories = vi.fn()
const updatePpc = vi.fn()
const findUniquePpc = vi.fn()
const findUniqueOrThrow = vi.fn()

vi.mock('@/lib/prisma', () => ({
	prisma: {
		$transaction: (fn: (tx: unknown) => Promise<unknown>) =>
			fn({
				productPercentageCommission: {
					findUnique: findUniquePpc,
					update: updatePpc,
					findUniqueOrThrow,
				},
				productPercentageCommissionCategory: {
					findMany: findManyCategories,
					deleteMany,
					createMany,
				},
			}),
	},
}))

vi.mock('@/auth', () => ({
	auth: vi.fn().mockResolvedValue({
		user: { id: '1', email: 'admin@test.com' },
	}),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	AuditAction: {
		DISTRIBUTION_COMMISSION_CREATED: 'DISTRIBUTION_COMMISSION_CREATED',
		DISTRIBUTION_COMMISSION_UPDATED: 'DISTRIBUTION_COMMISSION_UPDATED',
		DISTRIBUTION_COMMISSION_ACTIVATED: 'DISTRIBUTION_COMMISSION_ACTIVATED',
		DISTRIBUTION_COMMISSION_DEACTIVATED: 'DISTRIBUTION_COMMISSION_DEACTIVATED',
	},
	getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
	getUserAgent: vi.fn().mockReturnValue('test-agent'),
}))

describe('PUT /api/product-configurations/[id]/distribution-commission/[ruleId]', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		findUniquePpc.mockResolvedValue({
			idProductConfiguration: 1,
			hasPortfolio: true,
		})
		findManyCategories.mockResolvedValue([
			{ idCategory: 1, porcentajePortfolio: 0.3 },
		])
		findUniqueOrThrow.mockResolvedValue({
			idProductPercentageCommission: 1,
			idProductConfiguration: 1,
			description: 'd',
			active: true,
			hasPortfolio: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			productPercentageCommissionCategories: [
				{
					id: 1,
					idCategory: 1,
					idProductPercentageCommission: 1,
					porcentajeDistribucion: 0.5,
					porcentajePortfolio: 0.3,
					active: true,
					createdAt: new Date(),
					updatedAt: new Date(),
					category: { idCategory: 1, name: 'A' },
				},
			],
		})
	})

	it('passes prior porcentaje_portfolio when hasPortfolio becomes false (RF-04)', async () => {
		const req = {
			json: async () => ({
				description: 'd',
				hasPortfolio: false,
				categories: [{ idCategory: 1, percentage: 50 }],
			}),
		} as unknown as NextRequest

		const res = await PUT(req, {
			params: Promise.resolve({ id: '1', ruleId: '1' }),
		})
		expect(res.status).toBe(200)
		expect(createMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					idCategory: 1,
					porcentajeDistribucion: 0.5,
					porcentajePortfolio: 0.3,
				}),
			],
		})
	})

	it('persists portfolio fractions when hasPortfolio is true', async () => {
		findUniquePpc.mockResolvedValueOnce({
			idProductConfiguration: 1,
			hasPortfolio: true,
		})
		const req = {
			json: async () => ({
				description: 'd',
				hasPortfolio: true,
				categories: [
					{ idCategory: 1, percentage: 50, portfolioPercentage: 40 },
				],
			}),
		} as unknown as NextRequest

		const res = await PUT(req, {
			params: Promise.resolve({ id: '1', ruleId: '1' }),
		})
		expect(res.status).toBe(200)
		expect(createMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					porcentajeDistribucion: 0.5,
					porcentajePortfolio: 0.4,
				}),
			],
		})
	})
})
