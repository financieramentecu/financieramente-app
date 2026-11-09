import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadTaskKind } from '@/features/leads/tasks/lead-task.schema'

export interface LeadTaskDto {
	idLeadTask: number
	title: string
	type: LeadTaskKind
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

export async function completeLeadTaskRequest(idLeadTask: number): Promise<void> {
	const response = await fetch(`/api/crm/tasks/${idLeadTask}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ action: 'complete' }),
	})
	if (!response.ok) throw new Error('complete')
}
