import { z } from 'zod'

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
	identityNumber: z
		.string()
		.min(1, 'El número de identificación es obligatorio')
		.min(5, 'El número de identificación debe tener al menos 5 caracteres')
		.regex(
			/^[0-9.]+$/,
			'El número de identificación solo puede contener números y puntos'
		),
	contract: z.string().min(1, 'El contrato es obligatorio').optional(),

	// Información del producto
	compania: z.string().min(1, 'La compañía es obligatoria'),
	producto: z.string().min(1, 'El producto es obligatorio'),
	terms: z
		.number()
		.min(1, 'El plazo debe ser mayor a 0')
		.max(1200, 'El plazo no puede ser mayor a 1200 meses'),

	// Información del negocio
	currency: z.string().min(1, 'La moneda es obligatoria'),
	periodicity: z.string().min(1, 'La periodicidad es obligatoria'),
	value: z.number().min(0, 'El valor debe ser mayor o igual a 0'),
	agent: z.string().min(1, 'El agente es obligatorio'),
})

export type BusinessFormData = z.infer<typeof businessFormSchema>

// Opciones para los selectores
