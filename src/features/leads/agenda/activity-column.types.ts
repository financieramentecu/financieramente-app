import type { AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'

export interface ActivityColumn {
	code: AgendaBucket
	name: string
	position: number
}
