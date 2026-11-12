import type { Prisma } from '@prisma/client'
import { todayBogota } from '@/features/negocios/lib/bogota-date'

export const AGENDA_BUCKETS = ['overdue', 'today', 'upcoming', 'done'] as const
export type AgendaBucket = (typeof AGENDA_BUCKETS)[number]

export function isAgendaBucket(value: string): value is AgendaBucket {
	return (AGENDA_BUCKETS as readonly string[]).includes(value)
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
/** America/Bogota is UTC-5 all year (no DST). */
const BOGOTA_OFFSET_MS = 5 * HOUR_MS
export const UPCOMING_DAYS = 14
export const DONE_LOOKBACK_DAYS = 7

/** [start, end) of the Bogotá calendar day containing `now`, as UTC instants. */
export function getBogotaDayBounds(now: Date): { start: Date; end: Date } {
	const start = new Date(todayBogota(now).getTime() + BOGOTA_OFFSET_MS)
	return { start, end: new Date(start.getTime() + DAY_MS) }
}

/** Status/date filter of an agenda bucket (Odoo "My activities" style). */
export function getAgendaBucketWhere(bucket: AgendaBucket, now: Date): Prisma.LeadTaskWhereInput {
	const { start, end } = getBogotaDayBounds(now)
	switch (bucket) {
		case 'overdue':
			return { status: 'OPEN', dueAt: { lt: start } }
		case 'today':
			return { status: 'OPEN', dueAt: { gte: start, lt: end } }
		case 'upcoming':
			return {
				status: 'OPEN',
				OR: [{ dueAt: { gte: end, lt: new Date(end.getTime() + UPCOMING_DAYS * DAY_MS) } }, { dueAt: null }],
			}
		case 'done':
			return { status: 'DONE', completedAt: { gte: new Date(now.getTime() - DONE_LOOKBACK_DAYS * DAY_MS) } }
	}
}
