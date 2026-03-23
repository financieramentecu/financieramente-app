import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, PUT, DELETE } from '../route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { updateProductSchema } from '@/features/product/lib/product-schemas'
import { prismaProductToProduct } from '@/features/product/mappers/product.mapper'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createMockPrismaProduct } from '@/features/product/__tests__/fixtures/mock-product'

// Mock de módulos externos
vi.mock('@/auth')
vi.mock('@/lib/prisma', () => ({
	prisma: {
		product: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		productConfiguration: {
			findFirst: vi.fn(),
		},
	},
}))
vi.mock('@/features/product/lib/product-schemas', () => ({
	updateProductSchema: {
		parse: vi.fn(),
	},
}))
vi.mock('@/features/product/mappers/product.mapper')
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		PRODUCT_UPDATED: 'PRODUCT_UPDATED',
		PRODUCT_DELETED: 'PRODUCT_DELETED',
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

describe('GET /api/products/[id]', () => {
	const mockPrismaFindUnique = vi.mocked(prisma.product.findUnique)
	const mockPrismaProductToProduct = vi.mocked(prismaProductToProduct)
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
		it('debe obtener producto exitosamente por ID', async () => {
			const mockProduct = createMockPrismaProduct()
			const mockFormattedProduct = {
				idProduct: 1,
				name: 'Seguro de Vida',
				idCompany: 1,
				status: true,
			}

			mockPrismaFindUnique.mockResolvedValue(mockProduct as never)
			mockPrismaProductToProduct.mockReturnValue(mockFormattedProduct as never)

			const request = new Request('http://localhost:3000/api/products/1')
			const params = Promise.resolve({ id: '1' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(mockPrismaFindUnique).toHaveBeenCalledWith({
				where: { idProduct: 1 },
				include: { company: true, typeProduct: true },
			})
			expect(mockPrismaProductToProduct).toHaveBeenCalledWith(mockProduct)
			expect(response.status).toBe(200)
			expect(responseData).toEqual({ data: mockFormattedProduct })
		})
	})

	describe('Casos de Producto No Encontrado', () => {
		it('debe retornar 404 cuando el producto no existe', async () => {
			mockPrismaFindUnique.mockResolvedValue(null)

			const request = new Request('http://localhost:3000/api/products/999')
			const params = Promise.resolve({ id: '999' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Producto no encontrado',
			})
		})
	})

	describe('Casos de Errores de Base de Datos', () => {
		it('debe retornar 500 cuando findUnique falla', async () => {
			mockPrismaFindUnique.mockRejectedValue(new Error('Database error'))

			const request = new Request('http://localhost:3000/api/products/1')
			const params = Promise.resolve({ id: '1' })
			const response = await GET(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error al obtener producto',
			})
		})
	})
})

