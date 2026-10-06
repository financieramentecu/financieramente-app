import { prisma } from '@/lib/prisma'
import {
	planMissingBaseConfigurations,
	type MissingBaseConfigurationPlan,
} from '@/features/product/lib/base-product-configurations'
import { createStructuralProductConfiguration, writeDefaultDistributionLines } from '@/features/product-configuration/services/product-configuration.service'
import {
	DefaultDistributionError,
	loadConfiguredDefaultLevelCodes,
} from '@/features/distribution-commission/lib/default-distribution-table'

export interface BaseConfigurationRemediationOptions {
	readonly productId?: number
}

export interface BaseConfigurationApplyResult {
	readonly created: number
	readonly skipped: number
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
 * Loads active products and levels, then plans missing base configurations.
 * Existing product-level rows are not modified.
 */
export async function previewMissingBaseConfigurations(
	options: BaseConfigurationRemediationOptions = {}
): Promise<MissingBaseConfigurationPlan> {
	const products = await prisma.product.findMany({
		where: {
			status: true,
			company: { status: true },
			...(options.productId ? { idProduct: options.productId } : {}),
		},
		select: {
			idProduct: true,
			name: true,
			company: { select: { name: true } },
		},
		orderBy: { idProduct: 'asc' },
	})

	const levels = await prisma.level.findMany({
		where: { status: true },
		select: { idLevel: true, code: true },
		orderBy: { idLevel: 'asc' },
	})

	const productIds = products.map((product) => product.idProduct)
	const existingPairs =
		productIds.length === 0
			? []
			: await prisma.productConfiguration.findMany({
					where: { idProduct: { in: productIds } },
					select: { idProduct: true, idLevel: true },
				})

	const existingCodes = await prisma.productConfiguration.findMany({
		select: { code: true },
	})

	return planMissingBaseConfigurations({
		products: products.map((product) => ({
			idProduct: product.idProduct,
			name: product.name,
			companyName: product.company.name,
		})),
		levels,
		existingPairs,
		existingCodes: existingCodes.map((row) => row.code),
	})
}

/**
 * Inserts the planned rows. Re-checks each pair inside the transaction so a
 * second run does not duplicate product-level combinations.
 */
export async function applyMissingBaseConfigurations(
	plan: MissingBaseConfigurationPlan
): Promise<BaseConfigurationApplyResult> {
	return prisma.$transaction(async (tx) => {
		let created = 0
		let skipped = 0

		for (const insert of plan.inserts) {
			const existingPair = await tx.productConfiguration.findUnique({
				where: {
					idProduct_idLevel: {
						idProduct: insert.idProduct,
						idLevel: insert.idLevel,
					},
				},
				select: { id: true },
			})
			if (existingPair) {
				skipped += 1
				continue
			}

			const existingCode = await tx.productConfiguration.findUnique({
				where: { code: insert.code },
				select: { id: true },
			})
			if (existingCode) {
				skipped += 1
				continue
			}

			try {
				await createStructuralProductConfiguration(tx, {
					idProduct: insert.idProduct,
					idLevel: insert.idLevel,
					levelCode: insert.levelCode,
					code: insert.code,
					active: true,
				})
				created += 1
			} catch (error) {
				if (!isUniqueConstraintError(error)) {
					throw error
				}
				skipped += 1
			}
		}

		return { created, skipped }
	})
}

export interface MissingDistributionTarget {
	readonly id: number
	readonly code: string
	readonly levelCode: string
	readonly ppcId: number | null
}

export interface MissingDistributionPreview {
	readonly applicable: readonly MissingDistributionTarget[]
	readonly unsupportedLevel: readonly MissingDistributionTarget[]
}

/**
 * Active configurations of active products that have no distribution lines.
 * LEVEL_0–LEVEL_5 can receive the default table. Other levels are reported only.
 */
export async function previewMissingDefaultDistributions(
	options: BaseConfigurationRemediationOptions = {}
): Promise<MissingDistributionPreview> {
	const configs = await prisma.productConfiguration.findMany({
		where: {
			active: true,
			...(options.productId ? { idProduct: options.productId } : {}),
			product: { status: true, company: { status: true } },
			productPercentageCommissions: {
				none: {
					productPercentageCommissionCategories: { some: {} },
				},
			},
		},
		select: {
			id: true,
			code: true,
			idProductPercentageCommissionNewBusinesses: true,
			level: { select: { code: true } },
			productPercentageCommissions: {
				where: { active: true },
				select: { idProductPercentageCommission: true },
				orderBy: { idProductPercentageCommission: 'asc' },
				take: 1,
			},
		},
		orderBy: { id: 'asc' },
	})

	const applicable: MissingDistributionTarget[] = []
	const unsupportedLevel: MissingDistributionTarget[] = []
	const configuredLevels = await loadConfiguredDefaultLevelCodes(prisma)

	for (const config of configs) {
		const target: MissingDistributionTarget = {
			id: config.id,
			code: config.code,
			levelCode: config.level.code,
			ppcId:
				config.idProductPercentageCommissionNewBusinesses ??
				config.productPercentageCommissions[0]?.idProductPercentageCommission ??
				null,
		}
		if (configuredLevels.has(config.level.code)) {
			applicable.push(target)
		} else {
			unsupportedLevel.push(target)
		}
	}

	return { applicable, unsupportedLevel }
}

/**
 * Fills the default distribution only where no category line exists.
 * Existing percentages are left unchanged.
 */
export async function applyDefaultDistributionsWhereMissing(
	preview: MissingDistributionPreview
): Promise<{ filled: number; skipped: number }> {
	let filled = 0
	let skipped = 0

	for (const target of preview.applicable) {
		try {
			const wrote = await prisma.$transaction(async (tx) => {
				const existingLines = await tx.productPercentageCommissionCategory.count({
					where: {
						productPercentageCommission: {
							idProductConfiguration: target.id,
						},
					},
				})
				if (existingLines > 0) {
					return 0
				}

				let ppcId = target.ppcId
				if (ppcId === null) {
					const ppc = await tx.productPercentageCommission.create({
						data: {
							idProductConfiguration: target.id,
							active: true,
							description: `Distribución estándar ${target.levelCode}`,
						},
					})
					ppcId = ppc.idProductPercentageCommission
					await tx.productConfiguration.update({
						where: { id: target.id },
						data: {
							idProductPercentageCommissionNewBusinesses: ppcId,
						},
					})
				}

				return writeDefaultDistributionLines(tx, {
					idProductPercentageCommission: ppcId,
					configLevelCode: target.levelCode,
				})
			})

			if (wrote > 0) {
				filled += 1
			} else {
				skipped += 1
			}
		} catch (error) {
			if (error instanceof DefaultDistributionError) {
				skipped += 1
				continue
			}
			throw error
		}
	}

	return { filled, skipped }
}
