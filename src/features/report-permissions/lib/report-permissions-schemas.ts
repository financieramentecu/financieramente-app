import { z } from 'zod'

export const replaceReportPermissionsSchema = z.object({
	code: z.string().min(1, 'El código del reporte es requerido'),
	categoryIds: z
		.array(z.number().int().positive())
		.min(1, 'Debe seleccionar al menos una categoría'),
})

export type ReplaceReportPermissionsInput = z.infer<
	typeof replaceReportPermissionsSchema
>

export const reportPermissionsQuerySchema = z.object({
	code: z.string().min(1).optional(),
})
