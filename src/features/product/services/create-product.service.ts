import type { ContributionType } from '@/features/product/types/product.types'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import {
	BASE_CONFIGURATION_PLAN_STATUS,
	planBaseProductConfigurations,
} from '@/features/product/lib/base-product-configurations'
import {
	PRODUCT_CREATE_ERROR,
	ProductCreateError,
} from '@/features/product/lib/product-create-error'
import { createStructuralProductConfiguration } from '@/features/product-configuration/services/product-configuration.service'
import { DefaultDistributionError } from '@/features/distribution-commission/lib/default-distribution-table'

type ProductWithRelations = Prisma.ProductGetPayload<{
	include: { company: true; typeProduct: true }
}>

export interface CreateProductWithBaseConfigurationsInput {
	readonly name: string
	readonly description: string | null
	readonly idCompany: number
	readonly idTypeProduct: number | null
	readonly status: boolean
	readonly commissionPercentage: number
	readonly contributionType: ContributionType
}

export interface CreatedProductWithBaseConfigurations {
	readonly product: ProductWithRelations
	readonly baseConfigurationCount: number
}

export function normalizeProductName(name: string): string {
	const trimmed = name.trim()
	return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function isUniqueConstraintError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		error.code === 'P2002'
	)
}

/**
 * Creates a product and one structural configuration per active level.
 * The transaction rolls back the product when any configuration cannot be created.
 * Commission category percentages are not seeded.
 */
export async function createProductWithBaseConfigurations(
	input: CreateProductWithBaseConfigurationsInput
): Promise<CreatedProductWithBaseConfigurations> {
	try {
		return await prisma.$transaction(async (tx) => {
			const company = await tx.company.findUnique({
				where: { idCompany: input.idCompany },
				select: { idCompany: true, name: true, status: true },
			})

			if (!company) {
				throw new ProductCreateError(
					PRODUCT_CREATE_ERROR.COMPANY_NOT_FOUND,
					'La compañía seleccionada no existe'
				)
			}

			if (!company.status) {
				throw new ProductCreateError(
					PRODUCT_CREATE_ERROR.COMPANY_INACTIVE,
					'La compañía seleccionada no está activa'
				)
			}

			const normalizedName = normalizeProductName(input.name)
			const duplicate = await tx.product.findFirst({
				where: {
					idCompany: input.idCompany,
					name: {
						equals: input.name.trim(),
						mode: 'insensitive',
					},
				},
			})

			if (duplicate) {
				throw new ProductCreateError(
					PRODUCT_CREATE_ERROR.DUPLICATE_NAME,
					'Ya existe un producto con este nombre para esta compañía'
				)
			}

			const levels = await tx.level.findMany({
				where: { status: true },
				select: { idLevel: true, code: true },
				orderBy: { idLevel: 'asc' },
			})

			if (levels.length === 0) {
				throw new ProductCreateError(
					PRODUCT_CREATE_ERROR.NO_ACTIVE_LEVELS,
					'No hay niveles activos para crear la configuración base del producto'
				)
			}

			const plan = planBaseProductConfigurations({
				companyName: company.name,
				productName: normalizedName,
				levels,
			})

			if (plan.status === BASE_CONFIGURATION_PLAN_STATUS.CODE_TOO_LONG) {
				throw new ProductCreateError(
					PRODUCT_CREATE_ERROR.CODE_TOO_LONG,
					`El código generado "${plan.code}" excede los 50 caracteres permitidos (${plan.code.length} caracteres)`
				)
			}

			const product = await tx.product.create({
				data: {
					name: normalizedName,
					description: input.description,
					idCompany: input.idCompany,
					idTypeProduct: input.idTypeProduct,
					status: input.status,
					commissionPercentage: input.commissionPercentage,
					contributionType: input.contributionType,
				},
				include: {
					company: true,
					typeProduct: true,
				},
			})

			for (const draft of plan.drafts) {
				await createStructuralProductConfiguration(tx, {
					idProduct: product.idProduct,
					idLevel: draft.idLevel,
					levelCode: draft.levelCode,
					code: draft.code,
					active: input.status,
				})
			}

			return {
				product,
				baseConfigurationCount: plan.drafts.length,
			}
		})
	} catch (error) {
		if (error instanceof ProductCreateError) {
			throw error
		}
		if (error instanceof DefaultDistributionError) {
			throw new ProductCreateError(
				PRODUCT_CREATE_ERROR.DEFAULT_DISTRIBUTION_INCOMPLETE,
				error.message
			)
		}
		if (isUniqueConstraintError(error)) {
			throw new ProductCreateError(
				PRODUCT_CREATE_ERROR.DUPLICATE_NAME,
				'Ya existe un producto con este nombre para esta compañía'
			)
		}
		throw error
	}
}
