import type { AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'
import type { LeadTaskKind } from '@/features/leads/tasks/lead-task.schema'

/** Agenda task as received by the browser (dates serialized). */
export interface AgendaTaskDto {
	idLeadTask: number
	idLead: number
	leadName: string
	title: string
	type: LeadTaskKind
	dueAt: string | null
	status: 'OPEN' | 'DONE' | 'CANCELLED'
	completedAt: string | null
}

export type AgendaByBucket = Record<AgendaBucket, AgendaTaskDto[]>
