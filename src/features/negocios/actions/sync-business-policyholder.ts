'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/auth/require-write-access'
import { canRoleEditClientInfo } from '@/features/negocios/lib/client-edit-permissions'
import { identityNumberSchema } from '@/features/negocios/lib/identity-number.schema'
import {
	PolicyholderLinkError,
	upsertPolicyholder,
} from '@/features/policyholders/services/policyholder.service'
import {
	AuditAction,
	getClientIp,
	getUserAgent,
	logAuditEvent,
} from '@/features/auth/lib/audit-logger'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

const syncBusinessPolicyholderSchema = z.object({
	idBusiness: z.number().int().positive(),
	clientIsPolicyholder: z.boolean(),
	policyholder: z
		.object({
			typeIdentity: z
				.string()
				.trim()
				.min(1, 'El tipo de documento del tomador es obligatorio'),
			identityNumber: identityNumberSchema.transform((value) =>
				value.toUpperCase()
			),
			email: z.email('El correo del tomador es inválido'),
			name: z.string().trim().min(2, 'Los nombres del tomador son obligatorios'),
			lastName: z
				.string()
				.trim()
				.min(2, 'Los apellidos del tomador son obligatorios'),
			phone: z
				.string()
				.trim()
				.min(1, 'El teléfono del tomador es obligatorio')
				.regex(/^[0-9\s\-+]+$/, 'Formato de contacto inválido'),
		})
		.optional(),
})

export type SyncBusinessPolicyholderInput = z.infer<
	typeof syncBusinessPolicyholderSchema
>

export async function syncBusinessPolicyholder(
	input: SyncBusinessPolicyholderInput
): Promise<ApiResponse<{ clientIsPolicyholder: boolean }>> {
	try {
		const guard = await requireWriteAccess()
		if (!guard.ok) {
			return {
				data: null,
				error: guard.response.status === 401 ? 'No autorizado' : 'Sin permisos',
			}
		}

		if (!canRoleEditClientInfo(guard.session.user.role)) {
			return {
				data: null,
				error: 'Sin permisos para modificar el tomador',
			}
		}

		const data = syncBusinessPolicyholderSchema.parse(input)
		if (!data.clientIsPolicyholder && !data.policyholder) {
			return { data: null, error: 'Los datos del tomador son obligatorios' }
		}

		const current = await prisma.business.findUnique({
			where: { idBusiness: data.idBusiness },
			select: { idBusiness: true, idPolicyholder: true },
		})
		if (!current) {
			return { data: null, error: 'Negocio no encontrado' }
		}

		const linked = await prisma.$transaction(async (tx) => {
			if (data.clientIsPolicyholder) {
				await tx.business.update({
					where: { idBusiness: data.idBusiness },
					data: { clientIsPolicyholder: true, idPolicyholder: null },
				})
				return { created: false, unlinked: current.idPolicyholder != null }
			}

			const upserted = await upsertPolicyholder(tx, data.policyholder!)
			if ('error' in upserted) {
				throw new PolicyholderLinkError(upserted.error)
			}
			await tx.business.update({
				where: { idBusiness: data.idBusiness },
				data: {
					clientIsPolicyholder: false,
					idPolicyholder: upserted.idPolicyholder,
				},
			})
			return { created: upserted.created, unlinked: false }
		})

		const reqHeaders = await headers()
		const userId = guard.session.user.id
			? parseInt(guard.session.user.id, 10)
			: undefined
		const action = data.clientIsPolicyholder
			? AuditAction.BUSINESS_POLICYHOLDER_UNLINKED
			: linked.created
				? AuditAction.POLICYHOLDER_CREATED
				: AuditAction.POLICYHOLDER_UPDATED
		await logAuditEvent({
			userId: Number.isFinite(userId) ? userId : undefined,
			email: guard.session.user.email ?? undefined,
			ipAddress: getClientIp(reqHeaders),
			userAgent: getUserAgent(reqHeaders),
			action,
			details: data.clientIsPolicyholder
				? `Negocio ${data.idBusiness} queda con el cliente como tomador`
				: `Negocio ${data.idBusiness} vinculado a un tomador independiente`,
		})

		return { data: { clientIsPolicyholder: data.clientIsPolicyholder } }
	} catch (error) {
		if (error instanceof PolicyholderLinkError) {
			return { data: null, error: error.message }
		}
		if (error instanceof z.ZodError) {
			return {
				data: null,
				error: error.issues[0]?.message ?? 'Datos del tomador inválidos',
			}
		}
		console.error('Error syncing business policyholder:', error)
		return { data: null, error: 'No se pudo guardar el tomador' }
	}
}
