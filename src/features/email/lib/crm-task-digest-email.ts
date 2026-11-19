import { buildEmailTemplate, escapeHtml } from '@/features/email/lib/email-template-base'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'

export interface DigestTask {
	title: string
	leadName: string
	dueAt: Date
}

export interface CrmTaskDigestParams {
	recipientName: string
	overdue: DigestTask[]
	today: DigestTask[]
	baseUrl: string
}

export function buildCrmTaskDigestSubject(overdueCount: number, todayCount: number): string {
	const parts = [
		overdueCount > 0 ? `${overdueCount} ${overdueCount === 1 ? 'vencida' : 'vencidas'}` : null,
		todayCount > 0 ? `${todayCount} para hoy` : null,
	].filter(Boolean)
	return `Tus actividades del CRM: ${parts.join(', ')}`
}

function agendaUrl(baseUrl: string): string {
	return `${baseUrl}/dashboard/negocios/crm?tab=actividades`
}

function renderList(heading: string, tasks: DigestTask[]): string {
	if (tasks.length === 0) return ''
	const rows = tasks
		.map((task) => `<li><strong>${escapeHtml(task.title)}</strong> — ${escapeHtml(task.leadName)} · ${escapeHtml(formatDateTimeBogota(task.dueAt))}</li>`)
		.join('')
	return `<div class="info-box"><h3>${escapeHtml(heading)}</h3><ul>${rows}</ul></div>`
}

export function renderCrmTaskDigestHtml(params: CrmTaskDigestParams): string {
	const url = agendaUrl(params.baseUrl)
	const content = `
		<p class="greeting">Hola ${escapeHtml(params.recipientName)},</p>
		<p class="message">Este es el resumen de tus actividades pendientes en el CRM.</p>
		${renderList('Vencidas', params.overdue)}
		${renderList('Para hoy', params.today)}
		<div class="cta-container"><a href="${url}" class="cta-button">Ver mis actividades</a></div>
	`
	return buildEmailTemplate({
		title: 'Tus actividades del día',
		logoUrl: `${params.baseUrl}/brand/logo-on-light.svg`,
		content,
	})
}

export function renderCrmTaskDigestText(params: CrmTaskDigestParams): string {
	const list = (heading: string, tasks: DigestTask[]) =>
		tasks.length === 0 ? '' : `${heading}:\n${tasks.map((t) => `- ${t.title} — ${t.leadName} · ${formatDateTimeBogota(t.dueAt)}`).join('\n')}\n\n`
	return `Hola ${params.recipientName},\n\nEste es el resumen de tus actividades pendientes en el CRM.\n\n${list('Vencidas', params.overdue)}${list('Para hoy', params.today)}Ver mis actividades: ${agendaUrl(params.baseUrl)}\n`
}
