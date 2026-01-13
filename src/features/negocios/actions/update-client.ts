'use server'

import { prisma } from '@/lib/prisma'
import { Client } from '@prisma/client'
import { ApiResponse } from '@/features/shared/types/api-response.types'
import { z } from 'zod'

/**
 * Schema de validación para actualizar un cliente
 * NOTA: idClientOrigin ya NO pertenece al cliente, ahora pertenece al negocio
 */
const updateClientSchema = z.object({
	idClient: z.number().int().positive('El ID del cliente es obligatorio'),
	name: z.string().min(2, 'Los nombres son obligatorios').trim().optional(),
	lastName: z
		.string()
		.min(2, 'Los apellidos son obligatorios')
		.trim()
		.optional(),
	email: z.email('Email inválido').optional(),
	phone: z
		.string()
		.regex(/^[0-9\s\-+]+$/, 'Formato de contacto inválido')
		.optional(),
	direcction: z.string().optional(),
	city: z.string().optional(),
	country: z.string().optional(),
})

export type UpdateClientInput = z.infer<typeof updateClientSchema>

/**
 * Server Action para actualizar un cliente
 *
 * Valida los datos y actualiza solo los campos que fueron modificados.
 * NOTA: idClientOrigin ya NO se actualiza aquí, ahora pertenece al negocio.
 *
 * @param data - Datos del cliente a actualizar
 * @returns ApiResponse con el cliente actualizado o un error
 */
export async function updateClient(
	data: UpdateClientInput
): Promise<ApiResponse<Client>> {
	try {
		// Validar los datos de entrada
		const validatedData = updateClientSchema.parse(data)

		// Verificar que el cliente existe
		const existingClient = await prisma.client.findUnique({
			where: {
				idClient: validatedData.idClient,
			},
		})

		if (!existingClient) {
			return {
				data: null,
				error: 'El cliente no existe',
			}
		}
		const updateData: Partial<{
			name: string
			lastName: string | null
			email: string | null
			phone: string | null
			direcction: string | null
			city: string | null
			country: string
		}> = {}

		if (validatedData.name !== undefined) {
			updateData.name = validatedData.name
		}
		if (validatedData.lastName !== undefined) {
			updateData.lastName = validatedData.lastName
		}
		if (validatedData.email !== undefined) {
			updateData.email = validatedData.email
		}
		if (validatedData.phone !== undefined) {
			updateData.phone = validatedData.phone
		}
		if (validatedData.direcction !== undefined) {
			updateData.direcction = validatedData.direcction
		}
		if (validatedData.city !== undefined) {
			updateData.city = validatedData.city
		}
		if (validatedData.country !== undefined) {
			updateData.country = validatedData.country
		}

		// Actualizar el cliente
		const client = await prisma.client.update({
			where: {
				idClient: validatedData.idClient,
			},
			data: updateData,
		})

		return {
			data: client,
		}
	} catch (error) {
		// Manejar errores de validación de Zod
		if (error instanceof z.ZodError) {
			const firstError = error.issues[0]
			return {
				data: null,
				error: firstError?.message || 'Error de validación',
			}
		}

		// Manejar errores de Prisma
		if (error && typeof error === 'object' && 'code' in error) {
			if (error.code === 'P2025') {
				return {
					data: null,
					error: 'El cliente no existe',
				}
			}
		}

		console.error('Error updating client:', error)
		return {
			data: null,
			error: 'Error al actualizar el cliente. Por favor, intenta de nuevo.',
		}
	}
}
