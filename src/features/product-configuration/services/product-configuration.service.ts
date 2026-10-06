import { prisma } from '@/lib/prisma'
import { prismaProductConfigToProductConfig } from '@/features/product-configuration/mappers/product-configuration.mapper'
import type { ProductConfiguration } from '@/features/product-configuration/types/product-configuration.types'
import type { Prisma } from '@prisma/client'
import {
	DefaultDistributionError,
	resolveDefaultDistributionRows,
} from '@/features/distribution-commission/lib/default-distribution-table'

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
 * Returns a product configuration by unique business code, or null if not found.
 */
export async function getProductConfigurationByCode(
	code: string
): Promise<ProductConfiguration | null> {
	const trimmed = code.trim()
	if (!trimmed) {
		return null
	}

	const row = await prisma.productConfiguration.findUnique({
		where: { code: trimmed },
		include: productConfigurationInclude,
	})

	if (!row) {
		return null
	}

	return prismaProductConfigToProductConfig(row)
}

/**
 * Product configuration IDs that have at least one saved
 * `ProductPercentageCommissionCategory` row (distribution setup started).
 */
export async function getProductConfigurationIdsWithCategoryLines(
	ids: readonly number[]
): Promise<Set<number>> {
	if (ids.length === 0) {
		return new Set()
	}

	const rows = await prisma.productPercentageCommissionCategory.findMany({
		where: {
			productPercentageCommission: {
				idProductConfiguration: { in: [...ids] },
			},
		},
		select: {
			productPercentageCommission: {
				select: { idProductConfiguration: true },
			},
		},
	})

	return new Set(
		rows.map((r) => r.productPercentageCommission.idProductConfiguration)
	)
}

/**
 * True when at least one category line exists for any commission rule under this configuration.
 */
export async function isDistributionSetupComplete(
	idProductConfiguration: number
): Promise<boolean> {
	const count = await prisma.productPercentageCommissionCategory.count({
		where: {
			productPercentageCommission: {
				idProductConfiguration,
			},
		},
	})

	return count > 0
}

export interface StructuralProductConfigurationInput {
	readonly idProduct: number
	readonly idLevel: number
	readonly levelCode: string
	readonly code: string
	readonly active: boolean
}

/**
 * Writes the approved default distribution onto a commission rule.
 * Levels outside LEVEL_0–LEVEL_5 are left without lines.
 * Does not update rows that already exist.
 */
export async function writeDefaultDistributionLines(
	tx: Prisma.TransactionClient,
	input: {
		readonly idProductPercentageCommission: number
		readonly configLevelCode: string
	}
): Promise<number> {
	const rows = await resolveDefaultDistributionRows(tx, input.configLevelCode)
	if (!rows || rows.length === 0) {
		return 0
	}

	const receiverCodes = rows.map((row) => row.receiverCode)
	const levels = await tx.level.findMany({
		where: { code: { in: [...receiverCodes] } },
		select: { idLevel: true, code: true },
	})
	const idByCode = new Map(levels.map((level) => [level.code, level.idLevel]))
	const missing = receiverCodes.filter((code) => !idByCode.has(code))
	if (missing.length > 0) {
		throw new DefaultDistributionError(
			`No se pudo aplicar la distribución estándar porque faltan los niveles: ${missing.join(', ')}`
		)
	}

	await tx.productPercentageCommissionCategory.createMany({
		data: rows.map((row) => ({
			idProductPercentageCommission: input.idProductPercentageCommission,
			idLevel: idByCode.get(row.receiverCode) ?? 0,
			porcentajeDistribucion: row.percentage,
			active: true,
		})),
	})

	return rows.length
}

/**
 * Creates one product-level configuration, its commission shell, and the
 * default distribution for LEVEL_0–LEVEL_5.
 */
export async function createStructuralProductConfiguration(
	tx: Prisma.TransactionClient,
	input: StructuralProductConfigurationInput
) {
	const defaultRows = await resolveDefaultDistributionRows(tx, input.levelCode)
	const hasDefaultDistribution = defaultRows !== null && defaultRows.length > 0
	const config = await tx.productConfiguration.create({
		data: {
			idProduct: input.idProduct,
			idLevel: input.idLevel,
			code: input.code,
			active: input.active,
		},
	})

	const ppc = await tx.productPercentageCommission.create({
		data: {
			idProductConfiguration: config.id,
			active: input.active,
			...(hasDefaultDistribution
				? { description: `Distribución estándar ${input.levelCode}` }
				: {}),
		},
	})

	await writeDefaultDistributionLines(tx, {
		idProductPercentageCommission: ppc.idProductPercentageCommission,
		configLevelCode: input.levelCode,
	})

	return tx.productConfiguration.update({
		where: { id: config.id },
		data: {
			idProductPercentageCommissionNewBusinesses:
				ppc.idProductPercentageCommission,
		},
		include: productConfigurationInclude,
	})
}
