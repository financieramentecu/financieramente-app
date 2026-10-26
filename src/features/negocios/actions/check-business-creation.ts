'use server'

import { z } from 'zod'
import { ApiResponse } from '@/features/shared/types/api-response.types'
import { requireWriteAccess } from '@/lib/auth/require-write-access'
import { resolveBusinessCreationContext } from '@/features/negocios/services/business-creation.service'
import { toAccessUser } from '@/features/negocios/lib/session-access-user'

const requiredId = (message: string) =>
	z.number({ error: message }).int(message).positive(message)

const checkBusinessCreationSchema = z.object({
	idUser: requiredId('El agente es obligatorio'),
	idProduct: requiredId('El producto es obligatorio'),
})

/**
 * Pre-flight for business creation (COM-41 NEG-02): runs the same owner and
 * commission resolution as `createBusiness` WITHOUT persisting anything, so the
 * form can stop before it creates or updates a client when the product cannot
 * be sold by the owner (for example a product without PARTNER_EXTERNAL setup).
 *
 * Authenticates once (write guard); the service resolves the commission
 * directly, without going through another Server Action.
 */
export async function checkBusinessCreation(input: {
	idUser: number
	idProduct: number
}): Promise<ApiResponse<{ ok: true }>> {
	try {
		const guard = await requireWriteAccess()
		if (!guard.ok) {
			return {
				data: null,
				error: guard.response.status === 401 ? 'No autorizado' : 'Sin permisos',
			}
		}

		const parsed = checkBusinessCreationSchema.safeParse(input)
		if (!parsed.success) {
			return {
				data: null,
				error: parsed.error.issues[0]?.message || 'Error de validación',
			}
		}

		const creation = await resolveBusinessCreationContext({
			sessionUser: toAccessUser(guard.session),
			requestedIdUser: parsed.data.idUser,
			idProduct: parsed.data.idProduct,
		})

		if (!creation.ok) {
			return { data: null, error: creation.error }
		}
		return { data: { ok: true } }
	} catch (error) {
		console.error('Error checking business creation:', error)
		return {
			data: null,
			error: 'No se pudo validar la creación del negocio. Intenta de nuevo.',
		}
	}
}
