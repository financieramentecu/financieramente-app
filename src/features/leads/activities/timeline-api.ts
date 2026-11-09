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

export async function postLeadActivity(leadId: number, input: LeadCrmEventInput): Promise<void> {
	const response = await fetch(`/api/leads/${leadId}/activities`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	if (!response.ok) throw new Error('activity')
}
