/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST, GET } from '../route'
import { prisma } from '@/lib/prisma'
import { createProductConfigurationSchema } from '@/features/product-configuration/lib/product-configuration-schemas'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Mock modules
vi.mock('@/lib/prisma', () => ({
	prisma: {
		product: {
			findUnique: vi.fn(),
		},
		clientOrigin: {
			findUnique: vi.fn(),
		},
		category: {
			findUnique: vi.fn(),
		},
		productConfiguration: {
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			count: vi.fn(),
			findMany: vi.fn(),
		},
		productPercentageCommission: {
			create: vi.fn(),
		},
		productPercentageCommissionCategory: {
			findMany: vi.fn(),
		},
		$transaction: vi.fn((callback) => callback(prisma)),
	},
}))

vi.mock(
	'@/features/product-configuration/lib/product-configuration-schemas',
	() => ({
		createProductConfigurationSchema: {
			parse: vi.fn(),
		},
	})
)

vi.mock('@/features/negocios/lib/product-configuration-code', () => ({
	buildProductConfigurationCode: vi.fn(() => 'TEST-CODE-123'),
}))

vi.mock(
	'@/features/product-configuration/mappers/product-configuration.mapper',
	() => ({
		prismaProductConfigToProductConfig: vi.fn((data) => data), // Simple identity pass-through for test
		prismaProductConfigListToProductConfigs: vi.fn((list) => list),
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

describe('POST /api/product-configurations', () => {
	const mockPrismaProduct = vi.mocked(prisma.product.findUnique)
	const mockPrismaOrigin = vi.mocked(prisma.clientOrigin.findUnique)
	const mockPrismaCategory = vi.mocked(prisma.category.findUnique)
	const mockPrismaConfig = vi.mocked(prisma.productConfiguration.findUnique)
	const mockPrismaConfigCreate = vi.mocked(prisma.productConfiguration.create)
	const mockPrismaPpcCreate = vi.mocked(
		prisma.productPercentageCommission.create
	)
	const mockPrismaConfigUpdate = vi.mocked(prisma.productConfiguration.update)
	const mockSchemaParse = vi.mocked(createProductConfigurationSchema)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Security & Validation', () => {
		it('debe validar que el producto pertenezca a la compañía (Security Check)', async () => {
			const requestBody = {
				idCompany: 999, // HACKER TRYING TO INJECT INTO COMPANY 999
				idProduct: 1,
				idClientOrigin: 1,
				idCategory: 1,
			}

			mockSchemaParse.parse.mockReturnValue(requestBody)

			// Mock Product belonging to DIFFERENT company (100)
			mockPrismaProduct.mockResolvedValue({
				idProduct: 1,
				name: 'Product A',
				idCompany: 100, // Valid Company is 100
				status: true,
				company: { name: 'Company B' },
			} as any)

			const request = new Request(
				'http://localhost:3000/api/product-configurations',
				{
					method: 'POST',
					body: JSON.stringify(requestBody),
				}
			)

			const response = await POST(request)
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData.error).toMatch(/no pertenece a la compañía/)
			expect(mockPrismaConfigCreate).not.toHaveBeenCalled()
		})
	})

	describe('Happy Path', () => {
		it('debe crear configuración exitosamente', async () => {
			const requestBody = {
				idCompany: 1,
				idProduct: 1,
				idClientOrigin: 1,
				idCategory: 1,
			}

			mockSchemaParse.parse.mockReturnValue(requestBody)

			// Mocks
			mockPrismaProduct.mockResolvedValue({
				idProduct: 1,
				name: 'Product A',
				idCompany: 1,
				status: true,
				company: { name: 'Company A' },
			} as any)
			mockPrismaOrigin.mockResolvedValue({
				idClientOrigin: 1,
				name: 'Origin A',
				status: true,
			} as any)
			mockPrismaCategory.mockResolvedValue({
				idCategory: 1,
				name: 'Category A',
				status: true,
			} as any)
			mockPrismaConfig.mockResolvedValue(null) // Not exists

			// Transaction Mocks
			const mockCreatedConfig = { id: 10, code: 'TEST-CODE-123' }
			const mockCreatedPpc = { idProductPercentageCommission: 50, active: true }
			mockPrismaConfigCreate.mockResolvedValue(mockCreatedConfig as any)
			mockPrismaPpcCreate.mockResolvedValue(mockCreatedPpc as any)
			mockPrismaConfigUpdate.mockResolvedValue({
				...mockCreatedConfig,
				ppc: mockCreatedPpc,
			} as any)

			const request = new Request(
				'http://localhost:3000/api/product-configurations',
				{
					method: 'POST',
					body: JSON.stringify(requestBody),
				}
			)

			const response = await POST(request)

			expect(response.status).toBe(201)
			expect(mockPrismaConfigCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						idProduct: 1,
						code: 'TEST-CODE-123',
					}),
				})
			)
			// Verification that PPC was linked
			expect(mockPrismaConfigUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: 10 },
					data: { idProductPercentageCommissionNewBusinesses: 50 },
				})
			)
		})
	})
})

