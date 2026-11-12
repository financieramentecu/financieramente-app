import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import type { LeadViewer } from '@/features/leads/types/lead.types'
import type { LeadTableWhereOptions } from '@/features/leads/table/build-lead-table-where'
import { buildLeadTableCsv } from '@/features/leads/table/build-lead-table-csv'
import { toLeadTableSearchParams, type LeadTableQuery } from '@/features/leads/table/lead-table-query.schema'
import { listLeadTableForExport } from '@/features/leads/table/lead-table.service'

export type LeadTableExport = { ok: true; csv: string; rowCount: number } | { ok: false; reason: 'TOO_MANY_ROWS' }

/** CSV of the filtered lead table; every successful export is audited (personal data leaves the system). */
export async function exportLeadTable(
	viewer: LeadViewer,
	query: LeadTableQuery,
	options: LeadTableWhereOptions,
	ctx: CrmRequestContext
): Promise<LeadTableExport> {
	const result = await listLeadTableForExport(viewer, query, options)
	if (!result.ok) return result
	const filters = toLeadTableSearchParams({ ...query, page: 1 }).toString() || 'no filters'
	await logAuditEvent({
		userId: ctx.userId,
		email: ctx.email,
		ipAddress: ctx.ipAddress,
		userAgent: ctx.userAgent,
		action: AuditAction.LEAD_TABLE_EXPORTED,
		details: `Lead table exported: ${result.rows.length} rows (${filters})`,
	})
	return { ok: true, csv: buildLeadTableCsv(result.rows), rowCount: result.rows.length }
}
