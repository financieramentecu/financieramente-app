import { z } from 'zod'

import { BUSINESS_TERM_MAX } from '@/features/negocios/lib/business-term-limits'
import { identityNumberSchema } from './identity-number.schema'

/**
 * Schemas y tipos para formularios de negocios
 */

// Esquema de validación con Zod
export const businessFormSchema = z.object({
	// Información básica y general del cliente
	email: z.email('Email inválido'),
	name: z.string().min(2, 'Los nombres son obligatorios').trim(),
	lastNames: z.string().min(2, 'Los apellidos son obligatorios').trim(),
	phone: z
		.string()
		.regex(/^[0-9\s\-+]+$/, 'Formato de contacto inválido')
		.optional(),
	identityNumber: identityNumberSchema,
	clientOrigin: z.string().min(1, 'El origen del cliente es obligatorio'),
	contract: z
		.string()
		.regex(
			/^[A-Za-z0-9-]*$/,
			'El número de contrato solo puede contener letras, números y guiones'
		)
		.transform((val) => (val === '' ? undefined : val))
		.optional(),

	// Información del producto
	company: z.string().min(1, 'La compañía es obligatoria'),
	producto: z.string().min(1, 'El producto es obligatorio'),
	terms: z
		.number()
		.min(0)
		.max(
			BUSINESS_TERM_MAX,
			`El plazo no puede ser mayor a ${BUSINESS_TERM_MAX}`
		),

	// Información del negocio
	isSkandiaWithMfund: z.boolean().optional(),
	numAportes: z.number().int().min(0).optional(),
	currency: z.string().min(1, 'La moneda es obligatoria'),
	periodicity: z.string().min(1, 'La periodicidad es obligatoria'),
	value: z
		.number({ message: 'El valor debe ser un número' })
		.min(0, 'El valor debe ser mayor o igual a 0'),
	agent: z.string().min(1, 'El agente es obligatorio'),
}).superRefine((data, ctx) => {
	if (!data.isSkandiaWithMfund && data.terms < 1) {
		ctx.addIssue({
			code: 'custom',
			message: 'El plazo debe ser mayor a 0',
			path: ['terms'],
		})
	}
})

export type BusinessFormData = z.infer<typeof businessFormSchema>

// Opciones para los selectores
