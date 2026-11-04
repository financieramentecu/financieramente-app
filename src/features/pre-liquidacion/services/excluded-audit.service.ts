import {
	AuditAction,
	logAuditEvent,
	type AuditLogParams,
} from '@/features/auth/lib/audit-logger'

/**
 * Request context available at the call site. Everything is optional: batch
 * and background paths may only know the acting user (or nobody). Nothing is
 * threaded through extra layers just to enrich the event.
 */
export type ExcludedAuditContext = Pick<
	AuditLogParams,
	'userId' | 'email' | 'ipAddress' | 'userAgent'
>

/** Only the known context fields are forwarded (callers may pass wider objects). */
function pickContext(context: ExcludedAuditContext | undefined) {
	return {
		userId: context?.userId,
		email: context?.email,
		ipAddress: context?.ipAddress,
		userAgent: context?.userAgent,
	}
}

export type ExcludedSource = 'LOAD' | 'PRE_LIQUIDACION' | 'LAG_RECOVERY'

/**
 * Audits settlement rows of PARTNER_EXTERNAL businesses that were stored or
 * converted as EXCLUDED (PL-01, PL-03).
 *
 * ONE aggregated event per processed file/batch carrying the count - never
 * one per row - so a large load does not flood the audit log. A single lag
 * recovery is described by its settlement row instead of a file. Nothing is
 * logged when `excludedCount` is 0. `logAuditEvent` never throws.
 */
export async function auditSettlementsExcluded(
	context: ExcludedAuditContext | undefined,
	input: {
		source: ExcludedSource
		excludedCount: number
		fileImportId?: number
		idSettlementCommission?: number
		idBusiness?: number
	}
): Promise<void> {
	if (input.excludedCount <= 0) return

	const target =
		input.idSettlementCommission !== undefined
			? {
					entityType: 'SETTLEMENT_COMMISSION',
					idSettlementCommission: input.idSettlementCommission,
					idBusiness: input.idBusiness,
				}
			: { entityType: 'FILE_IMPORT', fileImportId: input.fileImportId }

	await logAuditEvent({
		...pickContext(context),
		action: AuditAction.SETTLEMENT_EXCLUDED,
		details: JSON.stringify({
			...target,
			source: input.source,
			excludedCount: input.excludedCount,
		}),
	})
}

/**
 * Audits a file that was moved forward because it only holds EXCLUDED rows
 * (PL-02): LOAD -> PRE-SETTLED or PRE-SETTLED -> SETTLED.
 */
export async function auditExcludedOnlyFileClosed(
	context: ExcludedAuditContext | undefined,
	input: {
		fileImportId: number
		excludedCount: number
		fromStatus: string
		toStatus: string
	}
): Promise<void> {
	await logAuditEvent({
		...pickContext(context),
		action: AuditAction.FILE_IMPORT_EXCLUDED_ONLY_CLOSED,
		details: JSON.stringify({
			entityType: 'FILE_IMPORT',
			fileImportId: input.fileImportId,
			fromStatus: input.fromStatus,
			toStatus: input.toStatus,
			excludedCount: input.excludedCount,
		}),
	})
}
