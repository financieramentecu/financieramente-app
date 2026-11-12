import { jsonOrFilesInit } from '@/features/leads/activities/json-or-files'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadTaskKind } from '@/features/leads/tasks/lead-task.schema'

export interface LeadTaskDto {
	idLeadTask: number
	title: string
	type: LeadTaskKind
	typeLabel?: string
	dueAt: string | null
	status: 'OPEN' | 'DONE' | 'CANCELLED'
	assignedTo: number
	completedAt: string | null
	assignee: { name: string; lastName: string | null }
}

export interface NewLeadTask {
	title: string
	assignedTo: number
	type: LeadTaskKind
	idLeadActivityLabel?: number
	dueAt?: string
}

export async function fetchLeadTasks(leadId: number): Promise<LeadTaskDto[]> {
	const response = await fetch(`/api/leads/${leadId}/tasks`)
	if (!response.ok) throw new Error('tasks')
	const body = (await response.json()) as ApiResponse<LeadTaskDto[]>
	return body.data ?? []
}

export async function createLeadTaskRequest(leadId: number, task: NewLeadTask): Promise<void> {
	const response = await fetch(`/api/leads/${leadId}/tasks`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(task),
	})
	if (!response.ok) throw new Error('create')
}

export async function completeLeadTaskRequest(
	idLeadTask: number,
	note: { comment?: string; files?: readonly File[] } = {}
): Promise<void> {
	const body = note.comment ? { action: 'complete', comment: note.comment } : { action: 'complete' }
	const response = await fetch(
		`/api/crm/tasks/${idLeadTask}`,
		jsonOrFilesInit('PATCH', body, note.files ?? [])
	)
	if (!response.ok) throw new Error('complete')
}
