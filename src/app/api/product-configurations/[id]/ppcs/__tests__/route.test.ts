/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Mock modules
vi.mock('@/lib/prisma', () => ({
	prisma: {
		productPercentageCommission: {
			findMany: vi.fn(),
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

describe('GET /api/product-configurations/[id]/ppcs', () => {
	const mockPrismaPpc = vi.mocked(prisma.productPercentageCommission.findMany)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should return available PPC options for a given product configuration', async () => {
		const configId = 1
		const mockPpcs = [
			{ idProductPercentageCommission: 1, active: true },
			{ idProductPercentageCommission: 2, active: false },
		]

		mockPrismaPpc.mockResolvedValue(mockPpcs as any)

		const request = new Request(
			`http://localhost:3000/api/product-configurations/${configId}/ppcs`
		)

		const response = await GET(request, {
			params: Promise.resolve({ id: String(configId) }),
		})
		const json = await response.json()

		expect(response.status).toBe(200)
		expect(json.data).toEqual(mockPpcs)
		expect(mockPrismaPpc).toHaveBeenCalledWith({
			where: {
				idProductConfiguration: configId,
			},
			select: {
				idProductPercentageCommission: true,
				description: true,
				active: true,
			},
			orderBy: {
				idProductPercentageCommission: 'asc',
			},
		})
	})

	it('should return empty list if no PPCs found', async () => {
		const configId = 1
		mockPrismaPpc.mockResolvedValue([])

		const request = new Request(
			`http://localhost:3000/api/product-configurations/${configId}/ppcs`
		)

		const response = await GET(request, {
			params: Promise.resolve({ id: String(configId) }),
		})
		const json = await response.json()

		expect(response.status).toBe(200)
		expect(json.data).toEqual([])
	})

	it('should handle database error', async () => {
		const configId = 1
		mockPrismaPpc.mockRejectedValue(new Error('DB Error'))
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const request = new Request(
			`http://localhost:3000/api/product-configurations/${configId}/ppcs`
		)

		const response = await GET(request, {
			params: Promise.resolve({ id: String(configId) }),
		})
		const json = await response.json()

		expect(response.status).toBe(500)
		expect(json.error).toBe('Error al obtener comisiones de porcentaje')

		consoleError.mockRestore()
	})
})
