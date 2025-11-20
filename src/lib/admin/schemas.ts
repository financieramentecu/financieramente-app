import { z } from 'zod'

// Company Schema
export const companySchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es obligatorio')
		.max(100, 'El nombre no puede exceder 100 caracteres'),
	idTypeCompany: z.enum(['NACIONAL', 'INTERNACIONAL'], {
		message: 'Debe ser NACIONAL o INTERNACIONAL',
	}),
	status: z.boolean().default(true),
})

export type CompanyFormData = z.infer<typeof companySchema>

// Currency Schema
export const currencySchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es obligatorio')
		.max(50, 'El nombre no puede exceder 50 caracteres'),
	symbol: z
		.string()
		.max(5, 'El símbolo no puede exceder 5 caracteres')
		.optional(),
	active: z.boolean().default(true),
})

export type CurrencyFormData = z.infer<typeof currencySchema>

// BuyPeriodicity Schema
export const buyPeriodicitySchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es obligatorio')
		.max(50, 'El nombre no puede exceder 50 caracteres'),
	active: z.boolean().default(true),
})

export type BuyPeriodicityFormData = z.infer<typeof buyPeriodicitySchema>

// ProductOrigin Schema
export const productOriginSchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es obligatorio')
		.max(100, 'El nombre no puede exceder 100 caracteres'),
	description: z.string().optional(),
	status: z.boolean().default(true),
})

export type ProductOriginFormData = z.infer<typeof productOriginSchema>

// ClientOrigin Schema
export const clientOriginSchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es obligatorio')
		.max(100, 'El nombre no puede exceder 100 caracteres'),
	description: z.string().optional(),
	status: z.boolean().default(true),
})

export type ClientOriginFormData = z.infer<typeof clientOriginSchema>

// Product Schema
export const productSchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es obligatorio')
		.max(200, 'El nombre no puede exceder 200 caracteres'),
	description: z.string().optional(),
	idCompany: z.coerce
		.number()
		.refine((value) => !Number.isNaN(value), {
			message: 'La compañía es obligatoria',
		})
		.int('La compañía seleccionada no es válida'),
	idTypeProduct: z.coerce.number().int().optional(),
	status: z.boolean().default(true),
})

export type ProductFormData = z.infer<typeof productSchema>

// Category Schema
export const categorySchema = z.object({
	code: z
		.string()
		.min(1, 'El código es obligatorio')
		.max(20, 'El código no puede exceder 20 caracteres'),
	name: z
		.string()
		.min(1, 'El nombre es obligatorio')
		.max(50, 'El nombre no puede exceder 50 caracteres'),
	typeCategory: z.enum(['MMS', 'ALIADO', 'TRINITY'], {
		message: 'Debe ser MMS, ALIADO o TRINITY',
	}),
	descripcion: z.string().optional(),
	status: z.boolean().default(true),
})

export type CategoryFormData = z.infer<typeof categorySchema>
