import { z } from 'zod'
import { bogotaDateOnly, dateOnlyToBogotaNoonUtc } from '@/features/negocios/lib/bogota-date'
import type { CrmReportQuery } from '@/features/leads/reports/crm-pipeline-report.types'

export const CRM_REPORT_DEFAULT_DAYS = 90
export const CRM_REPORT_MAX_DAYS = 366
export const CRM_REPORT_MAX_OWNERS = 50

const DAY_MS = 24 * 60 * 60 * 1000
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

export type CrmReportQueryResult = { ok: true; query: CrmReportQuery } | { ok: false; error: string }

function isCalendarDay(value: string): boolean {
	return ISO_DAY.test(value) && bogotaDateOnly(dateOnlyToBogotaNoonUtc(value)) === value
}

const isoDay = z.string().refine(isCalendarDay, 'Fecha inválida')

const crmReportQuerySchema = z.object({
	from: isoDay.optional(),
	to: isoDay.optional(),
	ownerIds: z
		.array(z.coerce.number().int().positive().max(2_147_483_647))
		.max(CRM_REPORT_MAX_OWNERS, `Máximo ${CRM_REPORT_MAX_OWNERS} responsables`),
})

/** Inclusive number of days between two `YYYY-MM-DD` values. */
function spanDays(from: string, to: string): number {
	return Math.round((dateOnlyToBogotaNoonUtc(to).getTime() - dateOnlyToBogotaNoonUtc(from).getTime()) / DAY_MS) + 1
}

function defaultRange(now: Date): { from: string; to: string } {
	const to = bogotaDateOnly(now)
	const from = bogotaDateOnly(new Date(dateOnlyToBogotaNoonUtc(to).getTime() - (CRM_REPORT_DEFAULT_DAYS - 1) * DAY_MS))
	return { from, to }
}

/** `?from&to&owner` of the pipeline report; defaults to the last 90 Bogotá days. */
export function parseCrmReportQuery(params: URLSearchParams, now: Date = new Date()): CrmReportQueryResult {
	const parsed = crmReportQuerySchema.safeParse({
		from: params.get('from') ?? undefined,
		to: params.get('to') ?? undefined,
		ownerIds: params.getAll('owner'),
	})
	if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Parámetros inválidos' }

	const { from, to } = parsed.data
	if ((from === undefined) !== (to === undefined)) {
		return { ok: false, error: 'Indica la fecha inicial y la final' }
	}
	const range = from && to ? { from, to } : defaultRange(now)
	if (range.from > range.to) return { ok: false, error: 'La fecha inicial no puede ser posterior a la final' }
	if (spanDays(range.from, range.to) > CRM_REPORT_MAX_DAYS) {
		return { ok: false, error: `El rango admite máximo ${CRM_REPORT_MAX_DAYS} días` }
	}

	return { ok: true, query: { ...range, ownerIds: [...new Set(parsed.data.ownerIds)] } }
}
