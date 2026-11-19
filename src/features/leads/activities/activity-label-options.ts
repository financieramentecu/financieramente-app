import type { ActivityLabel } from '@/features/leads/activities/activity-label.types'
import { taskTypeFromLabelCode } from '@/features/leads/activities/activity-label.types'
import { TASK_TYPE_LABELS } from '@/features/leads/agenda/task-type-labels'
import { LEAD_TASK_TYPES, type LeadTaskKind } from '@/features/leads/tasks/lead-task.schema'

export interface ActivityLabelOption {
	value: string
	name: string
	code: LeadTaskKind
	idLeadActivityLabel: number | null
}

/** Catalogue options, or the five built-in names when the catalogue is empty. */
export function activityLabelOptions(labels: readonly ActivityLabel[]): ActivityLabelOption[] {
	if (labels.length === 0) {
		return LEAD_TASK_TYPES.map((code) => ({
			value: code,
			name: TASK_TYPE_LABELS[code],
			code,
			idLeadActivityLabel: null,
		}))
	}
	return labels.map((label) => ({
		value: label.code ?? `custom:${label.idLeadActivityLabel}`,
		name: label.name,
		code: taskTypeFromLabelCode(label.code),
		idLeadActivityLabel: label.idLeadActivityLabel,
	}))
}
