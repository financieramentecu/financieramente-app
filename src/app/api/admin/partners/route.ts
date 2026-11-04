import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { createPartnerSchema } from '@/features/admin/partners/lib/partner-schemas'
import {
	errorJson,
	partnerErrorResponse,
} from '@/features/admin/partners/lib/partner-http'
import {
	createPartner,
	listPartners,
} from '@/features/admin/partners/services/partner.service'
import { deliverActivationLink } from '@/features/admin/partners/services/partner-delivery'
import {
	auditPartnerEvent,
	resolveAuditActor,
} from '@/features/admin/partners/services/partner-audit.service'
import type {
	PartnerDto,
	PartnerWithEmailResult,
} from '@/features/admin/partners/types/partner.types'

/**
 * GET /api/admin/partners
 * Lists partners with their derived status (ADMIN only).
 */
export async function GET(): Promise<NextResponse<ApiResponse<PartnerDto[]>>> {
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response as NextResponse<ApiResponse<PartnerDto[]>>
	}

	try {
		return NextResponse.json({ data: await listPartners() })
	} catch (error) {
		return partnerErrorResponse(error, 'Error al listar partners')
	}
}

/**
 * POST /api/admin/partners
 * Creates a partner (ADMIN only): user + ACTIVATION token in one transaction,
 * then the activation e-mail. A mail failure never rolls the creation back.
 */
export async function POST(
	request: Request
): Promise<NextResponse<ApiResponse<PartnerWithEmailResult>>> {
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response as NextResponse<ApiResponse<PartnerWithEmailResult>>
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return errorJson('Solicitud inválida', 400)
	}

	const parsed = createPartnerSchema.safeParse(body)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		return errorJson(issue?.message ?? 'Datos inválidos', 400, {
			field: issue?.path[0],
		})
	}

	try {
		const { partner, rawToken } = await createPartner(parsed.data)
		const emailSent = await deliverActivationLink(partner, rawToken)

		await auditPartnerEvent({
			action: AuditAction.PARTNER_CREATED,
			actor: resolveAuditActor(guard.session),
			request,
			partner,
			summary: 'Partner creado',
		})

		return NextResponse.json(
			{ data: { ...partner, emailSent } },
			{ status: 201 }
		)
	} catch (error) {
		return partnerErrorResponse(error, 'Error al crear el partner')
	}
}
