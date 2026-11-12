import { NextResponse } from 'next/server'
import {
	AuditAction,
	getClientIp,
	getUserAgent,
	logAuditEvent,
} from '@/features/auth/lib/audit-logger'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'
import {
	crmErrorResponse,
	requireCrmActor,
	toLeadViewer,
} from '@/lib/auth/require-crm-actor'
import type { CrmActor } from '@/lib/auth/require-crm-actor'

export type CrmReportAccess =
	| { ok: true; actor: CrmActor }
	| { ok: false; response: NextResponse }

/** Session, CRM reports flag, and the CRM pipeline report permission. */
export async function authorizeCrmReport(): Promise<CrmReportAccess> {
	const guard = await requireCrmActor('crm_reports')
	if (!guard.ok) return guard
	const allowed = await canViewReport(
		{ roleCode: guard.actor.roleCode, idCategory: guard.actor.idCategory },
		REPORT_CODES.CRM_PIPELINE
	)
	if (!allowed)
		return {
			ok: false,
			response: crmErrorResponse(
				'No tienes permiso para ver este reporte',
				403
			),
		}
	return { ok: true, actor: guard.actor }
}

export function crmReportViewer(actor: CrmActor) {
	return { viewer: toLeadViewer(actor), visibleUserIds: actor.visibleUserIds }
}

export function logCrmReportExport(
	actor: CrmActor,
	request: Request,
	details: string
): Promise<void> {
	return logAuditEvent({
		userId: actor.idUser,
		action: AuditAction.REPORT_EXPORTED,
		email: actor.email,
		ipAddress: getClientIp(request.headers),
		userAgent: getUserAgent(request.headers),
		details,
	})
}
