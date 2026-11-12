import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import {
	crmErrorResponse as error,
	findScopedLead,
	parsePositiveId,
	requireCrmActor,
} from '@/lib/auth/require-crm-actor'
import { leadCrmEventInputSchema } from '@/features/leads/crm/lead-crm-event.schema'
import { validateActivityFiles } from '@/features/leads/activities/lead-activity-attachment'
import { appendLeadActivity } from '@/features/leads/activities/lead-activity-commands.service'
import type { LeadActivityPayload } from '@/features/leads/activities/lead-activity.service'
import { storeLeadActivityFiles } from '@/features/leads/activities/lead-activity-files.service'
import { LeadAttachmentStorageError } from '@/features/leads/activities/lead-attachment-storage'
import { getLeadTimelinePage, type LeadTimelinePage } from '@/features/leads/activities/lead-timeline.service'
import { decodeTimelineCursor } from '@/features/leads/activities/merge-timeline'

interface RouteContext {
	params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_timeline')
		if (!guard.ok) return guard.response
		const idLead = parsePositiveId((await context.params).id)
		if (!idLead) return error('Identificador de lead inválido', 400)
		if (!(await findScopedLead(guard.actor, idLead))) return error('Lead no encontrado', 404)

		const url = new URL(request.url)
		const limit = Number.parseInt(url.searchParams.get('limit') ?? '25', 10)
		if (!Number.isFinite(limit) || limit < 1 || limit > 100) return error('Límite inválido', 400)
		const cursorValue = url.searchParams.get('cursor')
		const cursor = cursorValue ? decodeTimelineCursor(cursorValue) : null
		if (cursorValue && !cursor) return error('Cursor inválido', 400)

		const page = await getLeadTimelinePage(idLead, { limit, cursor: cursor ?? undefined })
		return NextResponse.json({ data: page } satisfies ApiResponse<LeadTimelinePage>)
	} catch (cause) {
		console.error('Error fetching lead activities:', cause)
		return error('Error al obtener las actividades del lead', 500)
	}
}

export async function POST(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_timeline', { manage: true })
		if (!guard.ok) return guard.response
		const { actor } = guard
		const idLead = parsePositiveId((await context.params).id)
		if (!idLead) return error('Identificador de lead inválido', 400)
		if (!(await findScopedLead(actor, idLead))) return error('Lead no encontrado', 404)

		const incoming = await readIncomingActivity(request)
		if (!incoming.ok) return error(incoming.error, 400)
		const files = validateActivityFiles(incoming.files)
		if (!files.ok) return error(files.error, 400)

		const input = leadCrmEventInputSchema.safeParse(withFallbackText(incoming.event, incoming.files.length > 0))
		if (!input.success) return error('Actividad inválida', 400)

		let payload: LeadActivityPayload = input.data.payload
		if (incoming.files.length > 0) {
			try {
				const attachments = await storeLeadActivityFiles(idLead, incoming.files)
				payload = { ...input.data.payload, attachments }
			} catch (cause) {
				if (cause instanceof LeadAttachmentStorageError) {
					return error('No se pueden adjuntar archivos en este momento', 503)
				}
				throw cause
			}
		}

		const loggedAt = 'occurredAt' in payload ? payload.occurredAt : undefined
		const activity = await appendLeadActivity(
			{ idLead, type: input.data.type, payload, occurredAt: loggedAt ? new Date(loggedAt) : undefined },
			{
				userId: actor.idUser,
				email: actor.email,
				ipAddress: getClientIp(request.headers),
				userAgent: getUserAgent(request.headers),
			}
		)
		return NextResponse.json({ data: activity }, { status: 201 })
	} catch (cause) {
		console.error('Error appending lead activity:', cause)
		return error('Error al registrar la actividad del lead', 500)
	}
}

async function readIncomingActivity(
	request: Request
): Promise<{ ok: true; event: unknown; files: File[] } | { ok: false; error: string }> {
	const contentType = request.headers.get('content-type') ?? ''
	if (!contentType.includes('multipart/form-data')) {
		return { ok: true, event: await request.json(), files: [] }
	}
	const form = await request.formData()
	const raw = form.get('event')
	if (typeof raw !== 'string') return { ok: false, error: 'Actividad inválida' }
	try {
		const files = form
			.getAll('files')
			.filter((entry): entry is File => entry instanceof File && entry.size > 0)
		return { ok: true, event: JSON.parse(raw), files }
	} catch {
		return { ok: false, error: 'Actividad inválida' }
	}
}

function withFallbackText(event: unknown, hasFiles: boolean): unknown {
	if (!hasFiles || !event || typeof event !== 'object') return event
	const record = event as { type?: string; payload?: Record<string, unknown> }
	if (!record.payload) return event
	const textKey = record.type === 'NOTE_ADDED' ? 'note' : 'summary'
	const text = record.payload[textKey]
	if (typeof text === 'string' && text.trim()) return event
	return { ...record, payload: { ...record.payload, [textKey]: 'Adjunto' } }
}
