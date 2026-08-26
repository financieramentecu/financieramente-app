'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Client } from '@prisma/client'
import { ApiResponse } from '@/features/shared/types/api-response.types'
import { z } from 'zod'
import { requireWriteAccess } from '@/lib/auth/require-write-access'
import {
	AuditAction,
	getClientIp,
	getUserAgent,
	logAuditEvent,
} from '@/features/auth/lib/audit-logger'
import { identityNumberSchema } from '../lib/identity-number.schema'
import { canRoleEditClientInfo } from '../lib/client-edit-permissions'

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
		.min(1, 'El teléfono es obligatorio')
		.regex(/^[0-9\s\-+]+$/, 'Formato de contacto inválido')
		.optional(),
	identityNumber: identityNumberSchema
		.transform((v) => v.toUpperCase())
		.optional(),
	direcction: z.string().optional(),
	city: z.string().optional(),
	country: z.string().optional(),
	/**
	 * business-edit: edición desde formulario de negocio (COM-63) — requiere AGO/Admin.
	 * business-create: ajuste de cliente durante creación de negocio — autenticado.
	 */
	context: z.enum(['business-create', 'business-edit']).default('business-create'),
	/** Used to revalidate the edit page after a privileged client update */
	businessId: z.number().int().positive().optional(),
})

export type UpdateClientInput = z.infer<typeof updateClientSchema>

function requiresPrivilegedRole(data: {
	context: 'business-create' | 'business-edit'
	identityNumber?: string
}): boolean {
	return (
		data.context === 'business-edit' || data.identityNumber !== undefined
	)
}

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
		const guard = await requireWriteAccess()
		if (!guard.ok) {
			return {
				data: null,
				error:
					guard.response.status === 401 ? 'No autorizado' : 'Sin permisos',
			}
		}
		const session = guard.session

		const validatedData = updateClientSchema.parse(data)

		const role = session.user.role
		if (requiresPrivilegedRole(validatedData)) {
			if (!canRoleEditClientInfo(role)) {
				return {
					data: null,
					error:
						'No tienes permisos para editar la información del cliente',
				}
			}
		}

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

		if (validatedData.identityNumber !== undefined) {
			const duplicate = await prisma.client.findFirst({
				where: {
					typeIdentity: existingClient.typeIdentity,
					identityNumber: validatedData.identityNumber,
					NOT: { idClient: existingClient.idClient },
				},
			})
			if (duplicate) {
				return {
					data: null,
					error: 'Ya existe un cliente con este número de identificación',
				}
			}
		}

		const updateData: Partial<{
			name: string
			lastName: string | null
			email: string | null
			phone: string | null
			identityNumber: string
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
		if (validatedData.identityNumber !== undefined) {
			updateData.identityNumber = validatedData.identityNumber
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

		if (Object.keys(updateData).length === 0) {
			return {
				data: existingClient,
			}
		}

		const client = await prisma.client.update({
			where: {
				idClient: validatedData.idClient,
			},
			data: updateData,
		})

		const reqHeaders = await headers()
		const userId = session.user.id ? parseInt(session.user.id, 10) : undefined
		await logAuditEvent({
			userId: Number.isFinite(userId) ? userId : undefined,
			email: session.user.email,
			ipAddress: getClientIp(reqHeaders),
			userAgent: getUserAgent(reqHeaders),
			action: AuditAction.CLIENT_UPDATED,
			details: `Client ${client.idClient} updated (${Object.keys(updateData).join(', ')}) via ${validatedData.context}`,
		})

		if (validatedData.businessId !== undefined) {
			revalidatePath(`/dashboard/negocios/editar/${validatedData.businessId}`)
		}
		revalidatePath('/dashboard/negocios')

		return {
			data: client,
		}
	} catch (error) {
		if (error instanceof z.ZodError) {
			const firstError = error.issues[0]
			return {
				data: null,
				error: firstError?.message || 'Error de validación',
			}
		}

		if (error && typeof error === 'object' && 'code' in error) {
			if (error.code === 'P2025') {
				return {
					data: null,
					error: 'El cliente no existe',
				}
			}
			if (error.code === 'P2002') {
				return {
					data: null,
					error: 'Ya existe un cliente con este número de identificación',
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
