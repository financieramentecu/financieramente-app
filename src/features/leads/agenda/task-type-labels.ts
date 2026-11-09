import type { LeadTaskKind } from '@/features/leads/tasks/lead-task.schema'

export const TASK_TYPE_LABELS: Record<LeadTaskKind, string> = {
	TODO: 'Tarea',
	CALL: 'Llamada',
	MEETING: 'Reunión',
	EMAIL: 'Email',
	WHATSAPP: 'WhatsApp',
}
