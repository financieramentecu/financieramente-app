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
import { appendLeadActivity } from '@/features/leads/activities/lead-activity-commands.service'
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

		const input = leadCrmEventInputSchema.safeParse(await request.json())
		if (!input.success) return error('Actividad inválida', 400)

		const loggedAt = 'occurredAt' in input.data.payload ? input.data.payload.occurredAt : undefined
		const activity = await appendLeadActivity(
			{ idLead, type: input.data.type, payload: input.data.payload, occurredAt: loggedAt ? new Date(loggedAt) : undefined },
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
