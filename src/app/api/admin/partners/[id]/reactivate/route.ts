import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	errorJson,
	parsePartnerId,
	partnerErrorResponse,
} from '@/features/admin/partners/lib/partner-http'
import { reactivatePartner } from '@/features/admin/partners/services/partner.service'
import {
	auditPartnerEvent,
	resolveAuditActor,
} from '@/features/admin/partners/services/partner-audit.service'
import type { PartnerDto } from '@/features/admin/partners/types/partner.types'

/**
 * POST /api/admin/partners/[id]/reactivate
 * Sets active=true. Keeps activatedAt and the password; a partner who never
 * activated stays pending and needs "resend activation". ADMIN only.
 */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PartnerDto>>> {
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response as NextResponse<ApiResponse<PartnerDto>>
	}

	const id = parsePartnerId((await params).id)
	if (id === null) return errorJson('ID de partner inválido', 400)

	try {
		const partner = await reactivatePartner(id)
		await auditPartnerEvent({
			action: AuditAction.PARTNER_REACTIVATED,
			actor: resolveAuditActor(guard.session),
			request,
			partner,
			summary: 'Partner reactivado',
		})
		return NextResponse.json({ data: partner })
	} catch (error) {
		return partnerErrorResponse(error, 'Error al reactivar el partner')
	}
}