describe('GET /api/product-configurations', () => {
	const mockPrismaCount = vi.mocked(prisma.productConfiguration.count)
	const mockPrismaFindMany = vi.mocked(prisma.productConfiguration.findMany)
	const mockCategoryLinesFindMany = vi.mocked(
		prisma.productPercentageCommissionCategory.findMany
	)

	beforeEach(() => {
		vi.clearAllMocks()
		mockCategoryLinesFindMany.mockResolvedValue([])
	})

	it('debe listar configuraciones con paginación por defecto', async () => {
		const request = new Request(
			'http://localhost:3000/api/product-configurations'
		)
		mockPrismaCount.mockResolvedValue(20)
		mockPrismaFindMany.mockResolvedValue([
			{
				id: 1,
				code: 'C1',
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				product: { name: 'P1', company: { name: 'Comp1' } },
				clientOrigin: { name: 'O1' },
				category: { name: 'Cat1' },
			},
			{
				id: 2,
				code: 'C2',
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				product: { name: 'P2', company: { name: 'Comp2' } },
				clientOrigin: { name: 'O2' },
				category: { name: 'Cat2' },
			},
		] as any)

		const response = await GET(request)
		const json = await response.json()

		expect(response.status).toBe(200)
		expect(json.data.configurations).toHaveLength(2)
		expect(json.data.pagination).toEqual({
			page: 1,
			pageSize: 10,
			total: 20,
			totalPages: 2,
		})
		expect(mockPrismaFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				skip: 0,
				take: 10,
			})
		)
	})

	it('debe filtrar por búsqueda', async () => {
		const request = new Request(
			'http://localhost:3000/api/product-configurations?search=TEST'
		)
		mockPrismaCount.mockResolvedValue(1)
		mockPrismaFindMany.mockResolvedValue([
			{
				id: 1,
				code: 'TEST',
				product: { name: 'P' },
				clientOrigin: { name: 'O' },
				category: { name: 'C' },
			},
		] as any)

		await GET(request)

		expect(mockPrismaFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					OR: expect.arrayContaining([
						{ code: { contains: 'TEST', mode: 'insensitive' } },
					]),
				}),
			})
		)
	})

	it('debe filtrar por estado activo', async () => {
		const request = new Request(
			'http://localhost:3000/api/product-configurations?active=active'
		)
		mockPrismaCount.mockResolvedValue(1)
		mockPrismaFindMany.mockResolvedValue([])

		await GET(request)

		expect(mockPrismaFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ active: true }),
			})
		)
	})

	it('debe manejar errores correctamente', async () => {
		const request = new Request(
			'http://localhost:3000/api/product-configurations'
		)
		mockPrismaFindMany.mockRejectedValue(new Error('DB Error'))

		const response = await GET(request)
		const json = await response.json()

		expect(response.status).toBe(500)
		expect(json.error).toBe('Error al obtener configuraciones de producto')
	})
})
