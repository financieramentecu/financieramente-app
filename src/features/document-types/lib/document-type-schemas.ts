import { z } from 'zod'
import {
	DOCUMENT_DATA_TYPES,
	IDENTITY_STORAGE_MAX_LENGTH,
} from '@/features/document-types/lib/document-data-type'
const dataTypeSchema = z.enum(
	[DOCUMENT_DATA_TYPES.NUMERIC, DOCUMENT_DATA_TYPES.ALPHANUMERIC],
	{ error: 'El tipo de dato es obligatorio' }
)

const lengthField = (label: string) =>
	z
		.number({ error: `${label} es obligatoria` })
		.int(`${label} debe ser un número entero`)
		.positive(`${label} debe ser mayor a 0`)
		.max(
			IDENTITY_STORAGE_MAX_LENGTH,
			`${label} no puede exceder ${IDENTITY_STORAGE_MAX_LENGTH}`
		)

export const documentTypeFormSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'El nombre es obligatorio')
		.max(80, 'El nombre no puede exceder 80 caracteres'),
	code: z
		.string()
		.trim()
		.min(1, 'La abreviatura es obligatoria')
		.max(10, 'La abreviatura no puede exceder 10 caracteres')
		.regex(
			/^[A-Za-z0-9]+$/,
			'La abreviatura solo puede contener letras y números'
		),
	dataType: dataTypeSchema,
	minLength: lengthField('La longitud mínima'),
	maxLength: lengthField('La longitud máxima'),
	status: z.boolean(),
})

export const updateDocumentTypeSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'El nombre es obligatorio')
		.max(80, 'El nombre no puede exceder 80 caracteres')
		.optional(),
	code: z
		.string()
		.trim()
		.min(1, 'La abreviatura es obligatoria')
		.max(10, 'La abreviatura no puede exceder 10 caracteres')
		.regex(
			/^[A-Za-z0-9]+$/,
			'La abreviatura solo puede contener letras y números'
		)
		.optional(),
	dataType: dataTypeSchema.optional(),
	minLength: lengthField('La longitud mínima').optional(),
	maxLength: lengthField('La longitud máxima').optional(),
	status: z.boolean().optional(),
})

export type DocumentTypeFormData = z.infer<typeof documentTypeFormSchema>
