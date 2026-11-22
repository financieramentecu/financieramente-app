import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadCrmEventInput } from '@/features/leads/crm/lead-crm-event.schema'
import type { TimelinePageDto } from '@/features/leads/activities/lead-timeline.types'

export async function fetchTimelinePage(leadId: number, cursor?: string | null): Promise<TimelinePageDto> {
	const params = new URLSearchParams({ limit: '25' })
	if (cursor) params.set('cursor', cursor)
	const response = await fetch(`/api/leads/${leadId}/activities?${params.toString()}`)
	if (!response.ok) throw new Error('timeline')
	const body = (await response.json()) as ApiResponse<TimelinePageDto>
	return { items: body.data?.items ?? [], nextCursor: body.data?.nextCursor ?? null }
}

export async function postLeadActivity(
	leadId: number,
	input: LeadCrmEventInput,
	files: readonly File[] = []
): Promise<void> {
	const response =
		files.length === 0
			? await fetch(`/api/leads/${leadId}/activities`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(input),
				})
			: await fetch(`/api/leads/${leadId}/activities`, {
					method: 'POST',
					body: activityFormData(input, files),
				})
	if (!response.ok) throw new Error('activity')
}

function activityFormData(input: LeadCrmEventInput, files: readonly File[]): FormData {
	const body = new FormData()
	body.set('event', JSON.stringify(input))
	for (const file of files) body.append('files', file)
	return body
}
