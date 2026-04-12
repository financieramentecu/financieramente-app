import { z } from 'zod'

/** Mensaje único para UI + validación Zod (suma de líneas > 100 %) */
export const COMMISSION_RULE_CATEGORIES_SUM_MAX_MESSAGE =
	'La suma de porcentajes por categoría no puede superar 100'

const descriptionSchema = z
	.string()
	.max(255, 'La descripción no puede exceder 255 caracteres')
	.optional()

const percentageSchema = z.coerce
	.number({ message: 'El porcentaje debe ser un número' })
	.min(1, 'El porcentaje debe ser al menos 1')
	.max(100, 'El porcentaje no puede exceder 100')

// Category Line Item Schema (Column schema)
// Input: User enters 15.5 for 15.5%
export const categoryPercentageSchema = z.object({
	idCategory: z
		.number()
		.int('Categoría inválida')
		.positive('Categoría inválida'),
	percentage: percentageSchema,
})

const categoryLinesSchema = z
	.array(categoryPercentageSchema)
	.superRefine((items, ctx) => {
		const seen = new Set<number>()
		items.forEach((item, index) => {
			if (item.idCategory && seen.has(item.idCategory)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Categoría duplicada en la regla',
					path: [index, 'idCategory'],
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
				path: [],
			})
		}
	})

const categoryLinesApiSchema = categoryLinesSchema.transform((items) =>
	items.map((item) => ({
		...item,
		percentage: Number(item.percentage) / 100,
	}))
)

const optionalCategoryLinesApiSchema = z.preprocess(
	(value) => (Array.isArray(value) ? value : []),
	categoryLinesApiSchema
)

// Create Commission Rule Schema (Form)
export const createCommissionRuleSchema = z.object({
	idProductConfiguration: z
		.number()
		.int()
		.positive('Configuración de producto inválida'),
	description: descriptionSchema,
	categories: categoryLinesSchema,
})

// Update Commission Rule Schema (Form)
export const updateCommissionRuleSchema = z.object({
	idProductPercentageCommission: z
		.number()
		.int()
		.positive('ID de regla inválido'),
	description: descriptionSchema,
	active: z.boolean().optional(),
	categories: categoryLinesSchema.optional(),
})

// Create Commission Rule Schema (API)
export const createCommissionRuleApiSchema = createCommissionRuleSchema.extend({
	categories: optionalCategoryLinesApiSchema,
})

// Update Commission Rule Schema (API)
export const updateCommissionRuleApiSchema = updateCommissionRuleSchema.extend({
	categories: categoryLinesApiSchema.optional(),
})

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
