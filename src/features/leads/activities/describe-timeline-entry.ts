import type { ContactOutcome } from '@/features/leads/crm/lead-crm-event.schema'
import type {
	TimelineChangeDto,
	TimelineEntryDto,
	TimelineIngressDto,
	TimelineStageDto,
} from '@/features/leads/activities/lead-timeline.types'

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
	TASK_COMMENTED: 'Comentario',
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

const CASE_STATUS_LABELS: Record<string, string> = {
	OPEN: 'Abierto',
	IN_PROGRESS: 'En proceso',
	WAITING: 'En espera',
	RESOLVED: 'Resuelto',
	CLOSED: 'Cerrado',
}

const STAGE_SOURCE_LABELS: Partial<Record<TimelineStageDto['source'], string>> = {
	CSV_IMPORT: 'Importación CSV',
}

export function timelineEntryKey(entry: TimelineEntryDto): string {
	if (entry.kind === 'stage_change') return `stage_change-${entry.idLeadStageHistory}`
	if (entry.kind === 'lead_change') return `lead_change-${entry.idLeadChangeHistory}`
	if (entry.kind === 'lead_ingress') return `lead_ingress-${entry.idLeadLink}`
	return `activity-${entry.idLeadActivity}`
}

/** Human-readable view of a timeline entry; never exposes raw payload JSON. */
export function describeTimelineEntry(entry: TimelineEntryDto): TimelineEntryView {
	if (entry.kind === 'lead_ingress') return describeIngress(entry)
	if (entry.kind === 'lead_change') return describeChange(entry)

	if (entry.kind === 'stage_change') {
		const meta = STAGE_SOURCE_LABELS[entry.source]
		return {
			title: 'Cambio de etapa',
			detail: entry.fromColumnName ? `${entry.fromColumnName} → ${entry.toColumnName}` : `Entró en ${entry.toColumnName}`,
			...(meta ? { meta } : {}),
			actor: entry.actorName ?? 'Asesor',
		}
	}

	const title = ACTIVITY_TITLES[entry.type] ?? 'Actividad'
	const { payload } = entry
	const base = { title, actor: entry.actorName }

	if ('action' in payload && payload.action === 'COMMENTED') {
		const about =
			('title' in payload && payload.title) ||
			('subject' in payload && payload.subject) ||
			('taskId' in payload ? `Tarea #${payload.taskId}` : `Caso #${payload.caseId}`)
		const written = 'comment' in payload && payload.comment ? payload.comment : null
		return {
			...base,
			title: written ?? about,
			detail: written ? about : '',
		}
	}

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
		const statusLabel = payload.status
			? (CASE_STATUS_LABELS[payload.status] ?? payload.status)
			: null
		const title =
			payload.status === 'CLOSED'
				? 'Caso cerrado'
				: payload.status === 'RESOLVED'
					? 'Caso resuelto'
					: base.title
		const detail = statusLabel ? `${subject} · ${statusLabel}` : subject
		return {
			...base,
			title,
			detail: payload.comment ? `${detail}\n${payload.comment}` : detail,
		}
	}
	const taskDetail = payload.title ?? `Tarea #${payload.taskId}`
	return { ...base, detail: payload.comment ? `${taskDetail}\n${payload.comment}` : taskDetail }
}

function describeChange(entry: TimelineChangeDto): TimelineEntryView {
	const from =
		entry.fromLabel ?? (entry.change === 'OWNER' ? 'Sin Money Strategy' : 'Sin origen')
	const title = entry.change === 'OWNER' ? 'Cambio de Money Strategy' : 'Cambio de origen'
	return {
		title,
		detail: `${from} → ${entry.toLabel}`,
		actor: entry.source === 'SYSTEM' ? 'Sistema' : (entry.actorName ?? 'Asesor'),
	}
}

function describeIngress(entry: TimelineIngressDto): TimelineEntryView {
	const hasOrigin = entry.originName !== 'Sin origen'
	const detail =
		entry.side === 'incoming'
			? hasOrigin
				? `Quedó relacionado con ${entry.relatedLeadName}. El ingreso es por ${entry.originName}.`
				: `Quedó relacionado con ${entry.relatedLeadName}.`
			: hasOrigin
				? `Está relacionado con ${entry.incomingLeadName}. Ese ingreso es por ${entry.originName}.`
				: `Está relacionado con ${entry.incomingLeadName}.`
	const meta = entry.source === 'MANUAL' ? 'Mismo Money Strategy · Validado en el CRM' : 'Coincidencia de datos de contacto'
	return {
		title: 'Relación entre leads',
		detail,
		meta,
		actor: entry.actorName ?? 'Sistema',
	}
}
