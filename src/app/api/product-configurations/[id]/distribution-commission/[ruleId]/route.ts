import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateCommissionRuleApiSchema } from '@/features/distribution-commission/lib/commission-rule-schemas'
import { prismaCommissionRuleToDomain } from '@/features/distribution-commission/mappers/commission-rule.mapper'
import { CommissionRule } from '@/features/distribution-commission/types/commission-rule.types'
import { ApiResponse } from '@/features/shared/types/api-response.types'
import { auth } from '@/auth'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'

export const dynamic = 'force-dynamic'

interface RouteParams {
	params: Promise<{
		id: string
		ruleId: string
	}>
}

/**
 * GET /api/product-configurations/[id]/commission-rules/[ruleId]
 * Get a specific commission rule
 */
export async function GET(
	request: NextRequest,
	props: RouteParams
): Promise<NextResponse<ApiResponse<CommissionRule>>> {
	const params = await props.params
	try {
		const productConfigId = parseInt(params.id)
		const ruleId = parseInt(params.ruleId)

		if (isNaN(productConfigId) || isNaN(ruleId)) {
			return NextResponse.json(
				{ data: null, error: 'IDs inválidos' },
				{ status: 400 }
			)
		}

		console.log(`Fetching rule ${ruleId} for product config ${productConfigId}`)

		const rule = await prisma.productPercentageCommission.findUnique({
			where: {
				idProductPercentageCommission: ruleId,
				idProductConfiguration: productConfigId, // Ensure it belongs to this config
			},
			include: {
				productPercentageCommissionCategories: {
					include: {
						category: {
							select: {
								idCategory: true,
								name: true,
							},
						},
					},
				},
			},
		})

		if (!rule) {
			return NextResponse.json(
				{ data: null, error: 'Regla de comisión no encontrada' },
				{ status: 404 }
			)
		}

		return NextResponse.json({
			data: prismaCommissionRuleToDomain(rule),
		})
	} catch (error) {
		console.error('Error fetching commission rule:', error)
		return NextResponse.json(
			{
				data: null,
				error: 'Error interno al obtener la regla de comisión',
			},
			{ status: 500 }
		)
	}
}

/**
 * PUT /api/product-configurations/[id]/commission-rules/[ruleId]
 * Update a commission rule
 */
export async function PUT(
	request: NextRequest,
	props: RouteParams
): Promise<NextResponse<ApiResponse<CommissionRule>>> {
	const params = await props.params
	try {
		const session = await auth()
		const headers = request.headers
		const productConfigId = parseInt(params.id)
		const ruleId = parseInt(params.ruleId)

		if (isNaN(productConfigId) || isNaN(ruleId)) {
			return NextResponse.json(
				{ data: null, error: 'IDs inválidos' },
				{ status: 400 }
			)
		}

		const body = await request.json()

		// Validate input
		const validation = updateCommissionRuleApiSchema.safeParse({
			...body,
			idProductPercentageCommission: ruleId,
		})

		if (!validation.success) {
			return NextResponse.json(
				{
					data: null,
					error: validation.error.issues[0].message,
				},
				{ status: 400 }
			)
		}

		const data = validation.data

		// Transaction for updating rule and categories
		const updatedRule = await prisma.$transaction(async (tx) => {
			// Check existence and ownership
			const existingRule = await tx.productPercentageCommission.findUnique({
				where: { idProductPercentageCommission: ruleId },
			})

			if (
				!existingRule ||
				existingRule.idProductConfiguration !== productConfigId
			) {
				throw new Error('Regla no encontrada o no pertenece a la configuración')
			}

			const previousCategories =
				data.categories !== undefined
					? await tx.productPercentageCommissionCategory.findMany({
							where: { idProductPercentageCommission: ruleId },
							select: {
								idCategory: true,
								porcentajePortfolio: true,
							},
						})
					: []

			const portfolioByCategory = new Map<
				number,
				(typeof previousCategories)[0]['porcentajePortfolio']
			>()
			for (const row of previousCategories) {
				portfolioByCategory.set(row.idCategory, row.porcentajePortfolio)
			}

			const effectiveHasPortfolio =
				data.hasPortfolio !== undefined
					? data.hasPortfolio
					: existingRule.hasPortfolio

			// Update header
			await tx.productPercentageCommission.update({
				where: { idProductPercentageCommission: ruleId },
				data: {
					description: data.description,
					active: data.active,
					...(data.hasPortfolio !== undefined
						? { hasPortfolio: data.hasPortfolio }
						: {}),
				},
			})

			// Update categories if provided
			if (data.categories) {
				// Delete existing categories
				await tx.productPercentageCommissionCategory.deleteMany({
					where: { idProductPercentageCommission: ruleId },
				})

				// Create new categories
				if (data.categories.length > 0) {
					await tx.productPercentageCommissionCategory.createMany({
						data: data.categories.map((cat) => ({
							idProductPercentageCommission: ruleId,
							idCategory: cat.idCategory,
							porcentajeDistribucion: cat.percentage,
							porcentajePortfolio: effectiveHasPortfolio
								? cat.portfolioPercentage !== undefined &&
									cat.portfolioPercentage !== null
									? cat.portfolioPercentage
									: (portfolioByCategory.get(cat.idCategory) ?? null)
								: (portfolioByCategory.get(cat.idCategory) ?? null),
							active: true,
						})),
					})
				}
			}

			// Return updated rule with includes
			return tx.productPercentageCommission.findUniqueOrThrow({
				where: { idProductPercentageCommission: ruleId },
				include: {
					productPercentageCommissionCategories: {
						include: {
							category: {
								select: {
									idCategory: true,
									name: true,
								},
							},
						},
					},
				},
			})
		})

		await logAuditEvent({
			userId: session?.user?.id ? parseInt(session.user.id) : undefined,
			action: AuditAction.DISTRIBUTION_COMMISSION_UPDATED,
			email: session?.user?.email ?? undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `DistributionCommission ${ruleId} actualizada para ProductConfiguration ${productConfigId}`,
		})

		return NextResponse.json({
			data: prismaCommissionRuleToDomain(updatedRule),
		})
	} catch (error) {
		console.error('Error updating commission rule:', error)
		if (
			error instanceof Error &&
			error.message === 'Regla no encontrada o no pertenece a la configuración'
		) {
			return NextResponse.json(
				{ data: null, error: error.message },
				{ status: 404 }
			)
		}
		return NextResponse.json(
			{
				data: null,
				error: 'Error interno al actualizar la regla de comisión',
			},
			{ status: 500 }
		)
	}
}

