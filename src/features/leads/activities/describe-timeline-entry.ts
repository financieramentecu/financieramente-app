import type { ContactOutcome } from '@/features/leads/crm/lead-crm-event.schema'
import type { TimelineEntryDto, TimelineStageDto } from '@/features/leads/activities/lead-timeline.types'

export interface TimelineEntryView {
	title: string
	detail: string
	meta?: string
	actor: string
}

const ACTIVITY_TITLES: Record<string, string> = {
	NOTE_ADDED: 'Nota de seguimiento',
	CALL_LOGGED: 'Llamada registrada',
	MEETING_LOGGED: 'Reunión registrada',
	EMAIL_LOGGED: 'Email registrado',
	WHATSAPP_LOGGED: 'WhatsApp registrado',
	TASK_CREATED: 'Tarea creada',
	TASK_COMPLETED: 'Tarea completada',
	TASK_REASSIGNED: 'Tarea reasignada',
	CONVERTED: 'Lead convertido a negocio',
	BUSINESS_LINKED: 'Negocio vinculado',
	CASE_OPENED: 'Caso de soporte abierto',
	CASE_UPDATED: 'Caso de soporte actualizado',
}

export const CONTACT_OUTCOME_LABELS: Record<ContactOutcome, string> = {
	CONNECTED: 'Contactado',
	NO_ANSWER: 'No contestó',
	LEFT_MESSAGE: 'Dejó mensaje',
	RESCHEDULED: 'Reprogramado',
}

const STAGE_SOURCE_LABELS: Record<TimelineStageDto['source'], string> = {
	CRM_SYNC: 'GHL',
	CSV_IMPORT: 'Importación CSV',
	MANUAL: 'Manual',
}

export function timelineEntryKey(entry: TimelineEntryDto): string {
	return entry.kind === 'stage_change' ? `stage_change-${entry.idLeadStageHistory}` : `activity-${entry.idLeadActivity}`
}

/** Human-readable view of a timeline entry; never exposes raw payload JSON. */
export function describeTimelineEntry(entry: TimelineEntryDto): TimelineEntryView {
	if (entry.kind === 'stage_change') {
		return {
			title: 'Cambio de etapa',
			detail: entry.fromColumnName ? `${entry.fromColumnName} → ${entry.toColumnName}` : `Entró en ${entry.toColumnName}`,
			meta: STAGE_SOURCE_LABELS[entry.source],
			actor: entry.actorName ?? 'Sistema',
		}
	}

	const title = ACTIVITY_TITLES[entry.type] ?? 'Actividad'
	const { payload } = entry
	const base = { title, actor: entry.actorName }

	if ('note' in payload) return { ...base, detail: payload.note }
	if ('summary' in payload) {
		const meta = [
			payload.outcome ? CONTACT_OUTCOME_LABELS[payload.outcome] : null,
			payload.durationMinutes ? `${payload.durationMinutes} min` : null,
		]
			.filter(Boolean)
			.join(' · ')
		return meta ? { ...base, detail: payload.summary, meta } : { ...base, detail: payload.summary }
	}
	if ('businessId' in payload) return { ...base, detail: `Negocio #${payload.businessId}` }
	if ('caseId' in payload) {
		const subject = payload.subject ?? `Caso #${payload.caseId}`
		return { ...base, detail: payload.status ? `${subject} · ${payload.status}` : subject }
	}
	return { ...base, detail: payload.title ?? `Tarea #${payload.taskId}` }
}
