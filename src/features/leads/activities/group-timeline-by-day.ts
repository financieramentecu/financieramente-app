import type { TimelineEntryDto } from '@/features/leads/activities/lead-timeline.types'
import { bogotaDateOnly } from '@/features/negocios/lib/bogota-date'
import { formatDateBogota } from '@/features/shared/lib/format-date'

export interface TimelineDayGroup {
	day: string
	label: string
	items: TimelineEntryDto[]
}

/** Groups timeline entries by the Bogotá calendar day, keeping the incoming order. */
export function groupTimelineByDay(items: readonly TimelineEntryDto[]): TimelineDayGroup[] {
	const groups: TimelineDayGroup[] = []
	for (const item of items) {
		const occurredAt = new Date(item.occurredAt)
		if (Number.isNaN(occurredAt.getTime())) continue
		const day = bogotaDateOnly(occurredAt)
		const current = groups.at(-1)
		if (current?.day === day) {
			current.items.push(item)
			continue
		}
		groups.push({ day, label: formatDateBogota(occurredAt), items: [item] })
	}
	return groups
}
