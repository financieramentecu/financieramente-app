import { z } from 'zod'

const optionalText = (max: number) => z.string().trim().max(max).optional()

export const createLeadSchema = z
	.object({
		name: z.string().trim().min(1, 'El nombre es obligatorio').max(200),
		lastName: optionalText(200),
		email: z
			.union([
				z.literal(''),
				z.string().trim().email('Correo inválido').max(150),
			])
			.optional(),
		phone: optionalText(30),
		identityNumber: optionalText(20),
		idUser: z.number().int().positive().optional(),
	})
	.refine(
		(value) => Boolean(value.email || value.phone || value.identityNumber),
		{
			message: 'Ingresa correo, teléfono o documento',
		}
	)

export type CreateLeadInput = z.infer<typeof createLeadSchema>

export interface CreatedLead {
	idLead: number
	idUser: number
}
