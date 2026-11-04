import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { updatePartnerSchema } from '@/features/admin/partners/lib/partner-schemas'
import {
	errorJson,
	parsePartnerId,
	partnerErrorResponse,
} from '@/features/admin/partners/lib/partner-http'
import { updatePartner } from '@/features/admin/partners/services/partner.service'
import {
	auditPartnerEvent,
	resolveAuditActor,
} from '@/features/admin/partners/services/partner-audit.service'
import type { PartnerDto } from '@/features/admin/partners/types/partner.types'

/**
 * PUT /api/admin/partners/[id]
 * Edits name, last name, identity document, phone and leader (ADMIN only).
 * Email, role, level, category, state and password are stripped by the schema
 * and never applied. One PARTNER_UPDATED audit event per effective edit; a
 * request that changes nothing answers 200 without an event.
 */
export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PartnerDto>>> {
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response as NextResponse<ApiResponse<PartnerDto>>
	}

	const id = parsePartnerId((await params).id)
	if (id === null) return errorJson('ID de partner inválido', 400)

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return errorJson('Solicitud inválida', 400)
	}

	const parsed = updatePartnerSchema.safeParse(body)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return errorJson(issue?.message ?? 'Datos inválidos', 400, {
			field: issue?.path[0],
		})
	}

	try {
		const { partner, changedFields } = await updatePartner(id, parsed.data)
		if (changedFields.length > 0) {
			await auditPartnerEvent({
				action: AuditAction.PARTNER_UPDATED,
				actor: resolveAuditActor(guard.session),
				request,
				partner,
				summary: `Partner actualizado (campos: ${changedFields.join(', ')})`,
			})
		}
		return NextResponse.json({ data: partner })
	} catch (error) {
		return partnerErrorResponse(error, 'Error al actualizar el partner')
	}
}
