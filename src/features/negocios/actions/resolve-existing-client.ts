'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/nextauth'
import { ApiResponse } from '@/features/shared/types/api-response.types'
import { identityNumberSchema } from '../lib/identity-number.schema'
import {
	resolveExistingClient as resolveExistingClientService,
	type ClientResolution,
} from '../services/client-resolution.service'
import {
	AuditAction,
	getClientIp,
	getUserAgent,
	logAuditEvent,
} from '@/features/auth/lib/audit-logger'

/**
 * Schema de validación para resolver un cliente existente en la conversión
 * de un lead. `leadId` es obligatorio: esta action solo se invoca desde el
 * flujo de conversión de lead (D2), nunca desde la creación manual.
 */
const resolveExistingClientSchema = z.object({
	typeIdentity: z.string().default('CC'),
	identityNumber: identityNumberSchema,
	email: z.string().email('Email inválido').optional().nullable(),
	leadId: z.number().int().positive('El ID del lead es obligatorio'),
})

export type ResolveExistingClientInput = z.infer<
	typeof resolveExistingClientSchema
>

/**
 * Server Action para resolver un cliente existente antes de crear un
 * negocio desde la conversión de un lead (D1/D5/D7).
 *
 * Siempre habilita el fallback de reactivación (D7) — esta action solo se
 * invoca desde el flujo de conversión de lead, donde ese fallback es un
 * comportamiento aprobado. Emite `CLIENT_REACTIVATED` cuando el resultado
 * reactiva un cliente inactivo.
 *
 * @param data - Criterios de identidad para la resolución
 * @returns ApiResponse con la resolución (cliente + origen) o `null` si no hubo match
 */
export async function resolveExistingClient(
	data: ResolveExistingClientInput
): Promise<ApiResponse<ClientResolution | null>> {
	try {
		const session = await auth()
		if (!session?.user) {
			return {
				data: null,
				error: 'No autorizado',
			}
		}

		const validatedData = resolveExistingClientSchema.parse(data)

		const resolution = await resolveExistingClientService({
			typeIdentity: validatedData.typeIdentity,
			identityNumber: validatedData.identityNumber,
			email: validatedData.email,
			allowReactivation: true,
		})

		if (resolution?.source === 'reactivated') {
			const reqHeaders = await headers()
			const userId = session.user.id
				? parseInt(session.user.id, 10)
				: undefined
			await logAuditEvent({
				userId: Number.isFinite(userId) ? userId : undefined,
				email: session.user.email,
				ipAddress: getClientIp(reqHeaders),
				userAgent: getUserAgent(reqHeaders),
				action: AuditAction.CLIENT_REACTIVATED,
				details: `Client ${resolution.client.idClient} reactivated during lead ${validatedData.leadId} conversion`,
			})
		}

		return {
			data: resolution,
		}
	} catch (error) {
		if (error instanceof z.ZodError) {
			const firstError = error.issues[0]
			return {
				data: null,
				error: firstError?.message || 'Error de validación',
			}
		}

		console.error('Error resolving existing client:', error)
		return {
			data: null,
			error: 'Error al resolver el cliente. Por favor, intenta de nuevo.',
		}
	}
}
