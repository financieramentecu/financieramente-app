import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, POST } from '../route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createProductSchema } from '@/features/product/lib/product-schemas'
import {
	prismaProductToProduct,
	prismaProductListToProducts,
} from '@/features/product/mappers/product.mapper'
import { logAuditEvent, AuditAction } from '@/lib/auth/audit-logger'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createMockPrismaProduct } from '@/features/product/__tests__/fixtures/mock-product'

// Mock de módulos externos
vi.mock('@/auth')
vi.mock('@/lib/prisma', () => ({
	prisma: {
		product: {
			count: vi.fn(),
			findMany: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
		},
	},
}))
vi.mock('@/features/product/lib/product-schemas', () => ({
	createProductSchema: {
		parse: vi.fn(),
	},
}))
vi.mock('@/features/product/mappers/product.mapper')
vi.mock('@/lib/auth/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		PRODUCT_CREATED: 'PRODUCT_CREATED',
	},
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'test-agent'),
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

describe('GET /api/products', () => {
	const mockPrismaCount = vi.mocked(prisma.product.count)
	const mockPrismaFindMany = vi.mocked(prisma.product.findMany)
	const mockPrismaProductListToProducts = vi.mocked(prismaProductListToProducts)
	const mockNextResponseJson = vi.mocked(NextResponse.json)

	beforeEach(() => {
		vi.clearAllMocks()
		mockNextResponseJson.mockImplementation(
			(data: unknown, init?: { status?: number }) => {
				return {
					json: () => Promise.resolve(data),
					status: init?.status || 200,
				} as unknown as NextResponse
			}
		)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('Happy Path', () => {
		it('debe listar productos exitosamente con parámetros por defecto', async () => {
			const mockProducts = [
				createMockPrismaProduct(),
				createMockPrismaProduct({
					idProduct: 2,
					name: 'Seguro de Salud',
				}),
			]
			const mockFormattedProducts = [
				{ idProduct: 1, name: 'Seguro de Vida' },
				{ idProduct: 2, name: 'Seguro de Salud' },
			]

			mockPrismaCount.mockResolvedValue(2)
			mockPrismaFindMany.mockResolvedValue(mockProducts as never)
			mockPrismaProductListToProducts.mockReturnValue(
				mockFormattedProducts as never
			)

			const request = new Request('http://localhost:3000/api/products')
			const response = await GET(request)
			const responseData = await response.json()

			expect(mockPrismaCount).toHaveBeenCalledWith({ where: {} })
			expect(mockPrismaFindMany).toHaveBeenCalledWith({
				where: {},
				include: { company: true },
				orderBy: { name: 'asc' },
				skip: 0,
				take: 10,
			})
			expect(mockPrismaProductListToProducts).toHaveBeenCalledWith(mockProducts)
			expect(response.status).toBe(200)
			expect(responseData.data.products).toEqual(mockFormattedProducts)
			expect(responseData.data.pagination).toEqual({
				page: 1,
				pageSize: 10,
				total: 2,
				totalPages: 1,
			})
		})

		it('debe listar productos con paginación personalizada', async () => {
			const mockProducts = [createMockPrismaProduct()]
			const mockFormattedProducts = [{ idProduct: 1, name: 'Seguro de Vida' }]

			mockPrismaCount.mockResolvedValue(15)
			mockPrismaFindMany.mockResolvedValue(mockProducts as never)
			mockPrismaProductListToProducts.mockReturnValue(
				mockFormattedProducts as never
			)

			const request = new Request(
				'http://localhost:3000/api/products?page=2&pageSize=5'
			)
			const response = await GET(request)
			const responseData = await response.json()

			expect(mockPrismaFindMany).toHaveBeenCalledWith({
				where: {},
				include: { company: true },
				orderBy: { name: 'asc' },
				skip: 5, // (page - 1) * pageSize = (2 - 1) * 5 = 5
				take: 5,
			})
			expect(responseData.data.pagination).toEqual({
				page: 2,
				pageSize: 5,
				total: 15,
				totalPages: 3, // Math.ceil(15 / 5) = 3
			})
		})

		it('debe filtrar productos por búsqueda', async () => {
			const mockProducts = [createMockPrismaProduct()]
			const mockFormattedProducts = [{ idProduct: 1, name: 'Seguro de Vida' }]

			mockPrismaCount.mockResolvedValue(1)
			mockPrismaFindMany.mockResolvedValue(mockProducts as never)
			mockPrismaProductListToProducts.mockReturnValue(
				mockFormattedProducts as never
			)

			const request = new Request(
				'http://localhost:3000/api/products?search=Seguro'
			)
			await GET(request)

			expect(mockPrismaCount).toHaveBeenCalledWith({
				where: {
					OR: [
						{ name: { contains: 'Seguro', mode: 'insensitive' } },
						{ company: { name: { contains: 'Seguro', mode: 'insensitive' } } },
					],
				},
			})
		})

		it('debe filtrar productos por estado activo', async () => {
			const mockProducts = [createMockPrismaProduct()]
			const mockFormattedProducts = [{ idProduct: 1, name: 'Seguro de Vida' }]

			mockPrismaCount.mockResolvedValue(1)
			mockPrismaFindMany.mockResolvedValue(mockProducts as never)
			mockPrismaProductListToProducts.mockReturnValue(
				mockFormattedProducts as never
			)

			const request = new Request(
				'http://localhost:3000/api/products?status=active'
			)
			await GET(request)

			expect(mockPrismaCount).toHaveBeenCalledWith({
				where: { status: true },
			})
		})

		it('debe filtrar productos por estado inactivo', async () => {
			const mockProducts = [createMockPrismaProduct({ status: false })]
			const mockFormattedProducts = [{ idProduct: 1, name: 'Seguro de Vida' }]

			mockPrismaCount.mockResolvedValue(1)
			mockPrismaFindMany.mockResolvedValue(mockProducts as never)
			mockPrismaProductListToProducts.mockReturnValue(
				mockFormattedProducts as never
			)

			const request = new Request(
				'http://localhost:3000/api/products?status=inactive'
			)
			await GET(request)

			expect(mockPrismaCount).toHaveBeenCalledWith({
				where: { status: false },
			})
		})

		it('debe filtrar productos por idCompany', async () => {
			const mockProducts = [createMockPrismaProduct()]
			const mockFormattedProducts = [{ idProduct: 1, name: 'Seguro de Vida' }]

			mockPrismaCount.mockResolvedValue(1)
			mockPrismaFindMany.mockResolvedValue(mockProducts as never)
			mockPrismaProductListToProducts.mockReturnValue(
				mockFormattedProducts as never
			)

			const request = new Request(
				'http://localhost:3000/api/products?idCompany=1'
			)
			await GET(request)

			expect(mockPrismaCount).toHaveBeenCalledWith({
				where: { idCompany: 1 },
			})
		})

		it('debe combinar múltiples filtros', async () => {
			const mockProducts = [createMockPrismaProduct()]
			const mockFormattedProducts = [{ idProduct: 1, name: 'Seguro de Vida' }]

			mockPrismaCount.mockResolvedValue(1)
			mockPrismaFindMany.mockResolvedValue(mockProducts as never)
			mockPrismaProductListToProducts.mockReturnValue(
				mockFormattedProducts as never
			)

			const request = new Request(
				'http://localhost:3000/api/products?search=Seguro&status=active&idCompany=1'
			)
			await GET(request)

			expect(mockPrismaCount).toHaveBeenCalledWith({
				where: {
					OR: [
						{ name: { contains: 'Seguro', mode: 'insensitive' } },
						{ company: { name: { contains: 'Seguro', mode: 'insensitive' } } },
					],
					status: true,
					idCompany: 1,
				},
			})
		})

		it('debe ignorar idCompany inválido', async () => {
			const mockProducts = [createMockPrismaProduct()]
			const mockFormattedProducts = [{ idProduct: 1, name: 'Seguro de Vida' }]

			mockPrismaCount.mockResolvedValue(1)
			mockPrismaFindMany.mockResolvedValue(mockProducts as never)
			mockPrismaProductListToProducts.mockReturnValue(
				mockFormattedProducts as never
			)

			const request = new Request(
				'http://localhost:3000/api/products?idCompany=abc'
			)
			await GET(request)

			expect(mockPrismaCount).toHaveBeenCalledWith({
				where: {},
			})
		})
	})

	describe('Casos de Paginación', () => {
		it('debe calcular correctamente totalPages cuando hay resto', async () => {
			const mockProducts = [createMockPrismaProduct()]
			const mockFormattedProducts = [{ idProduct: 1, name: 'Seguro de Vida' }]

			mockPrismaCount.mockResolvedValue(25)
			mockPrismaFindMany.mockResolvedValue(mockProducts as never)
			mockPrismaProductListToProducts.mockReturnValue(
				mockFormattedProducts as never
			)

			const request = new Request('http://localhost:3000/api/products')
			const response = await GET(request)
			const responseData = await response.json()

			expect(responseData.data.pagination.totalPages).toBe(3) // Math.ceil(25 / 10) = 3
		})

		it('debe retornar página vacía cuando no hay resultados', async () => {
			mockPrismaCount.mockResolvedValue(0)
			mockPrismaFindMany.mockResolvedValue([] as never)
			mockPrismaProductListToProducts.mockReturnValue([] as never)

			const request = new Request('http://localhost:3000/api/products')
			const response = await GET(request)
			const responseData = await response.json()

			expect(responseData.data.products).toEqual([])
			expect(responseData.data.pagination).toEqual({
				page: 1,
				pageSize: 10,
				total: 0,
				totalPages: 0,
			})
		})
	})

	describe('Casos de Errores de Base de Datos', () => {
		it('debe retornar 500 cuando count falla', async () => {
			mockPrismaCount.mockRejectedValue(new Error('Database error'))

			const request = new Request('http://localhost:3000/api/products')
			const response = await GET(request)
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error al obtener productos',
			})
		})

		it('debe retornar 500 cuando findMany falla', async () => {
			mockPrismaCount.mockResolvedValue(10)
			mockPrismaFindMany.mockRejectedValue(new Error('Query failed'))

			const request = new Request('http://localhost:3000/api/products')
			const response = await GET(request)
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error al obtener productos',
			})
		})
	})
})

