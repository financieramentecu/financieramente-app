import type { LeadActivityPayload, LeadActivityKind } from '@/features/leads/activities/lead-activity.service'
import type { LeadLinkSide, LeadLinkSourceName } from '@/features/leads/types/lead-link.types'

export type LeadChangeKindName = 'OWNER' | 'ORIGIN'
export type LeadChangeSourceName = 'SYSTEM' | 'MANUAL'

interface TimelineSourceContext {
	idLead?: number
	captureName?: string | null
}

/** Timeline entries as received by the browser (dates serialized). */
export type TimelineActivityDto = TimelineSourceContext & {
	kind?: 'activity'
	idLeadActivity: number
	type: LeadActivityKind
	occurredAt: string
	actorName: string
	payload: LeadActivityPayload
}

export type TimelineStageDto = TimelineSourceContext & {
	kind: 'stage_change'
	idLeadStageHistory: number
	occurredAt: string
	actorName: string | null
	fromColumnName: string | null
	toColumnName: string
	source: 'CRM_SYNC' | 'CSV_IMPORT' | 'MANUAL' | 'LANDING_FORM'
}

export type TimelineChangeDto = TimelineSourceContext & {
	kind: 'lead_change'
	idLeadChangeHistory: number
	occurredAt: string
	change: LeadChangeKindName
	source: LeadChangeSourceName
	actorName: string | null
	fromLabel: string | null
	toLabel: string
}

export type TimelineIngressDto = TimelineSourceContext & {
	kind: 'lead_ingress'
	idLeadLink: number
	occurredAt: string
	actorName: string | null
	originName: string
	incomingLeadName: string
	relatedLeadName: string
	side: LeadLinkSide
	source: LeadLinkSourceName
}

export type TimelineEntryDto = TimelineActivityDto | TimelineStageDto | TimelineChangeDto | TimelineIngressDto

export interface TimelinePageDto {
	items: TimelineEntryDto[]
	nextCursor: string | null
}
