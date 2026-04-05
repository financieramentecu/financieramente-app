import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createProductConfigurationSchema } from '@/features/product-configuration/lib/product-configuration-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	ProductConfigurationListResponse,
	ProductConfiguration,
} from '@/features/product-configuration/types/product-configuration.types'
import { z } from 'zod'
import {
	prismaProductConfigToProductConfig,
	prismaProductConfigListToProductConfigs,
} from '@/features/product-configuration/mappers/product-configuration.mapper'
import { buildProductConfigurationCode } from '@/features/negocios/lib/product-configuration-code'

/**
 * Shared Prisma include for ProductConfiguration queries
 */
const productConfigurationInclude = {
	product: {
		select: {
			idProduct: true,
			name: true,
			company: {
				select: { idCompany: true, name: true },
			},
		},
	},
	clientOrigin: {
		select: { idClientOrigin: true, name: true },
	},
	category: {
		select: { idCategory: true, name: true },
	},
	productPercentageCommissionNewBusinesses: {
		select: {
			idProductPercentageCommission: true,
			description: true,
			active: true,
		},
	},
	productPercentageCommissions: {
		select: {
			idProductPercentageCommission: true,
			description: true,
			active: true,
		},
	},
} as const

/**
 * GET /api/product-configurations
 * Lists product configurations with pagination and search
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const search = searchParams.get('search')
		const active = searchParams.get('active')
		const page = parseInt(searchParams.get('page') || '1')
		const pageSize = parseInt(searchParams.get('pageSize') || '10')

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const where: Record<string, any> = {}

		if (search) {
			where.OR = [
				{ code: { contains: search, mode: 'insensitive' } },
				{
					product: {
						name: { contains: search, mode: 'insensitive' },
					},
				},
				{
					clientOrigin: {
						name: { contains: search, mode: 'insensitive' },
					},
				},
				{
					category: {
						name: { contains: search, mode: 'insensitive' },
					},
				},
			]
		}

		if (active === 'active') {
			where.active = true
		} else if (active === 'inactive') {
			where.active = false
		}

		const total = await prisma.productConfiguration.count({ where })

		const configurations = await prisma.productConfiguration.findMany({
			where,
			include: productConfigurationInclude,
			orderBy: { createdAt: 'desc' },
			skip: (page - 1) * pageSize,
			take: pageSize,
		})

		const configurationsFormatted =
			prismaProductConfigListToProductConfigs(configurations)

		const response: ApiResponse<ProductConfigurationListResponse> = {
			data: {
				configurations: configurationsFormatted,
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
		console.error('Error fetching product configurations:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener configuraciones de producto',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * POST /api/product-configurations
 * Creates a new product configuration with auto-created PPC
 */
export async function POST(request: Request) {
	try {
		const body = await request.json()
		const data = createProductConfigurationSchema.parse(body)

		// Validate product exists and is active
		const product = await prisma.product.findUnique({
			where: { idProduct: data.idProduct },
		})

		if (!product) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Producto no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		if (!product.status) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'El producto seleccionado no está activo',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		// Validate product belongs to company
		if (product.idCompany !== data.idCompany) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error:
					'El producto seleccionado no pertenece a la compañía especificada',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		// Validate clientOrigin exists and is active
		const clientOrigin = await prisma.clientOrigin.findUnique({
			where: { idClientOrigin: data.idClientOrigin },
		})

		if (!clientOrigin) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Origen de cliente no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		if (!clientOrigin.status) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'El origen de cliente seleccionado no está activo',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		// Validate category exists and is active
		const category = await prisma.category.findUnique({
			where: { idCategory: data.idCategory },
		})

		if (!category) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Categoría no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		if (!category.status) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'La categoría seleccionada no está activa',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		// Check uniqueness (product + clientOrigin + category)
		const existingConfig = await prisma.productConfiguration.findUnique({
			where: {
				idProduct_idClientOrigin_idCategory: {
					idProduct: data.idProduct,
					idClientOrigin: data.idClientOrigin,
					idCategory: data.idCategory,
				},
			},
		})

		if (existingConfig) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error:
					'Ya existe una configuración con esta combinación de producto, origen y categoría',
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		// Generate code
		const code = buildProductConfigurationCode(
			product.name,
			clientOrigin.name,
			category.name
		)

		// Validate code length
		if (code.length > 50) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: `El código generado "${code}" excede los 50 caracteres permitidos (${code.length} caracteres)`,
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		// Transactional creation: ProductConfiguration + PPC
		const result = await prisma.$transaction(async (tx) => {
			// Create ProductConfiguration
			const config = await tx.productConfiguration.create({
				data: {
					idProduct: data.idProduct,
					idClientOrigin: data.idClientOrigin,
					idCategory: data.idCategory,
					code,
					active: true,
				},
			})

			// Create ProductPercentageCommission
			const ppc = await tx.productPercentageCommission.create({
				data: {
					idProductConfiguration: config.id,
					active: true,
				},
			})

			// Update ProductConfiguration with PPC reference
			const updatedConfig = await tx.productConfiguration.update({
				where: { id: config.id },
				data: {
					idProductPercentageCommissionNewBusinesses:
						ppc.idProductPercentageCommission,
				},
				include: productConfigurationInclude,
			})

			return updatedConfig
		})

		const configFormatted = prismaProductConfigToProductConfig(result)

		const response: ApiResponse<ProductConfiguration> = {
			data: configFormatted,
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
				error:
					'Ya existe una configuración con esta combinación de producto, origen y categoría',
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		console.error('Error creating product configuration:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al crear configuración de producto',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
