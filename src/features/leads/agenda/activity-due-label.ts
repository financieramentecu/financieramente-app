import { formatDateTimeBogota } from '@/features/shared/lib/format-date'
import { getBogotaDayBounds } from '@/features/leads/tasks/agenda-bucket-range'

export interface ActivityDueLabel {
	label: string
	overdue: boolean
}

/** Due instant shown as the card label, in Bogotá time. */
export function activityDueCardText(dueAt: string | null, prefix: 'Vence' | 'SLA'): string {
	if (!dueAt) return 'Sin fecha límite'
	const formatted = formatDateTimeBogota(dueAt)
	if (formatted === '—') return 'Sin fecha límite'
	return `${prefix}: ${formatted}`
}

export function isActivityOverdue(dueAt: string | null, now: Date, closed: boolean): boolean {
	if (!dueAt || closed) return false
	const due = new Date(dueAt)
	return !Number.isNaN(due.getTime()) && due.getTime() < now.getTime()
}

/** Spanish due badge for an open task, using the Bogotá calendar day. */
export function describeActivityDue(dueAt: string | null, now: Date): ActivityDueLabel {
	if (!dueAt) return { label: 'Sin fecha', overdue: false }
	const due = new Date(dueAt)
	if (Number.isNaN(due.getTime())) return { label: 'Sin fecha', overdue: false }
	const { start, end } = getBogotaDayBounds(now)
	if (due < start) return { label: 'Vencida', overdue: true }
	if (due < end) return { label: 'Hoy', overdue: false }
	return { label: 'Próxima', overdue: false }
}
