import { buildProductConfigurationCode } from '@/features/negocios/lib/product-configuration-code'

/** Matches `ProductConfiguration.code` @db.VarChar(50). */
export const PRODUCT_CONFIGURATION_CODE_MAX_LENGTH = 50

export interface BaseConfigurationLevel {
	readonly idLevel: number
	readonly code: string
}

export interface PlannedBaseConfiguration {
	readonly idLevel: number
	readonly levelCode: string
	readonly code: string
}

export const BASE_CONFIGURATION_PLAN_STATUS = {
	OK: 'ok',
	CODE_TOO_LONG: 'code_too_long',
} as const

export type BaseConfigurationPlan =
	| {
			readonly status: typeof BASE_CONFIGURATION_PLAN_STATUS.OK
			readonly drafts: readonly PlannedBaseConfiguration[]
	  }
	| {
			readonly status: typeof BASE_CONFIGURATION_PLAN_STATUS.CODE_TOO_LONG
			readonly code: string
			readonly levelCode: string
	  }

/**
 * Builds one configuration code per active level.
 * Fails the whole plan when any code exceeds the column length.
 */
export function planBaseProductConfigurations(input: {
	readonly companyName: string
	readonly productName: string
	readonly levels: readonly BaseConfigurationLevel[]
}): BaseConfigurationPlan {
	const drafts: PlannedBaseConfiguration[] = []

	for (const level of input.levels) {
		const code = buildProductConfigurationCode(
			input.companyName,
			input.productName,
			level.code
		)
		if (code.length > PRODUCT_CONFIGURATION_CODE_MAX_LENGTH) {
			return {
				status: BASE_CONFIGURATION_PLAN_STATUS.CODE_TOO_LONG,
				code,
				levelCode: level.code,
			}
		}
		drafts.push({
			idLevel: level.idLevel,
			levelCode: level.code,
			code,
		})
	}

	return { status: BASE_CONFIGURATION_PLAN_STATUS.OK, drafts }
}

export interface RemediationProduct {
	readonly idProduct: number
	readonly name: string
	readonly companyName: string
}

export interface ExistingConfigurationPair {
	readonly idProduct: number
	readonly idLevel: number
}

export interface BaseConfigurationInsert {
	readonly idProduct: number
	readonly idLevel: number
	readonly code: string
	readonly productName: string
	readonly companyName: string
	readonly levelCode: string
}

export const REMEDIATION_PROBLEM = {
	CODE_TOO_LONG: 'CODE_TOO_LONG',
	CODE_COLLISION: 'CODE_COLLISION',
} as const

export type RemediationProblemCode =
	(typeof REMEDIATION_PROBLEM)[keyof typeof REMEDIATION_PROBLEM]

export interface RemediationProblem {
	readonly idProduct: number
	readonly idLevel: number
	readonly code: RemediationProblemCode
	readonly detail: string
}

export interface MissingBaseConfigurationPlan {
	readonly inserts: readonly BaseConfigurationInsert[]
	readonly skippedExisting: number
	readonly problems: readonly RemediationProblem[]
}

function pairKey(idProduct: number, idLevel: number): string {
	return `${idProduct}:${idLevel}`
}

/**
 * Plans missing product-level rows for active products.
 * Existing pairs are left untouched, including inactive historical rows.
 */
export function planMissingBaseConfigurations(input: {
	readonly products: readonly RemediationProduct[]
	readonly levels: readonly BaseConfigurationLevel[]
	readonly existingPairs: readonly ExistingConfigurationPair[]
	readonly existingCodes: readonly string[]
}): MissingBaseConfigurationPlan {
	const occupiedPairs = new Set(
		input.existingPairs.map((pair) => pairKey(pair.idProduct, pair.idLevel))
	)
	const occupiedCodes = new Set(input.existingCodes)
	const inserts: BaseConfigurationInsert[] = []
	const problems: RemediationProblem[] = []
	let skippedExisting = 0

	for (const product of input.products) {
		for (const level of input.levels) {
			if (occupiedPairs.has(pairKey(product.idProduct, level.idLevel))) {
				skippedExisting += 1
				continue
			}

			const planned = planBaseProductConfigurations({
				companyName: product.companyName,
				productName: product.name,
				levels: [level],
			})

			if (planned.status === BASE_CONFIGURATION_PLAN_STATUS.CODE_TOO_LONG) {
				problems.push({
					idProduct: product.idProduct,
					idLevel: level.idLevel,
					code: REMEDIATION_PROBLEM.CODE_TOO_LONG,
					detail: planned.code,
				})
				continue
			}

			const draft = planned.drafts[0]
			if (!draft) {
				continue
			}

			if (occupiedCodes.has(draft.code)) {
				problems.push({
					idProduct: product.idProduct,
					idLevel: level.idLevel,
					code: REMEDIATION_PROBLEM.CODE_COLLISION,
					detail: draft.code,
				})
				continue
			}

			occupiedCodes.add(draft.code)
			occupiedPairs.add(pairKey(product.idProduct, level.idLevel))
			inserts.push({
				idProduct: product.idProduct,
				idLevel: level.idLevel,
				code: draft.code,
				productName: product.name,
				companyName: product.companyName,
				levelCode: level.code,
			})
		}
	}

	return { inserts, skippedExisting, problems }
}
