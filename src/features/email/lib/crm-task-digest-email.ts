import { buildEmailTemplate, escapeHtml } from '@/features/email/lib/email-template-base'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'

export interface DigestTask {
	title: string
	leadName: string
	dueAt: Date
	detailPath: string
}

export interface CrmTaskDigestParams {
	recipientName: string
	overdue: DigestTask[]
	baseUrl: string
}

export function buildCrmTaskDigestSubject(overdueCount: number): string {
	const label = overdueCount === 1 ? '1 vencida' : `${overdueCount} vencidas`
	return `Tus actividades vencidas del CRM: ${label}`
}

function taskUrl(baseUrl: string, detailPath: string): string {
	return `${baseUrl}${detailPath}`
}

function renderOverdue(tasks: DigestTask[], baseUrl: string): string {
	if (tasks.length === 0) return ''
	const rows = tasks
		.map((task) => {
			const href = escapeHtml(taskUrl(baseUrl, task.detailPath))
			return `<li><strong>${escapeHtml(task.title)}</strong> — ${escapeHtml(task.leadName)} · vence ${escapeHtml(formatDateTimeBogota(task.dueAt))} · <a href="${href}">Abrir en el CRM</a></li>`
		})
		.join('')
	return `<div class="info-box"><h3>Vencidas y pendientes</h3><ul>${rows}</ul></div>`
}

/** Email for open tasks that are already overdue. Today and upcoming stay in the app. */
export function renderCrmTaskDigestHtml(params: CrmTaskDigestParams): string {
	const content = `
		<p class="greeting">Hola ${escapeHtml(params.recipientName)},</p>
		<p class="message">Estas actividades del CRM ya vencieron y siguen pendientes.</p>
		${renderOverdue(params.overdue, params.baseUrl)}
	`
	return buildEmailTemplate({
		title: 'Actividades vencidas',
		logoUrl: `${params.baseUrl}/brand/logo-on-light.svg`,
		content,
	})
}

export function renderCrmTaskDigestText(params: CrmTaskDigestParams): string {
	const lines = params.overdue
		.map((task) => `- ${task.title} — ${task.leadName} · vence ${formatDateTimeBogota(task.dueAt)}\n  ${taskUrl(params.baseUrl, task.detailPath)}`)
		.join('\n')
	return `Hola ${params.recipientName},\n\nEstas actividades del CRM ya vencieron y siguen pendientes.\n\n${lines}\n`
}
