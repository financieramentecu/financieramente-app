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
import {
	createStructuralProductConfiguration,
	getProductConfigurationIdsWithCategoryLines,
} from '@/features/product-configuration/services/product-configuration.service'
import { buildProductConfigurationListWhere } from '@/features/product-configuration/lib/product-configuration-list-where'
import { DefaultDistributionError } from '@/features/distribution-commission/lib/default-distribution-table'
import { auth } from '@/auth'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'

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
	level: {
		select: { idLevel: true, name: true, code: true },
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
		const eligible = searchParams.get('eligible') === 'true'
		const page = parseInt(searchParams.get('page') || '1')
		const pageSize = parseInt(searchParams.get('pageSize') || '10')

		const where = buildProductConfigurationListWhere({
			search,
			active,
			eligible,
		})

		const total = await prisma.productConfiguration.count({ where })

		const configurations = await prisma.productConfiguration.findMany({
			where,
			include: productConfigurationInclude,
			orderBy: { createdAt: 'desc' },
			skip: (page - 1) * pageSize,
			take: pageSize,
		})

		const configurationsMapped =
			prismaProductConfigListToProductConfigs(configurations)

		// Second query to determine distribution setup status per configuration.
		// Currently 2 queries total (not N+1). If the list grows significantly,
		// consider consolidating with a Prisma `groupBy` or a sub-select inside
		// the main `findMany` include to reduce to a single round-trip.
		const listIds = configurationsMapped.map((c) => c.id)
		const idsWithCategoryLines =
			await getProductConfigurationIdsWithCategoryLines(listIds)
		const configurationsFormatted = configurationsMapped.map((c) => ({
			...c,
			distributionSetupIncomplete: !idsWithCategoryLines.has(c.id),
		}))

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
		const session = await auth()
		const headers = request.headers
		const body = await request.json()
		const data = createProductConfigurationSchema.parse(body)

		// Validate product exists and is active
		const product = await prisma.product.findUnique({
			where: { idProduct: data.idProduct },
			include: { company: true },
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

		// Validate level exists and is active
		const level = await prisma.level.findUnique({
			where: { idLevel: data.idLevel },
		})

		if (!level) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Nivel no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		if (!level.status) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'El nivel seleccionado no está activo',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		// Check uniqueness (product + level)
		const existingConfig = await prisma.productConfiguration.findUnique({
			where: {
				idProduct_idLevel: {
					idProduct: data.idProduct,
					idLevel: data.idLevel,
				},
			},
		})

		if (existingConfig) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error:
					'Ya existe una configuración con esta combinación de producto y nivel',
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		// Generate code
		const code = buildProductConfigurationCode(
			product.company.name,
			product.name,
			level.code
		)

		// Validate code length
		if (code.length > 50) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: `El código generado "${code}" excede los 50 caracteres permitidos (${code.length} caracteres)`,
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		const result = await prisma.$transaction((tx) =>
			createStructuralProductConfiguration(tx, {
				idProduct: data.idProduct,
				idLevel: data.idLevel,
				levelCode: level.code,
				code,
				active: true,
			})
		)

		await logAuditEvent({
			userId: session?.user?.id ? parseInt(session.user.id) : undefined,
			action: AuditAction.PRODUCT_CONFIGURATION_CREATED,
			email: session?.user?.email ?? undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `ProductConfiguration ${result.id} creada: producto=${data.idProduct}, nivel=${data.idLevel}, código=${result.code}`,
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

		if (error instanceof DefaultDistributionError) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: error.message,
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
					'Ya existe una configuración con esta combinación de producto y nivel',
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
