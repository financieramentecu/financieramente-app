import { ACTIVITY_COLUMN_LABELS } from '@/features/leads/agenda/activity-bucket'
import { AGENDA_BUCKETS } from '@/features/leads/tasks/agenda-bucket-range'

/** Lowercase code of a board column. System codes are the four due-date buckets. */
export const ACTIVITY_COLUMN_CODE = /^[a-z0-9]{1,20}$/

export interface ActivityColumn {
	code: string
	name: string
	position: number
	system: boolean
}

export const BUILTIN_ACTIVITY_COLUMNS: ActivityColumn[] = AGENDA_BUCKETS.map((code, position) => ({
	code,
	name: ACTIVITY_COLUMN_LABELS[code],
	position,
	system: true,
}))
