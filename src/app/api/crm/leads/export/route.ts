import {
	crmErrorResponse as error,
	requireCrmActor,
	toCrmRequestContext,
	toLeadViewer,
} from '@/lib/auth/require-crm-actor'
import { parseLeadTableQuery } from '@/features/leads/table/lead-table-query.schema'
import { resolveLeadTableOptions } from '@/features/leads/table/build-lead-table-where'
import { exportLeadTable } from '@/features/leads/table/lead-table-export.service'
import { formatBogotaIsoDay } from '@/features/leads/table/build-lead-table-csv'
import { LEAD_TABLE_EXPORT_LIMIT } from '@/features/leads/table/lead-table.service'

/** GET /api/crm/leads/export — CSV of the filtered lead table (audited, capped). */
export async function GET(request: Request) {
	try {
		const guard = await requireCrmActor('crm_lead_table')
		if (!guard.ok) return guard.response
		const parsed = parseLeadTableQuery(new URL(request.url).searchParams)
		if (!parsed.ok) return error(parsed.error, 400)
		const result = await exportLeadTable(
			toLeadViewer(guard.actor),
			parsed.query,
			resolveLeadTableOptions(guard.actor.visibleUserIds),
			toCrmRequestContext(guard.actor, request)
		)
		if (!result.ok) {
			return error(`Demasiados registros: filtra hasta ${LEAD_TABLE_EXPORT_LIMIT.toLocaleString('es-CO')} leads`, 413)
		}
		return new Response(result.csv, {
			status: 200,
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="leads-${formatBogotaIsoDay(new Date())}.csv"`,
				'Cache-Control': 'no-store',
			},
		})
	} catch (cause) {
		console.error('Error exporting CRM lead table:', cause)
		return error('Error al exportar los leads', 500)
	}
}
