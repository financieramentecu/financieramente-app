import { z } from 'zod'

/**
 * Schema para validación de login con email y contraseña
 */
export const loginSchema = z.object({
	email: z
		.string()
		.min(1, 'El correo electrónico es obligatorio')
		.email('El correo electrónico no es válido')
		.refine((email) => email.endsWith('@financieramentecu.com'), {
			message:
				'Solo se permite el acceso con correos corporativos (@financieramentecu.com)',
		}),
	password: z
		.string()
		.min(1, 'La contraseña es obligatoria')
		.min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

/**
 * Schema para validación de email (usado en formularios de solo email)
 */
export const emailSchema = z.object({
	email: z
		.string()
		.min(1, 'El correo electrónico es obligatorio')
		.email('El correo electrónico no es válido'),
})

/**
 * Tipos inferidos desde schemas
 */
export type LoginInput = z.infer<typeof loginSchema>
export type EmailInput = z.infer<typeof emailSchema>
