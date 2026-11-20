import { z } from 'zod'
import { LEAD_CUSTOM_FIELD_TYPES, type LeadCustomFieldType } from '@/features/leads/custom-fields/custom-field.types'

const labelSchema = z.string().trim().min(1, 'La etiqueta es obligatoria').max(80, 'Máximo 80 caracteres')
const optionsSchema = z
	.array(z.string().trim().min(1).max(60))
	.min(1, 'Agrega al menos una opción')
	.max(30, 'Máximo 30 opciones')
	.refine((options) => new Set(options).size === options.length, { message: 'Las opciones no se pueden repetir' })
const positionSchema = z.number().int().min(0).max(1000)

export const leadCustomFieldCreateSchema = z
	.object({
		key: z
			.string()
			.regex(/^[a-z][a-z0-9_]{1,39}$/, 'La clave debe ser snake_case (a-z, 0-9, _), de 2 a 40 caracteres'),
		label: labelSchema,
		type: z.enum(LEAD_CUSTOM_FIELD_TYPES as [LeadCustomFieldType, ...LeadCustomFieldType[]]),
		options: optionsSchema.optional(),
		position: positionSchema.default(0),
	})
	.strict()
	.refine((value) => value.type !== 'SELECT' || value.options !== undefined, {
		message: 'Una lista requiere opciones',
	})
	.refine((value) => value.type === 'SELECT' || value.options === undefined, {
		message: 'Solo las listas tienen opciones',
	})
	.transform((value) => ({ ...value, options: value.options ?? [] }))

export const leadCustomFieldUpdateSchema = z
	.object({ label: labelSchema.optional(), options: optionsSchema.optional(), position: positionSchema.optional() })
	.strict()
	.refine((value) => Object.keys(value).length > 0, { message: 'Nada que actualizar' })

export const leadCrmFieldsPatchSchema = z
	.object({
		estimatedValue: z
			.string()
			.regex(/^\d{1,13}(\.\d{1,2})?$/, 'Valor inválido: usa un número positivo con máximo 2 decimales')
			.nullable()
			.optional(),
		probability: z.number().int().min(0, 'La probabilidad va de 0 a 100').max(100, 'La probabilidad va de 0 a 100').nullable().optional(),
		customFields: z.record(z.string(), z.unknown()).optional(),
	})
	.strict()
	.refine((value) => Object.keys(value).length > 0, { message: 'Nada que actualizar' })
