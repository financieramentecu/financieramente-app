import { z } from 'zod'

/** Mensaje único para UI + validación Zod (suma de líneas > 100 %) */
export const COMMISSION_RULE_CATEGORIES_SUM_MAX_MESSAGE =
	'La suma de porcentajes por categoría no puede superar 100'

export const COMMISSION_RULE_PORTFOLIO_SUM_MAX_MESSAGE =
	'La suma de porcentajes de cartera no puede superar 100'

const descriptionSchema = z
	.string()
	.max(255, 'La descripción no puede exceder 255 caracteres')
	.optional()

const percentageSchema = z.coerce
	.number({ message: 'El porcentaje debe ser un número' })
	.min(1, 'El porcentaje debe ser al menos 1')
	.max(100, 'El porcentaje no puede exceder 100')

const emptyToUndefined = (v: unknown) =>
	v === '' || v === null || v === undefined ? undefined : v

const optionalPortfolioPercentageSchema = z.preprocess(
	emptyToUndefined,
	z.coerce.number().optional()
)

// Category line (form): distribution + optional portfolio (validated when hasPortfolio)
export const categoryPercentageSchema = z.object({
	idCategory: z
		.number()
		.int('Categoría inválida')
		.positive('Categoría inválida'),
	percentage: percentageSchema,
	portfolioPercentage: optionalPortfolioPercentageSchema,
})

function refineDuplicateCategoriesAndDistributionSum(
	items: z.infer<typeof categoryPercentageSchema>[],
	ctx: z.RefinementCtx,
	pathPrefix: (string | number)[]
) {
	const seen = new Set<number>()
	items.forEach((item, index) => {
		if (item.idCategory && seen.has(item.idCategory)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Categoría duplicada en la regla',
				path: [...pathPrefix, index, 'idCategory'],
			})
		}
		if (item.idCategory) {
			seen.add(item.idCategory)
		}
	})

	const sum = items.reduce((acc, item) => acc + item.percentage, 0)
	if (sum > 100 + 1e-6) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: COMMISSION_RULE_CATEGORIES_SUM_MAX_MESSAGE,
			path: pathPrefix.length ? [...pathPrefix] : [],
		})
	}
}

function refinePortfolioWhenFlagOn(
	hasPortfolio: boolean,
	items: z.infer<typeof categoryPercentageSchema>[],
	ctx: z.RefinementCtx,
	pathPrefix: (string | number)[]
) {
	if (!hasPortfolio || items.length === 0) return

	let sum = 0
	for (let i = 0; i < items.length; i++) {
		const p = items[i].portfolioPercentage
		if (p === undefined || Number.isNaN(p)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					'El porcentaje de cartera es obligatorio cuando la cartera está activa',
				path: [...pathPrefix, i, 'portfolioPercentage'],
			})
			continue
		}
		if (p < 1 || p > 100) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'El porcentaje de cartera debe estar entre 1 y 100',
				path: [...pathPrefix, i, 'portfolioPercentage'],
			})
		}
		sum += p
	}
	if (sum > 100 + 1e-6) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: COMMISSION_RULE_PORTFOLIO_SUM_MAX_MESSAGE,
			path: pathPrefix.length ? [...pathPrefix] : [],
		})
	}
}

const categoryLinesSchema = z
	.array(categoryPercentageSchema)
	.superRefine((items, ctx) =>
		refineDuplicateCategoriesAndDistributionSum(items, ctx, [])
	)

const categoryLinesSchemaWithDefaults = z.preprocess(
	(value) => (Array.isArray(value) ? value : []),
	categoryLinesSchema
)

// Create Commission Rule Schema (Form)
export const createCommissionRuleSchema = z
	.object({
		idProductConfiguration: z
			.number()
			.int()
			.positive('Configuración de producto inválida'),
		description: descriptionSchema,
		hasPortfolio: z.boolean().default(false),
		categories: categoryLinesSchemaWithDefaults,
	})
	.superRefine((data, ctx) =>
		refinePortfolioWhenFlagOn(data.hasPortfolio, data.categories, ctx, [
			'categories',
		])
	)

// Update Commission Rule Schema (Form)
export const updateCommissionRuleSchema = z
	.object({
		idProductPercentageCommission: z
			.number()
			.int()
			.positive('ID de regla inválido'),
		description: descriptionSchema,
		active: z.boolean().optional(),
		hasPortfolio: z.boolean().optional(),
		categories: z
			.array(categoryPercentageSchema)
			.superRefine((items, ctx) =>
				refineDuplicateCategoriesAndDistributionSum(items, ctx, [])
			)
			.optional(),
	})
	.superRefine((data, ctx) => {
		if (data.hasPortfolio !== true || !data.categories) return
		refinePortfolioWhenFlagOn(true, data.categories, ctx, ['categories'])
	})

function mapCategoriesToApiFractions(
	items: z.infer<typeof categoryPercentageSchema>[]
) {
	return items.map((item) => ({
		idCategory: item.idCategory,
		percentage: Number(item.percentage) / 100,
		portfolioPercentage:
			item.portfolioPercentage !== undefined &&
			!Number.isNaN(item.portfolioPercentage)
				? Number(item.portfolioPercentage) / 100
				: undefined,
	}))
}

// Create Commission Rule Schema (API) — same validation as form, categories default []
export const createCommissionRuleApiSchema = createCommissionRuleSchema.transform(
	(data) => ({
		idProductConfiguration: data.idProductConfiguration,
		description: data.description,
		hasPortfolio: data.hasPortfolio,
		categories: mapCategoriesToApiFractions(data.categories),
	})
)

// Update Commission Rule Schema (API)
export const updateCommissionRuleApiSchema = updateCommissionRuleSchema.transform(
	(data) => ({
		...data,
		categories: data.categories
			? mapCategoriesToApiFractions(data.categories)
			: undefined,
	})
)

// Inferred Types
export type CreateCommissionRuleFormData = z.infer<
	typeof createCommissionRuleSchema
>
export type UpdateCommissionRuleFormData = z.infer<
	typeof updateCommissionRuleSchema
>
export type CategoryPercentageFormData = z.infer<
	typeof categoryPercentageSchema
>
