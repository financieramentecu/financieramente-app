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
		.min(1, 'El teléfono es obligatorio')
		.regex(/^[0-9\s\-+]+$/, 'Formato de contacto inválido'),
	identityNumber: identityNumberSchema,
	typeIdentity: z
		.string()
		.trim()
		.min(1, 'El tipo de documento es obligatorio')
		.max(10, 'La abreviatura no puede exceder 10 caracteres'),
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
	clientIsPolicyholder: z.boolean().optional(),
	policyholderTypeIdentity: z.string().optional(),
	policyholderIdentityNumber: z.string().optional(),
	policyholderEmail: z.string().optional(),
	policyholderName: z.string().optional(),
	policyholderLastNames: z.string().optional(),
	policyholderPhone: z.string().optional(),
}).superRefine((data, ctx) => {
	if (!data.isSkandiaWithMfund && data.terms < 1) {
		ctx.addIssue({
			code: 'custom',
			message: 'El plazo debe ser mayor a 0',
			path: ['terms'],
		})
	}

	if (data.clientIsPolicyholder !== false) {
		return
	}

	const requiredText = (
		value: string | undefined,
		path: string,
		message: string,
		minLength = 1
	) => {
		if (!value || value.trim().length < minLength) {
			ctx.addIssue({ code: 'custom', message, path: [path] })
		}
	}

	requiredText(
		data.policyholderTypeIdentity,
		'policyholderTypeIdentity',
		'El tipo de documento del tomador es obligatorio'
	)

	const identity = identityNumberSchema.safeParse(
		data.policyholderIdentityNumber ?? ''
	)
	if (!identity.success) {
		ctx.addIssue({
			code: 'custom',
			message:
				identity.error.issues[0]?.message ??
				'El número de documento del tomador es obligatorio',
			path: ['policyholderIdentityNumber'],
		})
	}

	const email = z.email('El correo del tomador es inválido').safeParse(
		data.policyholderEmail ?? ''
	)
	if (!email.success) {
		ctx.addIssue({
			code: 'custom',
			message: 'El correo del tomador es inválido',
			path: ['policyholderEmail'],
		})
	}

	requiredText(
		data.policyholderLastNames,
		'policyholderLastNames',
		'Los apellidos del tomador son obligatorios',
		2
	)
	requiredText(
		data.policyholderName,
		'policyholderName',
		'Los nombres del tomador son obligatorios',
		2
	)

	const phone = (data.policyholderPhone ?? '').trim()
	if (!phone || !/^[0-9\s\-+]+$/.test(phone)) {
		ctx.addIssue({
			code: 'custom',
			message: phone
				? 'Formato de contacto inválido'
				: 'El teléfono del tomador es obligatorio',
			path: ['policyholderPhone'],
		})
	}
})

export type BusinessFormData = z.infer<typeof businessFormSchema>

// Opciones para los selectores
