import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateProductConfigurationSchema } from '@/features/product-configuration/lib/product-configuration-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { ProductConfiguration } from '@/features/product-configuration/types/product-configuration.types'
import { z } from 'zod'
import { prismaProductConfigToProductConfig } from '@/features/product-configuration/mappers/product-configuration.mapper'

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
} as const

/**
 * GET /api/product-configurations/[id]
 * Gets a product configuration by ID
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const config = await prisma.productConfiguration.findUnique({
			where: { id: parseInt(id) },
			include: productConfigurationInclude,
		})

		if (!config) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Configuración de producto no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		const configFormatted = prismaProductConfigToProductConfig(config)

		const response: ApiResponse<ProductConfiguration> = {
			data: configFormatted,
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching product configuration:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener configuración de producto',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * PUT /api/product-configurations/[id]
 * Updates the PPC reference of a product configuration
 */
export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const configId = parseInt(id)
		const body = await request.json()
		const data = updateProductConfigurationSchema.parse(body)

		// Get existing configuration
		const existingConfig = await prisma.productConfiguration.findUnique({
			where: { id: configId },
		})

		if (!existingConfig) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Configuración de producto no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		// Validate PPC belongs to this configuration
		const ppc = await prisma.productPercentageCommission.findUnique({
			where: {
				idProductPercentageCommission:
					data.idProductPercentageCommissionNewBusinesses,
			},
		})

		if (!ppc) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Comisión de porcentaje no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		if (ppc.idProductConfiguration !== configId) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'La comisión de porcentaje no pertenece a esta configuración',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		// Update configuration
		const config = await prisma.productConfiguration.update({
			where: { id: configId },
			data: {
				idProductPercentageCommissionNewBusinesses:
					data.idProductPercentageCommissionNewBusinesses,
			},
			include: productConfigurationInclude,
		})

		const configFormatted = prismaProductConfigToProductConfig(config)

		const response: ApiResponse<ProductConfiguration> = {
			data: configFormatted,
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
					error: 'Configuración de producto no encontrada',
				}
				return NextResponse.json(errorResponse, {
					status: 404,
				})
			}
		}

		console.error('Error updating product configuration:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al actualizar configuración de producto',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * PATCH /api/product-configurations/[id]
 * Toggles the active status of a product configuration
 */
export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const configId = parseInt(id)
		const body = await request.json()

		if (typeof body.active !== 'boolean') {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'El campo active debe ser un valor booleano',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		// Check if configuration exists
		const existingConfig = await prisma.productConfiguration.findUnique({
			where: { id: configId },
		})

		if (!existingConfig) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Configuración de producto no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		// Update active status
		const config = await prisma.productConfiguration.update({
			where: { id: configId },
			data: { active: body.active },
			include: productConfigurationInclude,
		})

		const configFormatted = prismaProductConfigToProductConfig(config)

		const response: ApiResponse<ProductConfiguration> = {
			data: configFormatted,
		}

		return NextResponse.json(response)
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error) {
			if (error.code === 'P2025') {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Configuración de producto no encontrada',
				}
				return NextResponse.json(errorResponse, {
					status: 404,
				})
			}
		}

		console.error('Error toggling product configuration active:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al cambiar estado de configuración de producto',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
