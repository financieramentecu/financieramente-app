import { z } from 'zod'

const beneficiaryModeEnum = z.enum(['UPLINE_CHAIN', 'FIXED_BENEFICIARY'])

/**
 * Cross-field validation: FIXED_BENEFICIARY requires a non-null idFixedBeneficiaryUser
 */
function validateBeneficiaryConstraint<
	T extends { beneficiaryMode?: string; idFixedBeneficiaryUser?: number | null },
>(data: T, ctx: z.RefinementCtx) {
	if (
		data.beneficiaryMode === 'FIXED_BENEFICIARY' &&
		(data.idFixedBeneficiaryUser === null ||
			data.idFixedBeneficiaryUser === undefined)
	) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['idFixedBeneficiaryUser'],
			message:
				'El usuario beneficiario fijo es requerido cuando el modo es FIXED_BENEFICIARY',
		})
	}
}

/**
 * Schema for creating a category
 */
export const createCategorySchema = z
	.object({
		code: z
			.string()
			.min(1, 'El código es requerido')
			.max(20, 'El código no puede exceder 20 caracteres')
			.trim(),
		name: z
			.string()
			.min(2, 'El nombre debe tener al menos 2 caracteres')
			.max(50, 'El nombre no puede exceder 50 caracteres')
			.trim(),
		typeCategory: z.string().min(1, 'El tipo de categoría es requerido'),
		descripcion: z.string().nullable().optional(),
		status: z.boolean(),
		beneficiaryMode: beneficiaryModeEnum.default('UPLINE_CHAIN'),
		idFixedBeneficiaryUser: z
			.number()
			.int()
			.positive()
			.nullable()
			.optional(),
	})
	.superRefine(validateBeneficiaryConstraint)

/**
 * Schema for updating a category
 */
export const updateCategorySchema = z
	.object({
		code: z
			.string()
			.min(1, 'El código es requerido')
			.max(20, 'El código no puede exceder 20 caracteres')
			.trim()
			.optional(),
		name: z
			.string()
			.min(2, 'El nombre debe tener al menos 2 caracteres')
			.max(50, 'El nombre no puede exceder 50 caracteres')
			.trim()
			.optional(),
		typeCategory: z.string().optional(),
		descripcion: z.string().nullable().optional(),
		status: z.boolean().optional(),
		beneficiaryMode: beneficiaryModeEnum.optional(),
		idFixedBeneficiaryUser: z
			.number()
			.int()
			.positive()
			.nullable()
			.optional(),
	})
	.superRefine(validateBeneficiaryConstraint)

/**
 * Inferred types from schemas (output after defaults and transforms)
 */
export type CreateCategoryFormData = z.output<typeof createCategorySchema>
export type UpdateCategoryFormData = z.output<typeof updateCategorySchema>
