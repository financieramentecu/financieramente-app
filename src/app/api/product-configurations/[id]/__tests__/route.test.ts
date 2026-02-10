/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT, PATCH } from '../route'
import { prisma } from '@/lib/prisma'
import { updateProductConfigurationSchema } from '@/features/product-configuration/lib/product-configuration-schemas'
import { NextResponse } from 'next/server'

// Mock modules
vi.mock('@/lib/prisma', () => ({
	prisma: {
		productConfiguration: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		productPercentajeCommision: {
			findUnique: vi.fn(),
		},
	},
}))

vi.mock(
	'@/features/product-configuration/lib/product-configuration-schemas',
	() => ({
		updateProductConfigurationSchema: {
			parse: vi.fn(),
		},
	})
)

vi.mock(
	'@/features/product-configuration/mappers/product-configuration.mapper',
	() => ({
		prismaProductConfigToProductConfig: vi.fn((data) => data),
	})
)

vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

describe('PUT /api/product-configurations/[id]', () => {
	const mockPrismaConfig = vi.mocked(prisma.productConfiguration.findUnique)
	const mockPrismaConfigUpdate = vi.mocked(prisma.productConfiguration.update)
	const mockPrismaPpc = vi.mocked(prisma.productPercentajeCommision.findUnique)
	const mockSchemaParse = vi.mocked(updateProductConfigurationSchema)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should update product configuration successfully', async () => {
		const configId = 1
		const ppcId = 100
		const requestBody = { idProductPercentajeCommisionNewBusinesses: ppcId }

		mockSchemaParse.parse.mockReturnValue(requestBody as any)

		// Mock existing config
		mockPrismaConfig.mockResolvedValue({ id: configId } as any)

		// Mock PPC belonging to config
		mockPrismaPpc.mockResolvedValue({
			idProductPercentajeCommision: ppcId,
			idProductConfiguration: configId,
		} as any)

		// Mock update
		const updatedConfig = { id: configId, ppcNewBusinesses: { id: ppcId } }
		mockPrismaConfigUpdate.mockResolvedValue(updatedConfig as any)

		const request = new Request(
			`http://localhost:3000/api/product-configurations/${configId}`,
			{
				method: 'PUT',
				body: JSON.stringify(requestBody),
			}
		)

		const response = await PUT(request, {
			params: Promise.resolve({ id: String(configId) }),
		})
		const json = await response.json()

		expect(response.status).toBe(200)
		expect(json.data).toEqual(updatedConfig)
		expect(mockPrismaConfigUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: configId },
				data: { idProductPercentajeCommisionNewBusinesses: ppcId },
			})
		)
	})

	it('should return 404 if configuration not found', async () => {
		const configId = 999
		mockSchemaParse.parse.mockReturnValue({
			idProductPercentajeCommisionNewBusinesses: 100,
		} as any)
		mockPrismaConfig.mockResolvedValue(null)

		const request = new Request(
			`http://localhost:3000/api/product-configurations/${configId}`,
			{ method: 'PUT', body: JSON.stringify({}) }
		)

		const response = await PUT(request, {
			params: Promise.resolve({ id: String(configId) }),
		})
		expect(response.status).toBe(404)
	})

	it('should return 400 if PPC belongs to another configuration', async () => {
		const configId = 1
		const ppcId = 100
		const otherConfigId = 2

		mockSchemaParse.parse.mockReturnValue({
			idProductPercentajeCommisionNewBusinesses: ppcId,
		} as any)
		mockPrismaConfig.mockResolvedValue({ id: configId } as any)
		mockPrismaPpc.mockResolvedValue({
			idProductPercentajeCommision: ppcId,
			idProductConfiguration: otherConfigId, // Mismatch
		} as any)

		const request = new Request(
			`http://localhost:3000/api/product-configurations/${configId}`,
			{ method: 'PUT', body: JSON.stringify({}) }
		)

		const response = await PUT(request, {
			params: Promise.resolve({ id: String(configId) }),
		})
		expect(response.status).toBe(400)
	})
})
describe('PATCH /api/product-configurations/[id]', () => {
	const mockPrismaConfig = vi.mocked(prisma.productConfiguration.findUnique)
	const mockPrismaConfigUpdate = vi.mocked(prisma.productConfiguration.update)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should toggle active status successfully', async () => {
		const configId = 1
		const active = false

		mockPrismaConfig.mockResolvedValue({ id: configId, active: true } as any)
		mockPrismaConfigUpdate.mockResolvedValue({ id: configId, active } as any)

		const request = new Request(
			`http://localhost:3000/api/product-configurations/${configId}`,
			{
				method: 'PATCH',
				body: JSON.stringify({ active }),
			}
		)

		const response = await PATCH(request, {
			params: Promise.resolve({ id: String(configId) }),
		})
		const json = await response.json()

		expect(response.status).toBe(200)
		expect(json.data.active).toBe(active)
		expect(mockPrismaConfigUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: configId },
				data: { active },
			})
		)
	})

	it('should return 400 for invalid active value', async () => {
		const configId = 1
		const request = new Request(
			`http://localhost:3000/api/product-configurations/${configId}`,
			{
				method: 'PATCH',
				body: JSON.stringify({ active: 'invalid' }),
			}
		)

		const response = await PATCH(request, {
			params: Promise.resolve({ id: String(configId) }),
		})
		expect(response.status).toBe(400)
	})

	it('should return 404 if configuration not found', async () => {
		const configId = 999
		mockPrismaConfig.mockResolvedValue(null)

		const request = new Request(
			`http://localhost:3000/api/product-configurations/${configId}`,
			{
				method: 'PATCH',
				body: JSON.stringify({ active: false }),
			}
		)

		const response = await PATCH(request, {
			params: Promise.resolve({ id: String(configId) }),
		})
		expect(response.status).toBe(404)
	})
})
