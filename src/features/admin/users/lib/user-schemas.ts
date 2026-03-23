import { z } from 'zod'

/**
 * Schema de validación para actualizar un usuario
 * La categoría es requerida si el rol es AGENTE
 * El líder es opcional pero no puede ser el mismo usuario
 */
export const updateUserSchema = (
	roleCode: string | null | undefined,
	userId: number
) => {
	return z
		.object({
			active: z.boolean().optional(),
			roleId: z.number().int().positive().nullable().optional(),
			categoryId: z.number().int().positive().nullable().optional(),
			leaderId: z.number().int().positive().nullable().optional(),
		})
		.refine(
			(data) => {
				// Si el rol es AGENTE, la categoría es requerida
				if (roleCode === 'AGENTE') {
					return data.categoryId !== null && data.categoryId !== undefined
				}
				return true
			},
			{
				message: 'La categoría es requerida cuando el rol es Agente/Coach',
				path: ['categoryId'],
			}
		)
		.refine(
			(data) => {
				// El líder no puede ser el mismo usuario
				if (data.leaderId !== null && data.leaderId !== undefined) {
					return data.leaderId !== userId
				}
				return true
			},
			{
				message: 'Un usuario no puede ser líder de sí mismo',
				path: ['leaderId'],
			}
		)
}

export type UpdateUserSchemaInput = z.infer<
	ReturnType<typeof updateUserSchema>
>
