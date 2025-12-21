'use server'

import { prisma } from '@/lib/prisma'
import { Client } from '@prisma/client'
import { ApiResponse } from '@/features/shared/types/api-response.types'
import { z } from 'zod'

/**
 * Schema de validación para crear un cliente
 */
const createClientSchema = z.object({
	name: z.string().min(2, 'Los nombres son obligatorios').trim(),
	lastName: z
		.string()
		.min(2, 'Los apellidos son obligatorios')
		.trim()
		.optional(),
	typeIdentity: z.string().default('CC'),
	identityNumber: z
		.string()
		.min(1, 'El número de identificación es obligatorio')
		.min(5, 'El número de identificación debe tener al menos 5 caracteres')
		.regex(
			/^[0-9.]+$/,
			'El número de identificación solo puede contener números y puntos'
		),
	idClientOrigin: z
		.number()
		.int()
		.positive('El origen del cliente es obligatorio'),
	email: z.string().email('Email inválido').optional(),
	phone: z
		.string()
		.regex(/^[0-9\s\-+]+$/, 'Formato de contacto inválido')
		.optional(),
	direcction: z.string().optional(),
	city: z.string().optional(),
	country: z.string().default('Colombia'),
})

export type CreateClientInput = z.infer<typeof createClientSchema>

/**
 * Server Action para crear un cliente
 *
 * Valida los datos, verifica que no exista un cliente con el mismo
 * identityNumber y typeIdentity, y crea el cliente en la base de datos.
 *
 * @param data - Datos del cliente a crear
 * @returns ApiResponse con el cliente creado o un error
 */
export async function createClient(
	data: CreateClientInput
): Promise<ApiResponse<Client>> {
	try {
		// Validar los datos de entrada
		const validatedData = createClientSchema.parse(data)

		// Verificar que no exista un cliente con el mismo identityNumber y typeIdentity
		const existingClient = await prisma.client.findUnique({
			where: {
				typeIdentity_identityNumber: {
					typeIdentity: validatedData.typeIdentity,
					identityNumber: validatedData.identityNumber,
				},
			},
		})

		if (existingClient) {
			return {
				data: null,
				error: 'Ya existe un cliente con este número de identificación',
			}
		}

		// Crear el cliente
		const client = await prisma.client.create({
			data: {
				name: validatedData.name,
				lastName: validatedData.lastName,
				typeIdentity: validatedData.typeIdentity,
				identityNumber: validatedData.identityNumber,
				idClientOrigin: validatedData.idClientOrigin,
				email: validatedData.email,
				phone: validatedData.phone,
				direcction: validatedData.direcction,
				city: validatedData.city,
				country: validatedData.country,
			},
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

		// Manejar errores de Prisma (duplicados, etc.)
		if (error && typeof error === 'object' && 'code' in error) {
			if (error.code === 'P2002') {
				return {
					data: null,
					error: 'Ya existe un cliente con este número de identificación',
				}
			}
		}

		console.error('Error creating client:', error)
		return {
			data: null,
			error: 'Error al crear el cliente. Por favor, intenta de nuevo.',
		}
	}
}
