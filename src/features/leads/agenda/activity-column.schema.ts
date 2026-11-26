import { z } from 'zod'

const columnName = z
	.string()
	.trim()
	.min(1, 'El nombre es obligatorio')
	.max(40, 'Máximo 40 caracteres')
	.refine((value) => !/[<>]/.test(value), 'El nombre no puede incluir HTML')

export const activityColumnRenameSchema = z
	.object({
		name: columnName,
	})
	.strict()