describe('PUT /api/products/[id]', () => {
	const mockAuth = vi.mocked(auth)
	const mockPrismaFindUnique = vi.mocked(prisma.product.findUnique)
	const mockPrismaFindFirst = vi.mocked(prisma.product.findFirst)
	const mockPrismaUpdate = vi.mocked(prisma.product.update)
	const mockProductConfigurationFindFirst = vi.mocked(
		prisma.productConfiguration.findFirst
	)
	const mockUpdateProductSchema = vi.mocked(updateProductSchema)
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
		it('debe actualizar producto exitosamente', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
					name: 'Admin User',
				},
			}

			const mockExistingProduct = createMockPrismaProduct()
			const mockUpdatedProduct = createMockPrismaProduct({
				name: 'Seguro de Salud Actualizado',
			})

			const mockFormattedProduct = {
				idProduct: 1,
				name: 'Seguro de Salud Actualizado',
			}

			const requestBody = {
				name: 'seguro de salud actualizado',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateProductSchema.parse.mockReturnValue(requestBody)
			mockPrismaFindUnique.mockResolvedValue(mockExistingProduct as never)
			mockPrismaFindFirst.mockResolvedValue(null) // No hay duplicado
			mockProductConfigurationFindFirst.mockResolvedValue(null) // No está en uso
			mockPrismaUpdate.mockResolvedValue(mockUpdatedProduct as never)
			mockPrismaProductToProduct.mockReturnValue(mockFormattedProduct as never)

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
				headers: {
					'Content-Type': 'application/json',
				},
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(mockAuth).toHaveBeenCalledTimes(1)
			expect(mockUpdateProductSchema.parse).toHaveBeenCalledWith(requestBody)
			expect(mockPrismaFindUnique).toHaveBeenCalledWith({
				where: { idProduct: 1 },
				include: { company: true, typeProduct: true },
			})
			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { idProduct: 1 },
				data: expect.objectContaining({
					name: 'Seguro de salud actualizado',
				}),
				include: { company: true, typeProduct: true },
			})
			expect(mockLogAuditEvent).toHaveBeenCalled()
			expect(response.status).toBe(200)
			expect(responseData.data).toEqual(mockFormattedProduct)
		})

		it('debe actualizar solo el campo status', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const mockExistingProduct = createMockPrismaProduct()
			const mockUpdatedProduct = createMockPrismaProduct({
				status: false,
			})

			const mockFormattedProduct = {
				idProduct: 1,
				status: false,
			}

			const requestBody = {
				status: false,
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateProductSchema.parse.mockReturnValue(requestBody)
			mockPrismaFindUnique.mockResolvedValue(mockExistingProduct as never)
			mockProductConfigurationFindFirst.mockResolvedValue(null)
			mockPrismaUpdate.mockResolvedValue(mockUpdatedProduct as never)
			mockPrismaProductToProduct.mockReturnValue(mockFormattedProduct as never)

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			await PUT(request, { params })

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { idProduct: 1 },
				data: {
					status: false,
				},
				include: { company: true, typeProduct: true },
			})
		})

		it('debe actualizar solo el campo idCompany', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const mockExistingProduct = createMockPrismaProduct()
			const mockUpdatedProduct = createMockPrismaProduct({
				idCompany: 2,
			})

			const mockFormattedProduct = {
				idProduct: 1,
				idCompany: 2,
			}

			const requestBody = {
				idCompany: 2,
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateProductSchema.parse.mockReturnValue(requestBody)
			mockPrismaFindUnique.mockResolvedValue(mockExistingProduct as never)
			mockPrismaFindFirst.mockResolvedValue(null)
			mockProductConfigurationFindFirst.mockResolvedValue(null)
			mockPrismaUpdate.mockResolvedValue(mockUpdatedProduct as never)
			mockPrismaProductToProduct.mockReturnValue(mockFormattedProduct as never)

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			await PUT(request, { params })

			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { idProduct: 1 },
				data: {
					idCompany: 2,
				},
				include: { company: true, typeProduct: true },
			})
		})
	})

	describe('Casos de Autenticación', () => {
		it('debe retornar 401 cuando no hay sesión', async () => {
			mockAuth.mockResolvedValue(null as never)

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'PUT',
				body: JSON.stringify({ name: 'Nuevo Nombre' }),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({
				data: null,
				error: 'No autorizado',
			})
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
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
			mockUpdateProductSchema.parse.mockImplementation(() => {
				throw zodError
			})

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(400)
			expect(responseData).toEqual({
				data: null,
				error: 'El nombre del producto debe tener al menos 2 caracteres',
			})
		})
	})

	describe('Casos de Producto No Encontrado', () => {
		it('debe retornar 404 cuando el producto no existe', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const requestBody = {
				name: 'Nuevo Nombre',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateProductSchema.parse.mockReturnValue(requestBody)
			mockPrismaFindUnique.mockResolvedValue(null)

			const request = new Request('http://localhost:3000/api/products/999', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '999' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Producto no encontrado',
			})
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})
	})

	describe('Casos de Nombre Duplicado', () => {
		it('debe retornar 409 cuando ya existe otro producto con el mismo nombre para la compañía', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const mockExistingProduct = createMockPrismaProduct()
			const mockDuplicateProduct = createMockPrismaProduct({
				idProduct: 2,
				name: 'Seguro de Salud',
			})

			const requestBody = {
				name: 'Seguro de Salud',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateProductSchema.parse.mockReturnValue(requestBody)
			mockPrismaFindUnique.mockResolvedValue(mockExistingProduct as never)
			mockPrismaFindFirst.mockResolvedValue(mockDuplicateProduct as never)

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(409)
			expect(responseData).toEqual({
				data: null,
				error: 'Ya existe un producto con este nombre para esta compañía',
			})
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})

		it('debe permitir actualizar con el mismo nombre del mismo producto', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const mockExistingProduct = createMockPrismaProduct()
			const mockUpdatedProduct = createMockPrismaProduct()

			const requestBody = {
				name: 'Seguro de Vida',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateProductSchema.parse.mockReturnValue(requestBody)
			mockPrismaFindUnique.mockResolvedValue(mockExistingProduct as never)
			mockPrismaFindFirst.mockResolvedValue(null) // No hay duplicado porque es el mismo
			mockProductConfigurationFindFirst.mockResolvedValue(null)
			mockPrismaUpdate.mockResolvedValue(mockUpdatedProduct as never)
			mockPrismaProductToProduct.mockReturnValue({
				idProduct: 1,
				name: 'Seguro de Vida',
			} as never)

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })

			expect(response.status).toBe(200)
			expect(mockPrismaUpdate).toHaveBeenCalled()
		})
	})

	describe('Casos de Producto en Uso', () => {
		it('debe retornar 409 cuando se intenta desactivar un producto en uso', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const mockExistingProduct = createMockPrismaProduct({
				status: true,
			})

			const mockProductInUse = {
				idProductPercentageCommission: 1,
				idProduct: 1,
			}

			const requestBody = {
				status: false,
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateProductSchema.parse.mockReturnValue(requestBody)
			mockPrismaFindUnique.mockResolvedValue(mockExistingProduct as never)
			mockProductConfigurationFindFirst.mockResolvedValue(
				mockProductInUse as never
			)

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(409)
			expect(responseData).toEqual({
				data: null,
				error:
					'Este producto está siendo utilizado en configuraciones de distribución comisional. No se puede desactivar.',
			})
			expect(mockPrismaUpdate).not.toHaveBeenCalled()
		})

		it('debe permitir desactivar un producto que no está en uso', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const mockExistingProduct = createMockPrismaProduct({
				status: true,
			})

			const mockUpdatedProduct = createMockPrismaProduct({
				status: false,
			})

			const requestBody = {
				status: false,
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateProductSchema.parse.mockReturnValue(requestBody)
			mockPrismaFindUnique.mockResolvedValue(mockExistingProduct as never)
			mockProductConfigurationFindFirst.mockResolvedValue(null)
			mockPrismaUpdate.mockResolvedValue(mockUpdatedProduct as never)
			mockPrismaProductToProduct.mockReturnValue({
				idProduct: 1,
				status: false,
			} as never)

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })

			expect(response.status).toBe(200)
			expect(mockPrismaUpdate).toHaveBeenCalled()
		})
	})

	describe('Casos de Errores de Base de Datos', () => {
		it('debe retornar 500 cuando update falla', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const mockExistingProduct = createMockPrismaProduct()

			const requestBody = {
				name: 'Nuevo Nombre',
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateProductSchema.parse.mockReturnValue(requestBody)
			mockPrismaFindUnique.mockResolvedValue(mockExistingProduct as never)
			mockPrismaFindFirst.mockResolvedValue(null)
			mockProductConfigurationFindFirst.mockResolvedValue(null)
			mockPrismaUpdate.mockRejectedValue(new Error('Update failed'))

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error al actualizar producto',
			})
		})

		it('debe retornar 404 cuando Prisma lanza error P2025', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const mockExistingProduct = createMockPrismaProduct()

			const requestBody = {
				name: 'Nuevo Nombre',
			}

			const prismaError = {
				code: 'P2025',
				meta: {
					cause: 'Record to update not found.',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockUpdateProductSchema.parse.mockReturnValue(requestBody)
			mockPrismaFindUnique.mockResolvedValue(mockExistingProduct as never)
			mockPrismaFindFirst.mockResolvedValue(null)
			mockProductConfigurationFindFirst.mockResolvedValue(null)
			mockPrismaUpdate.mockRejectedValue(prismaError)

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			})

			const params = Promise.resolve({ id: '1' })
			const response = await PUT(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Producto no encontrado',
			})
		})
	})
})