/**
 * PATCH /api/product-configurations/[id]/commission-rules/[ruleId]
 * Toggle active status
 */
export async function PATCH(
	request: NextRequest,
	props: RouteParams
): Promise<NextResponse<ApiResponse<CommissionRule>>> {
	const params = await props.params
	try {
		const session = await auth()
		const headers = request.headers
		const productConfigId = parseInt(params.id)
		const ruleId = parseInt(params.ruleId)

		if (isNaN(productConfigId) || isNaN(ruleId)) {
			return NextResponse.json(
				{ data: null, error: 'IDs inválidos' },
				{ status: 400 }
			)
		}

		const body = await request.json()
		const active = body.active

		if (typeof active !== 'boolean') {
			return NextResponse.json(
				{
					data: null,
					error: 'El campo active es requerido y debe ser booleano',
				},
				{ status: 400 }
			)
		}

		const existingRule = await prisma.productPercentageCommission.findFirst({
			where: {
				idProductPercentageCommission: ruleId,
				idProductConfiguration: productConfigId,
			},
			select: {
				idProductPercentageCommission: true,
				active: true,
			},
		})

		if (!existingRule) {
			return NextResponse.json(
				{ data: null, error: 'Regla de comisión no encontrada' },
				{ status: 404 }
			)
		}

		// Validation: If activating, check if another distribution is already active
		if (active) {
			const anotherActive = await prisma.productPercentageCommission.findFirst({
				where: {
					idProductConfiguration: productConfigId,
					active: true,
					idProductPercentageCommission: { not: ruleId },
				},
				select: { description: true },
			})

			if (anotherActive) {
				return NextResponse.json(
					{
						data: null,
						error: `Ya existe una distribución activa: ${
							anotherActive.description || 'Sin descripción'
						}.`,
					},
					{ status: 409 }
				)
			}
		}

		if (!active) {
			const businessCount = await prisma.business.count({
				where: { idProductPercentageCommission: ruleId },
			})

			if (businessCount > 0) {
				return NextResponse.json(
					{
						data: null,
						error:
							'No se puede desactivar: existen negocios asociados a esta regla',
					},
					{ status: 409 }
				)
			}
		}

		const updatedRule = await prisma.productPercentageCommission.update({
			where: {
				idProductPercentageCommission: ruleId,
			},
			data: {
				active,
			},
			include: {
				productPercentageCommissionCategories: {
					include: {
						category: {
							select: {
								idCategory: true,
								name: true,
							},
						},
					},
				},
			},
		})

		await logAuditEvent({
			userId: session?.user?.id ? parseInt(session.user.id) : undefined,
			action: active
				? AuditAction.DISTRIBUTION_COMMISSION_ACTIVATED
				: AuditAction.DISTRIBUTION_COMMISSION_DEACTIVATED,
			email: session?.user?.email ?? undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `DistributionCommission ${ruleId} ${active ? 'activada' : 'desactivada'} para ProductConfiguration ${productConfigId}`,
		})

		return NextResponse.json({
			data: prismaCommissionRuleToDomain(updatedRule),
		})
	} catch (error) {
		console.error('Error toggling commission rule status:', error)
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'P2025'
		) {
			return NextResponse.json(
				{ data: null, error: 'Regla de comisión no encontrada' },
				{ status: 404 }
			)
		}
		return NextResponse.json(
			{
				data: null,
				error: 'Error interno al cambiar estado de la regla',
			},
			{ status: 500 }
		)
	}
}
