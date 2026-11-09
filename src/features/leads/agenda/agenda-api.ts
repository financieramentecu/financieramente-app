import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { AGENDA_BUCKETS, type AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'
import type { AgendaByBucket, AgendaTaskDto } from '@/features/leads/agenda/agenda.types'

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

export async function completeTask(idLeadTask: number): Promise<void> {
	const response = await fetch(`/api/crm/tasks/${idLeadTask}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ action: 'complete' }),
	})
	if (!response.ok) throw new Error('complete')
}
