import { LEAD_TASK_TYPES, type LeadTaskKind } from '@/features/leads/tasks/lead-task.schema'

export interface ActivityLabel {
	idLeadActivityLabel: number
	name: string
	color: string
	code: string | null
}

export const DEFAULT_ACTIVITY_LABEL_COLOR = '#64748b'

export function isLeadTaskKind(code: string): code is LeadTaskKind {
	return (LEAD_TASK_TYPES as readonly string[]).includes(code)
}

/** Built-in labels keep their task type. Custom labels stay a generic task. */
export function taskTypeFromLabelCode(code: string | null | undefined): LeadTaskKind {
	if (code && isLeadTaskKind(code)) return code
	return 'TODO'
}
