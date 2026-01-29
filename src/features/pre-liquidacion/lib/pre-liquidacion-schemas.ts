import { z } from 'zod'

/**
 * Schema para validación de procesamiento de pre-liquidación
 * Usado en el API route POST /api/pre-liquidacion/procesar
 */
export const procesarPreLiquidacionSchema = z
	.object({
		fileImportId: z
			.number()
			.int('El ID del archivo debe ser un número entero')
			.positive('El ID del archivo debe ser positivo'),
		mes: z
			.string()
			.regex(
				/^\d{4}-\d{2}$/,
				'El formato del mes debe ser YYYY-MM (ej: 2024-01)'
			)
			.optional(),
		fechaInicio: z.string().datetime().optional(),
		fechaFin: z.string().datetime().optional(),
	})
	.refine(
		(data) => {
			// Debe tener mes O (fechaInicio Y fechaFin)
			return (
				data.mes !== undefined ||
				(data.fechaInicio !== undefined && data.fechaFin !== undefined)
			)
		},
		{
			message: 'Se requiere "mes" (YYYY-MM) o "fechaInicio" y "fechaFin"',
		}
	)

/**
 * Schema para validación de rango de fechas
 */
export const rangoFechasSchema = z
	.object({
		fechaInicio: z
			.string()
			.datetime('La fecha de inicio debe ser una fecha válida'),
		fechaFin: z.string().datetime('La fecha de fin debe ser una fecha válida'),
	})
	.refine(
		(data) => {
			const inicio = new Date(data.fechaInicio)
			const fin = new Date(data.fechaFin)
			return fin >= inicio
		},
		{
			message:
				'La fecha de fin debe ser posterior o igual a la fecha de inicio',
			path: ['fechaFin'],
		}
	)

/**
 * Schema para validación de mes (formato YYYY-MM)
 */
export const mesSchema = z.object({
	mes: z
		.string()
		.regex(
			/^\d{4}-\d{2}$/,
			'El formato del mes debe ser YYYY-MM (ej: 2024-01)'
		),
})

/**
 * Tipos inferidos desde schemas
 */
export type ProcesarPreLiquidacionInput = z.infer<
	typeof procesarPreLiquidacionSchema
>
export type RangoFechasInput = z.infer<typeof rangoFechasSchema>
export type MesInput = z.infer<typeof mesSchema>
