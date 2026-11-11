import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { AGENDA_BUCKETS, type AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'
import type { ActivityBoardTaskDto, AgendaByBucket, AgendaTaskDto } from '@/features/leads/agenda/agenda.types'

async function fetchBucket(bucket: AgendaBucket): Promise<AgendaTaskDto[]> {
	const response = await fetch(`/api/crm/tasks?bucket=${bucket}`)
	if (!response.ok) throw new Error('agenda')
	const body = (await response.json()) as ApiResponse<AgendaTaskDto[]>
	return body.data ?? []
}

export async function fetchAgenda(): Promise<AgendaByBucket> {
	const lists = await Promise.all(AGENDA_BUCKETS.map(fetchBucket))
	return Object.fromEntries(AGENDA_BUCKETS.map((bucket, index) => [bucket, lists[index]])) as AgendaByBucket
}

export async function fetchActivityBoard(ownerIds: number[]): Promise<ActivityBoardTaskDto[]> {
	const params = new URLSearchParams({ view: 'board' })
	for (const ownerId of ownerIds) params.append('owner', String(ownerId))
	const response = await fetch(`/api/crm/tasks?${params.toString()}`)
	if (!response.ok) throw new Error('agenda')
	const body = (await response.json()) as ApiResponse<ActivityBoardTaskDto[]>
	return body.data ?? []
}

export async function moveTask(idLeadTask: number, bucket: AgendaBucket): Promise<void> {
	const response = await fetch(`/api/crm/tasks/${idLeadTask}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ action: 'move', bucket }),
	})
	if (!response.ok) throw new Error('move')
}
