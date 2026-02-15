/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		productPercentageCommission: {
			findUnique: vi.fn(),
		},
		productConfiguration: {
			update: vi.fn(),
		},
	},
}))

vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

describe('POST /api/product-configurations/[id]/commission-rules/[ruleId]/assign-new-businesses', () => {
	const mockRuleFind = vi.mocked(
		prisma.productPercentageCommission.findUnique
	)
	const mockConfigUpdate = vi.mocked(prisma.productConfiguration.update)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should assign the default rule for new businesses', async () => {
		const configId = 10
		const ruleId = 5

		mockRuleFind.mockResolvedValue({
			idProductConfiguration: configId,
			active: true,
		} as any)

		mockConfigUpdate.mockResolvedValue({
			id: configId,
			idProductPercentageCommissionNewBusinesses: ruleId,
		} as any)

		const request = new Request(
			`http://localhost:3000/api/product-configurations/${configId}/commission-rules/${ruleId}/assign-new-businesses`,
			{ method: 'POST' }
		)

		const response = await POST(request, {
			params: Promise.resolve({
				id: String(configId),
				ruleId: String(ruleId),
			}),
		})
		const json = await response.json()

		expect(response.status).toBe(200)
		expect(json.data).toEqual({
			idProductConfiguration: configId,
			idProductPercentageCommissionNewBusinesses: ruleId,
		})
		expect(mockConfigUpdate).toHaveBeenCalledWith({
			where: { id: configId },
			data: { idProductPercentageCommissionNewBusinesses: ruleId },
			select: {
				id: true,
				idProductPercentageCommissionNewBusinesses: true,
			},
		})
	})

	it('should return 400 for invalid ids', async () => {
		const request = new Request(
			'http://localhost:3000/api/product-configurations/abc/commission-rules/def/assign-new-businesses',
			{ method: 'POST' }
		)

		const response = await POST(request, {
			params: Promise.resolve({ id: 'abc', ruleId: 'def' }),
		})
		const json = await response.json()

		expect(response.status).toBe(400)
		expect(json.error).toBe('IDs inválidos')
	})

	it('should return 404 when rule does not belong to configuration', async () => {
		const configId = 10
		const ruleId = 5

		mockRuleFind.mockResolvedValue({
			idProductConfiguration: 999,
			active: true,
		} as any)

		const request = new Request(
			`http://localhost:3000/api/product-configurations/${configId}/commission-rules/${ruleId}/assign-new-businesses`,
			{ method: 'POST' }
		)

		const response = await POST(request, {
			params: Promise.resolve({
				id: String(configId),
				ruleId: String(ruleId),
			}),
		})
		const json = await response.json()

		expect(response.status).toBe(404)
		expect(json.error).toBe('La regla no pertenece a esta configuración')
	})

	it('should return 400 when rule is inactive', async () => {
		const configId = 10
		const ruleId = 5

		mockRuleFind.mockResolvedValue({
			idProductConfiguration: configId,
			active: false,
		} as any)

		const request = new Request(
			`http://localhost:3000/api/product-configurations/${configId}/commission-rules/${ruleId}/assign-new-businesses`,
			{ method: 'POST' }
		)

		const response = await POST(request, {
			params: Promise.resolve({
				id: String(configId),
				ruleId: String(ruleId),
			}),
		})
		const json = await response.json()

		expect(response.status).toBe(400)
		expect(json.error).toBe(
			'Solo se puede asignar una regla activa como predeterminada'
		)
	})
})
