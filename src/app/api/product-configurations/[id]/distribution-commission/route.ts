import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { createCommissionRuleApiSchema } from '@/features/distribution-commission/lib/commission-rule-schemas'
import { prismaCommissionRuleListToDomain } from '@/features/distribution-commission/mappers/commission-rule.mapper'
import {
	CommissionRuleListResponse,
	CommissionRule,
} from '@/features/distribution-commission/types/commission-rule.types'
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
	}>
}

/**
 * GET /api/product-configurations/[id]/commission-rules
 * List commission rules for a product configuration
 */
export async function GET(
	request: NextRequest,
	props: RouteParams
): Promise<NextResponse<ApiResponse<CommissionRuleListResponse>>> {
	const params = await props.params
	try {
		const productConfigId = parseInt(params.id)
		if (isNaN(productConfigId)) {
			return NextResponse.json(
				{ data: null, error: 'ID de configuración inválido' },
				{ status: 400 }
			)
		}

		const productConfiguration = await prisma.productConfiguration.findUnique({
			where: { id: productConfigId },
			select: { idProductPercentageCommissionNewBusinesses: true },
		})

		if (!productConfiguration) {
			return NextResponse.json(
				{ data: null, error: 'Configuración de producto no encontrada' },
				{ status: 404 }
			)
		}

		const searchParams = request.nextUrl.searchParams
		const page = parseInt(searchParams.get('page') || '1')
		const pageSize = parseInt(searchParams.get('pageSize') || '10')
		const search = searchParams.get('search') || undefined
		const active = searchParams.get('active')

		// Build where clause
		const where: Prisma.ProductPercentageCommissionWhereInput = {
			idProductConfiguration: productConfigId,
		}

		if (search) {
			where.description = {
				contains: search,
				mode: 'insensitive',
			}
		}

		if (active && active !== 'all') {
			where.active = active === 'true'
		}

		// Count total
		const total = await prisma.productPercentageCommission.count({ where })

		// Fetch data
		const rules = await prisma.productPercentageCommission.findMany({
			where,
			skip: (page - 1) * pageSize,
			take: pageSize,
			orderBy: {
				createdAt: 'desc',
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

		const defaultRuleId =
			productConfiguration.idProductPercentageCommissionNewBusinesses

		const domainRules = prismaCommissionRuleListToDomain(rules).map((rule) => ({
			...rule,
			isDefaultForNewBusinesses: rule.id === defaultRuleId,
		}))

		return NextResponse.json({
			data: {
				rules: domainRules,
				pagination: {
					page,
					pageSize,
					total,
					totalPages: Math.ceil(total / pageSize),
				},
			},
		})
	} catch (error) {
		console.error('Error listing commission rules:', error)
		return NextResponse.json(
			{
				data: null,
				error: 'Error interno al obtener las reglas de comisión',
			},
			{ status: 500 }
		)
	}
}

/**
 * POST /api/product-configurations/[id]/commission-rules
 * Create a new commission rule
 */
export async function POST(
	request: NextRequest,
	props: RouteParams
): Promise<NextResponse<ApiResponse<CommissionRule>>> {
	const params = await props.params
	try {
		const session = await auth()
		const headers = request.headers
		const productConfigId = parseInt(params.id)
		if (isNaN(productConfigId)) {
			return NextResponse.json(
				{ data: null, error: 'ID de configuración inválido' },
				{ status: 400 }
			)
		}

		const body = await request.json()

		// Validate input
		const validation = createCommissionRuleApiSchema.safeParse({
			...body,
			idProductConfiguration: productConfigId,
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
		// Use the already declared productConfigId from higher up in the function scope
		// (line 138: const productConfigId = parseInt(params.id))

		// Check if an active distribution already exists
		const existingActive = await prisma.productPercentageCommission.findFirst({
			where: {
				idProductConfiguration: productConfigId,
				active: true,
			},
		})

		if (existingActive) {
			return NextResponse.json(
				{
					data: null,
					error:
						'Ya existe una distribución activa para este producto. Desactívala antes de crear una nueva.',
				},
				{ status: 400 }
			)
		}

		// Create rule transactionally (if categories are present)
		const newRule = await prisma.$transaction(async (tx) => {
			// Create the rule header
			const rule = await tx.productPercentageCommission.create({
				data: {
					idProductConfiguration: data.idProductConfiguration,
					description: data.description,
					active: true,
					hasPortfolio: data.hasPortfolio,
				},
			})

			// Create category entries if any
			if (data.categories && data.categories.length > 0) {
				await tx.productPercentageCommissionCategory.createMany({
					data: data.categories.map((cat) => ({
						idProductPercentageCommission: rule.idProductPercentageCommission,
						idCategory: cat.idCategory,
						porcentajeDistribucion: cat.percentage,
						porcentajePortfolio:
							data.hasPortfolio &&
							cat.portfolioPercentage !== undefined
								? cat.portfolioPercentage
								: null,
						active: true,
					})),
				})
			}

			// Return complete rule with includes
			return tx.productPercentageCommission.findUniqueOrThrow({
				where: {
					idProductPercentageCommission: rule.idProductPercentageCommission,
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
		})

		// Map to domain? We need a single mapper function in mappers/commission-rule.mapper.ts
		// Checking mappers file content from history...
		// Yes, `prismaCommissionRuleToDomain` exists.
		const { prismaCommissionRuleToDomain } = await import(
			'@/features/distribution-commission/mappers/commission-rule.mapper'
		)

		await logAuditEvent({
			userId: session?.user?.id ? parseInt(session.user.id) : undefined,
			action: AuditAction.DISTRIBUTION_COMMISSION_CREATED,
			email: session?.user?.email ?? undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `DistributionCommission ${newRule.idProductPercentageCommission} creada para ProductConfiguration ${productConfigId}`,
		})

		return NextResponse.json({
			data: prismaCommissionRuleToDomain(newRule),
		})
	} catch (error) {
		console.error('Error creating commission rule:', error)
		return NextResponse.json(
			{
				data: null,
				error: 'Error interno al crear la regla de comisión',
			},
			{ status: 500 }
		)
	}
}
