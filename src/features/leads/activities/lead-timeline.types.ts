import type { LeadActivityPayload, LeadActivityKind } from '@/features/leads/activities/lead-activity.service'

/** Timeline entries as received by the browser (dates serialized). */
export type TimelineActivityDto = {
	kind?: 'activity'
	idLeadActivity: number
	type: LeadActivityKind
	occurredAt: string
	actorName: string
	payload: LeadActivityPayload
}

export type TimelineStageDto = {
	kind: 'stage_change'
	idLeadStageHistory: number
	occurredAt: string
	actorName: string | null
	fromColumnName: string | null
	toColumnName: string
	source: 'CRM_SYNC' | 'CSV_IMPORT' | 'MANUAL'
}

export type TimelineEntryDto = TimelineActivityDto | TimelineStageDto

export interface TimelinePageDto {
	items: TimelineEntryDto[]
	nextCursor: string | null
}
