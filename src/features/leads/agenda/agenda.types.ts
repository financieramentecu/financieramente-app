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

/** Open task on the activities Kanban (dates serialized). */
export interface ActivityBoardTaskDto {
	idLeadTask: number
	idLead: number
	leadName: string
	title: string
	type: LeadTaskKind
	/** Catalogue name. Absent until the board response includes it. */
	typeLabel?: string
	typeColor?: string
	dueAt: string | null
	status: 'OPEN' | 'DONE' | 'CANCELLED'
	completedAt: string | null
	createdAt: string
	assigneeName: string
	creatorName: string
	commentCount: number
	columnCode?: string | null
}

export type ActivityCaseStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED'
export type ActivityCasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

/** Support case on the same activities Kanban (dates serialized). */
export interface ActivityBoardCaseDto {
	idLeadSupportCase: number
	idLead: number
	leadName: string
	subject: string
	status: ActivityCaseStatus
	priority: ActivityCasePriority
	dueAt: string | null
	resolvedAt: string | null
	createdAt: string
	assigneeName: string
	commentCount: number
	columnCode?: string | null
}

export interface ActivityBoardDto {
	tasks: ActivityBoardTaskDto[]
	cases: ActivityBoardCaseDto[]
}

export type ActivityFocus = { kind: 'task' | 'case'; id: number }

export type ActivityFinishStatus = 'loading' | 'open' | 'closed' | 'missing'

/** Footer action for the activity sheet. The list owns the mutation. */
export interface ActivityFinishState {
	status: ActivityFinishStatus
	drafting: boolean
	pending: boolean
	includeCloseDate: boolean
}

export interface ActivityFinishActions {
	start: () => void
	cancel: () => void
	submit: (comment: string, files: File[], closeOn?: string) => void
}
