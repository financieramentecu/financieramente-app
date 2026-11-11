import { getBogotaDayBounds } from '@/features/leads/tasks/agenda-bucket-range'

export interface ActivityDueLabel {
	label: string
	overdue: boolean
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
