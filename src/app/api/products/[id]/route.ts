import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateProductSchema } from '@/features/product/lib/product-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { Product } from '@/features/product/types/product.types'
import { z } from 'zod'
import { auth } from '@/auth'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'
import { prismaProductToProduct } from '@/features/product/mappers/product.mapper'

/**
 * GET /api/products/[id]
 * Obtiene un producto por ID
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const product = await prisma.product.findUnique({
			where: { idProduct: parseInt(id) },
			include: {
				company: true,
			},
		})

		if (!product) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Producto no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		const productFormatted = prismaProductToProduct(product)

		const response: ApiResponse<Product> = {
			data: productFormatted,
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching product:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener producto',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * PUT /api/products/[id]
 * Actualiza un producto existente
 */
export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await auth()
		if (!session?.user) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'No autorizado',
			}
			return NextResponse.json(errorResponse, { status: 401 })
		}

		const { id } = await params
		const productId = parseInt(id)
		const body = await request.json()
		const data = updateProductSchema.parse(body)

		// Obtener producto actual para comparar cambios
		const existingProduct = await prisma.product.findUnique({
			where: { idProduct: productId },
			include: {
				company: true,
			},
		})

		if (!existingProduct) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Producto no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		// Validar unicidad de nombre por compañía si se está cambiando
		const targetCompanyId = data.idCompany ?? existingProduct.idCompany
		const normalizedName = data.name?.trim()

		if (
			normalizedName &&
			(normalizedName.toLowerCase() !== existingProduct.name.toLowerCase() ||
				targetCompanyId !== existingProduct.idCompany)
		) {


			const duplicateProduct = await prisma.product.findFirst({
				where: {
					idCompany: targetCompanyId,
					name: {
						equals: normalizedName,
						mode: 'insensitive',
					},
					NOT: {
						idProduct: productId,
					},
				},
			})

			if (duplicateProduct) {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Ya existe un producto con este nombre para esta compañía',
				}
				return NextResponse.json(errorResponse, { status: 409 })
			}
		}

		// Validar impacto al cambiar estado a Inactivo
		if (data.status === false && existingProduct.status === true) {
			// Verificar si el producto está siendo utilizado en ProductPercentajeCommision
			const productInUse = await prisma.productPercentajeCommision.findFirst({
				where: {
					idProduct: productId,
				},
			})

			if (productInUse) {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error:
						'Este producto está siendo utilizado en configuraciones de distribución comisional. No se puede desactivar.',
				}
				return NextResponse.json(errorResponse, { status: 409 })
			}
		}

		// Preparar datos para actualizar
		const updateData: {
			name?: string
			idCompany?: number
			status?: boolean
		} = {}

		if (data.name !== undefined) {
			const capitalizedName =
				data.name.trim().charAt(0).toUpperCase() + data.name.trim().slice(1)
			updateData.name = capitalizedName
		}

		if (data.idCompany !== undefined) {
			updateData.idCompany = data.idCompany
		}

		if (data.status !== undefined) {
			updateData.status = data.status
		}

		// Actualizar producto
		const product = await prisma.product.update({
			where: { idProduct: productId },
			data: updateData,
			include: {
				company: true,
			},
		})

		// Registrar auditoría
		const userId = session.user.id ? parseInt(session.user.id) : undefined
		const headers = request.headers
		const changes: string[] = []

		if (data.name && data.name !== existingProduct.name) {
			changes.push(`Nombre: "${existingProduct.name}" → "${data.name}"`)
		}

		if (data.idCompany && data.idCompany !== existingProduct.idCompany) {
			changes.push(
				`Compañía: "${existingProduct.company.name}" → ID ${data.idCompany}`
			)
		}

		if (data.status !== undefined && data.status !== existingProduct.status) {
			changes.push(
				`Estado: ${existingProduct.status ? 'Activo' : 'Inactivo'} → ${data.status ? 'Activo' : 'Inactivo'}`
			)
		}

		await logAuditEvent({
			userId,
			action: AuditAction.PRODUCT_UPDATED,
			email: session.user.email || undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Producto actualizado: ${product.name} (ID: ${product.idProduct}, Compañía: ${product.company.name}). ${changes.length > 0 ? changes.join(', ') : 'Sin cambios'}`,
		})

		const productFormatted = prismaProductToProduct(product)

		const response: ApiResponse<Product> = {
			data: productFormatted,
		}

		return NextResponse.json(response)
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: error.issues[0]?.message || 'Datos inválidos',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		if (error && typeof error === 'object' && 'code' in error) {
			if (error.code === 'P2025') {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Producto no encontrado',
				}
				return NextResponse.json(errorResponse, { status: 404 })
			}

			if (error.code === 'P2002') {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Ya existe un producto con este nombre para esta compañía',
				}
				return NextResponse.json(errorResponse, { status: 409 })
			}
		}

		console.error('Error updating product:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al actualizar producto',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * DELETE /api/products/[id]
 * Elimina un producto
 */
export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await auth()
		if (!session?.user) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'No autorizado',
			}
			return NextResponse.json(errorResponse, { status: 401 })
		}

		const { id } = await params
		const productId = parseInt(id)

		// Verificar si el producto existe
		const existingProduct = await prisma.product.findUnique({
			where: { idProduct: productId },
			include: {
				company: true,
			},
		})

		if (!existingProduct) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Producto no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		// Verificar si el producto está siendo utilizado en ProductPercentajeCommision
		const productInUse = await prisma.productPercentajeCommision.findFirst({
			where: {
				idProduct: productId,
			},
		})

		if (productInUse) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error:
					'Este producto está siendo utilizado en configuraciones de distribución comisional. No se puede eliminar.',
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		// Eliminar producto
		await prisma.product.delete({
			where: { idProduct: productId },
		})

		// Registrar auditoría
		const userId = session.user.id ? parseInt(session.user.id) : undefined
		const headers = request.headers
		await logAuditEvent({
			userId,
			action: AuditAction.PRODUCT_DELETED,
			email: session.user.email || undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Producto eliminado: ${existingProduct.name} (ID: ${existingProduct.idProduct}, Compañía: ${existingProduct.company.name})`,
		})

		const response: ApiResponse<void> = {
			data: undefined,
		}

		return NextResponse.json(response)
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'P2025'
		) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Producto no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		console.error('Error deleting product:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al eliminar producto',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
