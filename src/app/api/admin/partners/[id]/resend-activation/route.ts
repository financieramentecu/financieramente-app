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
import { reissuePartnerActivation } from '@/features/admin/partners/services/partner.service'
import { deliverActivationLink } from '@/features/admin/partners/services/partner-delivery'
import {
	auditPartnerEvent,
	resolveAuditActor,
} from '@/features/admin/partners/services/partner-audit.service'
import type { PartnerWithEmailResult } from '@/features/admin/partners/types/partner.types'

/**
 * POST /api/admin/partners/[id]/resend-activation
 * Only for active, never-activated partners: issues a new token (revoking the
 * previous link) and sends the e-mail. ADMIN only.
 */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PartnerWithEmailResult>>> {
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response as NextResponse<ApiResponse<PartnerWithEmailResult>>
	}

	const id = parsePartnerId((await params).id)
	if (id === null) return errorJson('ID de partner inválido', 400)

	try {
		const { partner, rawToken } = await reissuePartnerActivation(id)
		const emailSent = await deliverActivationLink(partner, rawToken)
		await auditPartnerEvent({
			action: AuditAction.PARTNER_ACTIVATION_RESENT,
			actor: resolveAuditActor(guard.session),
			request,
			partner,
			summary: 'Activación reenviada',
		})
		return NextResponse.json({ data: { ...partner, emailSent } })
	} catch (error) {
		return partnerErrorResponse(error, 'Error al reenviar la activación')
	}
}
