import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createProductSchema } from '@/features/product/lib/product-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	ProductListResponse,
	Product,
} from '@/features/product/types/product.types'
import { z } from 'zod'
import { auth } from '@/auth'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'
import {
	prismaProductToProduct,
	prismaProductListToProducts,
} from '@/features/product/mappers/product.mapper'

/**
 * GET /api/products
 * Lista productos con paginación y búsqueda
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const search = searchParams.get('search')
		const status = searchParams.get('status')
		const idCompany = searchParams.get('idCompany')
		const page = parseInt(searchParams.get('page') || '1')
		const pageSize = parseInt(searchParams.get('pageSize') || '10')

		const where: {
			OR?: Array<{
				name?: { contains: string; mode: 'insensitive' }
				company?: { name?: { contains: string; mode: 'insensitive' } }
			}>
			status?: boolean
			idCompany?: number
		} = {}

		if (search) {
			where.OR = [
				{ name: { contains: search, mode: 'insensitive' } },
				{ company: { name: { contains: search, mode: 'insensitive' } } },
			]
		}

		if (status === 'active') {
			where.status = true
		} else if (status === 'inactive') {
			where.status = false
		}

		if (idCompany) {
			const companyId = parseInt(idCompany)
			if (!isNaN(companyId)) {
				where.idCompany = companyId
			}
		}

		// Contar total de registros
		const total = await prisma.product.count({ where })

		// Obtener productos con paginación
		const products = await prisma.product.findMany({
			where,
			include: {
				company: true,
				typeProduct: true,
			},
			orderBy: { name: 'asc' },
			skip: (page - 1) * pageSize,
			take: pageSize,
		})

		// Transformar usando mapper
		const productsFormatted = prismaProductListToProducts(products)

		const response: ApiResponse<ProductListResponse> = {
			data: {
				products: productsFormatted,
				pagination: {
					page,
					pageSize,
					total,
					totalPages: Math.ceil(total / pageSize),
				},
			},
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching products:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener productos',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * POST /api/products
 * Crea un nuevo producto
 */
export async function POST(request: Request) {
	try {
		const session = await auth()
		if (!session?.user) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'No autorizado',
			}
			return NextResponse.json(errorResponse, { status: 401 })
		}

		const body = await request.json()
		const data = createProductSchema.parse(body)

		// Normalizar nombre (trim y capitalizar primera letra)
		const normalizedName = data.name.trim()
		const capitalizedName =
			normalizedName.charAt(0).toUpperCase() + normalizedName.slice(1)

		// Validar unicidad de nombre por compañía (case-insensitive)
		const existingProduct = await prisma.product.findFirst({
			where: {
				idCompany: data.idCompany,
				name: {
					equals: normalizedName,
					mode: 'insensitive',
				},
			},
		})

		if (existingProduct) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Ya existe un producto con este nombre para esta compañía',
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		// Crear producto
		const product = await prisma.product.create({
			data: {
				name: capitalizedName,
				description: data.description ?? null,
				idCompany: data.idCompany,
				idTypeProduct: data.idTypeProduct ?? null,
				status: data.status,
				commissionPercentage: data.commissionPercentage,
				contributionType: data.contributionType,
			},
			include: {
				company: true,
				typeProduct: true,
			},
		})

		// Registrar auditoría
		const userId = session.user.id ? parseInt(session.user.id) : undefined
		const headers = request.headers
		await logAuditEvent({
			userId,
			action: AuditAction.PRODUCT_CREATED,
			email: session.user.email || undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Producto creado: ${product.name} (ID: ${product.idProduct}, Compañía: ${product.company.name})`,
		})

		// Transformar usando mapper
		const productFormatted = prismaProductToProduct(product)

		const response: ApiResponse<Product> = {
			data: productFormatted,
		}

		return NextResponse.json(response, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: error.issues[0]?.message || 'Datos inválidos',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'P2002'
		) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Ya existe un producto con este nombre para esta compañía',
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		console.error('Error creating product:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al crear producto',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
