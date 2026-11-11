import { DONE_LOOKBACK_DAYS, getBogotaDayBounds, UPCOMING_DAYS, type AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'
import { bogotaDateOnly, dateOnlyToBogotaNoonUtc } from '@/features/negocios/lib/bogota-date'

const DAY_MS = 24 * 60 * 60 * 1000

const OPEN_BUCKETS = ['overdue', 'today', 'upcoming'] as const
export type OpenActivityBucket = (typeof OPEN_BUCKETS)[number]

export const ACTIVITY_COLUMN_LABELS: Record<AgendaBucket, string> = {
	overdue: 'Vencidas',
	today: 'Vencen hoy',
	upcoming: 'Próximas a vencer',
	done: 'Completadas',
}

interface BucketTask {
	status: 'OPEN' | 'DONE' | 'CANCELLED'
	dueAt: string | Date | null
	completedAt: string | Date | null
}

function shiftDateOnly(dateOnly: string, days: number): string {
	const [year, month, day] = dateOnly.split('-').map(Number)
	return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** Noon UTC of the Bogotá day that lands the task in that open column. */
export function dueAtForActivityBucket(bucket: OpenActivityBucket, now: Date): Date {
	const today = bogotaDateOnly(now)
	const shift = bucket === 'overdue' ? -1 : bucket === 'today' ? 0 : 1
	return dateOnlyToBogotaNoonUtc(shiftDateOnly(today, shift))
}

/** Column of a task, or null when it falls outside the four agenda windows. */
export function activityBucket(task: BucketTask, now: Date): AgendaBucket | null {
	if (task.status === 'DONE') {
		if (!task.completedAt) return null
		const completed = new Date(task.completedAt)
		return completed >= new Date(now.getTime() - DONE_LOOKBACK_DAYS * DAY_MS) ? 'done' : null
	}
	if (task.status !== 'OPEN') return null
	if (!task.dueAt) return 'upcoming'
	const due = new Date(task.dueAt)
	const { start, end } = getBogotaDayBounds(now)
	if (due < start) return 'overdue'
	if (due < end) return 'today'
	if (due < new Date(end.getTime() + UPCOMING_DAYS * DAY_MS)) return 'upcoming'
	return null
}