describe('DELETE /api/products/[id]', () => {
	const mockAuth = vi.mocked(auth)
	const mockPrismaFindUnique = vi.mocked(prisma.product.findUnique)
	const mockProductConfigurationFindFirst = vi.mocked(
		prisma.productConfiguration.findFirst
	)
	const mockPrismaDelete = vi.mocked(prisma.product.delete)
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
		it('debe eliminar producto exitosamente', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
					name: 'Admin User',
				},
			}

			const mockExistingProduct = createMockPrismaProduct()

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindUnique.mockResolvedValue(mockExistingProduct as never)
			mockProductConfigurationFindFirst.mockResolvedValue(null) // No está en uso
			mockPrismaDelete.mockResolvedValue(mockExistingProduct as never)

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'DELETE',
			})

			const params = Promise.resolve({ id: '1' })
			const response = await DELETE(request, { params })
			const responseData = await response.json()

			expect(mockAuth).toHaveBeenCalledTimes(1)
			expect(mockPrismaFindUnique).toHaveBeenCalledWith({
				where: { idProduct: 1 },
				include: { company: true, typeProduct: true },
			})
			expect(mockProductConfigurationFindFirst).toHaveBeenCalledWith({
				where: { idProduct: 1 },
			})
			expect(mockPrismaDelete).toHaveBeenCalledWith({
				where: { idProduct: 1 },
			})
			expect(mockLogAuditEvent).toHaveBeenCalledWith({
				userId: 1,
				action: AuditAction.PRODUCT_DELETED,
				email: 'admin@example.com',
				ipAddress: '127.0.0.1',
				userAgent: 'test-agent',
				details: expect.stringContaining('Producto eliminado'),
			})
			expect(response.status).toBe(200)
			expect(responseData).toEqual({ data: undefined })
		})
	})

	describe('Casos de Autenticación', () => {
		it('debe retornar 401 cuando no hay sesión', async () => {
			mockAuth.mockResolvedValue(null as never)

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'DELETE',
			})

			const params = Promise.resolve({ id: '1' })
			const response = await DELETE(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(401)
			expect(responseData).toEqual({
				data: null,
				error: 'No autorizado',
			})
			expect(mockPrismaDelete).not.toHaveBeenCalled()
		})
	})

	describe('Casos de Producto No Encontrado', () => {
		it('debe retornar 404 cuando el producto no existe', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindUnique.mockResolvedValue(null)

			const request = new Request('http://localhost:3000/api/products/999', {
				method: 'DELETE',
			})

			const params = Promise.resolve({ id: '999' })
			const response = await DELETE(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Producto no encontrado',
			})
			expect(mockPrismaDelete).not.toHaveBeenCalled()
		})
	})

	describe('Casos de Producto en Uso', () => {
		it('debe retornar 409 cuando el producto está siendo utilizado', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const mockExistingProduct = createMockPrismaProduct()
			const mockProductInUse = {
				id: 1,
				idProduct: 1,
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindUnique.mockResolvedValue(mockExistingProduct as never)
			mockProductConfigurationFindFirst.mockResolvedValue(
				mockProductInUse as never
			)

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'DELETE',
			})

			const params = Promise.resolve({ id: '1' })
			const response = await DELETE(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(409)
			expect(responseData).toEqual({
				data: null,
				error:
					'Este producto está siendo utilizado en configuraciones de distribución comisional. No se puede eliminar.',
			})
			expect(mockPrismaDelete).not.toHaveBeenCalled()
		})
	})

	describe('Casos de Errores de Base de Datos', () => {
		it('debe retornar 500 cuando delete falla', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const mockExistingProduct = createMockPrismaProduct()

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindUnique.mockResolvedValue(mockExistingProduct as never)
			mockProductConfigurationFindFirst.mockResolvedValue(null)
			mockPrismaDelete.mockRejectedValue(new Error('Delete failed'))

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'DELETE',
			})

			const params = Promise.resolve({ id: '1' })
			const response = await DELETE(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(500)
			expect(responseData).toEqual({
				data: null,
				error: 'Error al eliminar producto',
			})
		})

		it('debe retornar 404 cuando Prisma lanza error P2025', async () => {
			const mockSession = {
				user: {
					id: '1',
					email: 'admin@example.com',
				},
			}

			const mockExistingProduct = createMockPrismaProduct()

			const prismaError = {
				code: 'P2025',
				meta: {
					cause: 'Record to delete does not exist.',
				},
			}

			mockAuth.mockResolvedValue(mockSession as never)
			mockPrismaFindUnique.mockResolvedValue(mockExistingProduct as never)
			mockProductConfigurationFindFirst.mockResolvedValue(null)
			mockPrismaDelete.mockRejectedValue(prismaError)

			const request = new Request('http://localhost:3000/api/products/1', {
				method: 'DELETE',
			})

			const params = Promise.resolve({ id: '1' })
			const response = await DELETE(request, { params })
			const responseData = await response.json()

			expect(response.status).toBe(404)
			expect(responseData).toEqual({
				data: null,
				error: 'Producto no encontrado',
			})
		})
	})
})