describe('POST /api/products', () => {
	const mockAuth = vi.mocked(auth)
	const mockPrismaFindFirst = vi.mocked(prisma.product.findFirst)
	const mockPrismaCreate = vi.mocked(prisma.product.create)
	const mockCreateProductSchema = vi.mocked(createProductSchema)
	const mockPrismaProductToProduct = vi.mocked(prismaProductToProduct)
	const mockLogAuditEvent = vi.mocked(logAuditEvent)
	const mockNextResponseJson = vi.mocked(NextResponse.json)

	beforeEach(() => {
		vi.clearAllMocks()
		mockNextResponseJson.mockImplementation(
			(data: unknown, init?: { status?: number }) => {
				return {
					json: () => Promise.resolve(data),
					status: init?.status || 200,
				} as unknown as NextResponse
			}
		)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('Happy Path', () => {
		it('debe crear producto exitosamente', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
					name: 'Admin User',
				},
			}

			const requestBody = {
				name: 'seguro de vida',
				idCompany: 1,
				status: true,
			}

			const mockCreatedProduct = createMockPrismaProduct({
				name: 'Seguro de vida', // Capitalizado
			})

			const mockFormattedProduct = {
				idProduct: 1,
				name: 'Seguro de vida',
				idCompany: 1,
				status: true,
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCreateProductSchema.parse.mockReturnValue(requestBody)
			mockPrismaFindFirst.mockResolvedValue(null) // No existe duplicado
			mockPrismaCreate.mockResolvedValue(mockCreatedProduct as never)
			mockPrismaProductToProduct.mockReturnValue(mockFormattedProduct as never)

			const request = new Request('http://localhost:3000/api/products', {
				method: 'POST',
				body: JSON.stringify(requestBody),
				headers: {
					'Content-Type': 'application/json',
				},
			})

			const response = await POST(request)
			const responseData = await response.json()

			expect(mockAuth).toHaveBeenCalledTimes(1)
			expect(mockCreateProductSchema.parse).toHaveBeenCalledWith(requestBody)
			expect(mockPrismaFindFirst).toHaveBeenCalledWith({
				where: {
					idCompany: 1,
					name: {
						equals: 'seguro de vida',
						mode: 'insensitive',
					},
				},
			})
			expect(mockPrismaCreate).toHaveBeenCalledWith({
				data: {
					name: 'Seguro de vida',
					idCompany: 1,
					status: true,
				},
				include: {
					company: true,
				},
			})
			expect(mockLogAuditEvent).toHaveBeenCalledWith({
				userId: 1,
				action: AuditAction.PRODUCT_CREATED,
				email: 'admin@example.com',
				ipAddress: '127.0.0.1',
				userAgent: 'test-agent',
				details: expect.stringContaining('Producto creado'),
			})
			expect(response.status).toBe(201)
			expect(responseData.data).toEqual(mockFormattedProduct)
		})

		it('debe capitalizar correctamente el nombre del producto', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const requestBody = {
				name: '  seguro de salud  ',
				idCompany: 1,
				status: true,
			}

			const mockCreatedProduct = createMockPrismaProduct({
				name: 'Seguro de salud',
			})

			const mockFormattedProduct = {
				idProduct: 1,
				name: 'Seguro de salud',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCreateProductSchema.parse.mockReturnValue(requestBody)
			mockPrismaFindFirst.mockResolvedValue(null)
			mockPrismaCreate.mockResolvedValue(mockCreatedProduct as never)
			mockPrismaProductToProduct.mockReturnValue(mockFormattedProduct as never)

			const request = new Request('http://localhost:3000/api/products', {
				method: 'POST',
				body: JSON.stringify(requestBody),
			})

			await POST(request)

			expect(mockPrismaCreate).toHaveBeenCalledWith({
				data: {
					name: 'Seguro de salud',
					idCompany: 1,
					status: true,
				},
				include: {
					company: true,
				},
			})
		})
	})

	describe('Casos de Autenticación', () => {
		it('debe retornar 401 cuando no hay sesión', async () => {
			mockAuth.mockResolvedValue(null as never)

			const request = new Request('http://localhost:3000/api/products', {
				method: 'POST',
				body: JSON.stringify({
					name: 'Seguro de Vida',
					idCompany: 1,
					status: true,
				}),
			})

			const response = await POST(request)
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({
				data: null,
				error: 'No autorizado',
			})
			expect(mockPrismaCreate).not.toHaveBeenCalled()
		})

		it('debe retornar 401 cuando la sesión no tiene user', async () => {
			mockAuth.mockResolvedValue({} as never)

			const request = new Request('http://localhost:3000/api/products', {
				method: 'POST',
				body: JSON.stringify({
					name: 'Seguro de Vida',
					idCompany: 1,
					status: true,
				}),
			})

			const response = await POST(request)
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({
				data: null,
				error: 'No autorizado',
			})
		})
	})

	describe('Casos de Validación', () => {
		it('debe retornar 400 cuando el schema es inválido', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const requestBody = {
				name: 'A', // Muy corto
				idCompany: 1,
				status: true,
			}

			const zodError = new z.ZodError([
				{
					code: 'too_small',
					minimum: 2,
					inclusive: true,
					exact: false,
					message: 'El nombre del producto debe tener al menos 2 caracteres',
					path: ['name'],
					origin: 'value',
				},
			])

			mockAuth.mockResolvedValue(mockSession as never)
			mockCreateProductSchema.parse.mockImplementation(() => {
				throw zodError
			})

			const request = new Request('http://localhost:3000/api/products', {
				method: 'POST',
				body: JSON.stringify(requestBody),
			})

			const response = await POST(request)
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData).toEqual({
				data: null,
				error: 'El nombre del producto debe tener al menos 2 caracteres',
			})
		})
	})

	describe('Casos de Contrato Duplicado', () => {
		it('debe retornar 409 cuando ya existe un producto con el mismo nombre para la compañía', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const requestBody = {
				name: 'Seguro de Vida',
				idCompany: 1,
				status: true,
			}

			const mockExistingProduct = createMockPrismaProduct()

			mockAuth.mockResolvedValue(mockSession as never)
			mockCreateProductSchema.parse.mockReturnValue(requestBody)
			mockPrismaFindFirst.mockResolvedValue(mockExistingProduct as never)

			const request = new Request('http://localhost:3000/api/products', {
				method: 'POST',
				body: JSON.stringify(requestBody),
			})

			const response = await POST(request)
			const responseData = await response.json()

			expect(response.status).toBe(409)
			expect(responseData).toEqual({
				data: null,
				error: 'Ya existe un producto con este nombre para esta compañía',
			})
			expect(mockPrismaCreate).not.toHaveBeenCalled()
		})
	})

	describe('Casos de Errores de Base de Datos', () => {
		it('debe retornar 500 cuando create falla', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const requestBody = {
				name: 'Seguro de Vida',
				idCompany: 1,
				status: true,
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCreateProductSchema.parse.mockReturnValue(requestBody)
			mockPrismaFindFirst.mockResolvedValue(null)
			mockPrismaCreate.mockRejectedValue(new Error('Database error'))

			const request = new Request('http://localhost:3000/api/products', {
				method: 'POST',
				body: JSON.stringify(requestBody),
			})

			const response = await POST(request)
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error al crear producto',
			})
		})

		it('debe retornar 409 cuando Prisma lanza error P2002 (unique constraint)', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const requestBody = {
				name: 'Seguro de Vida',
				idCompany: 1,
				status: true,
			}

			const prismaError = {
				code: 'P2002',
				meta: {
					target: ['idCompany', 'name'],
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockCreateProductSchema.parse.mockReturnValue(requestBody)
			mockPrismaFindFirst.mockResolvedValue(null)
			mockPrismaCreate.mockRejectedValue(prismaError)

			const request = new Request('http://localhost:3000/api/products', {
				method: 'POST',
				body: JSON.stringify(requestBody),
			})

			const response = await POST(request)
			const responseData = await response.json()

			expect(response.status).toBe(409)
			expect(responseData).toEqual({
				data: null,
				error: 'Ya existe un producto con este nombre para esta compañía',
			})
		})
	})
})
