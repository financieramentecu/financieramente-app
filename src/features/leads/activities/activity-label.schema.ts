import { z } from 'zod'

const labelName = z
	.string()
	.trim()
	.min(1, 'El nombre es obligatorio')
	.max(40, 'Máximo 40 caracteres')
	.refine((value) => !/[<>]/.test(value), 'El nombre no puede incluir HTML')

const labelColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido')

export const activityLabelCreateSchema = z
	.object({
		name: labelName,
		color: labelColor.default('#64748b'),
	})
	.strict()

export const activityLabelUpdateSchema = z
	.object({
		name: labelName,
		color: labelColor,
	})
	.strict()
