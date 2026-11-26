import type { CrmReportRange } from '@/features/leads/reports/crm-pipeline-report.types'

/** One stay of one lead in one funnel stage. Used by the Excel and PDF export. */
export interface CrmStageDetailRow {
	idLead: number
	leadName: string
	advisorName: string
	stageName: string
	enteredAt: string
	leftAt: string | null
	durationMs: number
	current: boolean
}

export const CRM_STAGE_DETAIL_VIEWS = ['current', 'history'] as const
export type CrmStageDetailView = (typeof CRM_STAGE_DETAIL_VIEWS)[number]

export const CRM_STAGE_DETAIL_PAGE_SIZES = [10, 20, 50, 100] as const
export type CrmStageDetailPageSize = (typeof CRM_STAGE_DETAIL_PAGE_SIZES)[number]
export const CRM_STAGE_DETAIL_DEFAULT_PAGE_SIZE: CrmStageDetailPageSize = 20

export function isCrmStageDetailPageSize(value: number): value is CrmStageDetailPageSize {
	return (CRM_STAGE_DETAIL_PAGE_SIZES as readonly number[]).includes(value)
}

export interface CrmStageDetailTask {
	title: string
	status: 'OPEN' | 'DONE' | 'CANCELLED'
	completedAt: string | null
}

export interface CrmStageDetailCase {
	subject: string
	status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED'
	resolvedAt: string | null
}

export interface CrmStageDetailStay {
	stageName: string
	enteredAt: string
	leftAt: string | null
	durationMs: number
	current: boolean
}

/** One lead, grouped on its current stage, with the history needed to expand it. */
export interface CrmStageDetailLead {
	idLead: number
	leadName: string
	advisorName: string
	currentStage: string
	stays: CrmStageDetailStay[]
	tasks: CrmStageDetailTask[]
	cases: CrmStageDetailCase[]
}

export interface CrmStageDetailFilter {
	view: CrmStageDetailView
	stage: string | null
}

export interface CrmStageDetailPage {
	range: CrmReportRange
	stages: string[]
	view: CrmStageDetailView
	stage: string | null
	leads: CrmStageDetailLead[]
	page: number
	pageSize: number
	totalLeads: number
}
