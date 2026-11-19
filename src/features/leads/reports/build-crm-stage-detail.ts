import { buildStageStays, type StageChangeEvent } from '@/features/leads/lib/build-stage-stays'
import type {
	CrmStageDetailCase,
	CrmStageDetailFilter,
	CrmStageDetailLead,
	CrmStageDetailRow,
	CrmStageDetailStay,
	CrmStageDetailTask,
} from '@/features/leads/reports/crm-stage-detail.types'

export interface CrmStageDetailTaskInput {
	title: string
	status: CrmStageDetailTask['status']
	completedAt: Date | null
}

export interface CrmStageDetailCaseInput {
	subject: string
	status: CrmStageDetailCase['status']
	resolvedAt: Date | null
}

export interface CrmStageDetailLeadInput {
	idLead: number
	leadName: string
	advisorName: string
	createdAt: Date
	currentColumnName: string
	events: StageChangeEvent[]
	tasks?: readonly CrmStageDetailTaskInput[]
	cases?: readonly CrmStageDetailCaseInput[]
}

function byAdvisorAndLead(left: CrmStageDetailLeadInput, right: CrmStageDetailLeadInput): number {
	return (
		left.advisorName.localeCompare(right.advisorName, 'es') ||
		left.leadName.localeCompare(right.leadName, 'es') ||
		left.idLead - right.idLead
	)
}

/** Every stage stay of every lead, including the stay that is still open. */
export function buildCrmStageDetailRows(
	leads: readonly CrmStageDetailLeadInput[],
	now: Date
): CrmStageDetailRow[] {
	const rows: CrmStageDetailRow[] = []
	for (const lead of leads.toSorted(byAdvisorAndLead)) {
		const stays = buildStageStays({
			createdAt: lead.createdAt,
			currentColumnName: lead.currentColumnName,
			events: lead.events,
			now,
		})
		for (const stay of stays) {
			rows.push({
				idLead: lead.idLead,
				leadName: lead.leadName,
				advisorName: lead.advisorName,
				stageName: stay.columnName,
				enteredAt: stay.enteredAt.toISOString(),
				leftAt: stay.leftAt ? stay.leftAt.toISOString() : null,
				durationMs: stay.durationMs,
				current: stay.current,
			})
		}
	}
	return rows
}

function toStay(stay: {
	columnName: string
	enteredAt: Date
	leftAt: Date | null
	durationMs: number
	current: boolean
}): CrmStageDetailStay {
	return {
		stageName: stay.columnName,
		enteredAt: stay.enteredAt.toISOString(),
		leftAt: stay.leftAt ? stay.leftAt.toISOString() : null,
		durationMs: stay.durationMs,
		current: stay.current,
	}
}

function toTask(task: CrmStageDetailTaskInput): CrmStageDetailTask {
	return {
		title: task.title,
		status: task.status,
		completedAt: task.completedAt ? task.completedAt.toISOString() : null,
	}
}

function toCase(supportCase: CrmStageDetailCaseInput): CrmStageDetailCase {
	return {
		subject: supportCase.subject,
		status: supportCase.status,
		resolvedAt: supportCase.resolvedAt ? supportCase.resolvedAt.toISOString() : null,
	}
}

/** One grouped row per lead. The open stay is the lead's last stage. */
export function buildCrmStageDetailLeads(
	leads: readonly CrmStageDetailLeadInput[],
	now: Date
): CrmStageDetailLead[] {
	return leads.toSorted(byAdvisorAndLead).map((lead) => {
		const stays = buildStageStays({
			createdAt: lead.createdAt,
			currentColumnName: lead.currentColumnName,
			events: lead.events,
			now,
		}).map(toStay)
		const current = stays.find((stay) => stay.current)
		return {
			idLead: lead.idLead,
			leadName: lead.leadName,
			advisorName: lead.advisorName,
			currentStage: current?.stageName ?? lead.currentColumnName,
			stays,
			tasks: (lead.tasks ?? []).map(toTask),
			cases: (lead.cases ?? []).map(toCase),
		}
	})
}

/** Stage names a filter can offer, from the current stage and from past stays. */
export function listCrmStageDetailStages(leads: readonly CrmStageDetailLead[]): string[] {
	const names = new Set<string>()
	for (const lead of leads) {
		names.add(lead.currentStage)
		for (const stay of lead.stays) names.add(stay.stageName)
	}
	return [...names].sort((left, right) => left.localeCompare(right, 'es'))
}

/**
 * `current` keeps leads whose last stage matches.
 * `history` keeps leads that spent time in that stage, including the last one.
 * An empty stage keeps every lead.
 */
export function filterCrmStageDetailLeads(
	leads: readonly CrmStageDetailLead[],
	filter: CrmStageDetailFilter
): CrmStageDetailLead[] {
	if (!filter.stage) return [...leads]
	if (filter.view === 'history') {
		return leads.filter((lead) =>
			lead.stays.some((stay) => stay.stageName === filter.stage)
		)
	}
	return leads.filter((lead) => lead.currentStage === filter.stage)
}
