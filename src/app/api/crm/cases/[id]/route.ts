import { NextResponse } from 'next/server'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import {
	canAssignWithinScope,
	crmErrorResponse as error,
	findScopedLead,
	parsePositiveId,
	requireCrmActor,
	type CrmActor,
} from '@/lib/auth/require-crm-actor'
import {
	leadSupportCaseCommentSchema,
	leadSupportCaseUpdateSchema,
} from '@/features/leads/cases/lead-support-case.schema'
import {
	addLeadSupportCaseComment,
	findLeadSupportCaseRef,
	transitionLeadSupportCase,
} from '@/features/leads/cases/lead-support-case-commands.service'

interface RouteContext {
	params: Promise<{ id: string }>
}

type ResolvedCase =
	| { ok: true; actor: CrmActor; supportCase: { idLeadSupportCase: number; idLead: number } }
	| { ok: false; response: Response }

async function resolveCase(context: RouteContext): Promise<ResolvedCase> {
	const guard = await requireCrmActor('crm_cases', { manage: true })
	if (!guard.ok) return guard
	const idLeadSupportCase = parsePositiveId((await context.params).id)
	if (!idLeadSupportCase) return { ok: false, response: error('Identificador de caso inválido', 400) }
	const supportCase = await findLeadSupportCaseRef(idLeadSupportCase)
	if (!supportCase || !(await findScopedLead(guard.actor, supportCase.idLead))) {
		return { ok: false, response: error('Caso no encontrado', 404) }
	}
	return { ok: true, actor: guard.actor, supportCase }
}

function requestContext(actor: CrmActor, request: Request) {
	return {
		userId: actor.idUser,
		email: actor.email,
		ipAddress: getClientIp(request.headers),
		userAgent: getUserAgent(request.headers),
	}
}

export async function PATCH(request: Request, context: RouteContext) {
	try {
		const resolved = await resolveCase(context)
		if (!resolved.ok) return resolved.response
		const input = leadSupportCaseUpdateSchema.safeParse(await request.json())
		if (!input.success) return error('Actualización inválida', 400)
		if (!canAssignWithinScope(resolved.actor, input.data.assignedTo)) {
			return error('No puedes asignar fuera de tu alcance', 403)
		}
		const updated = await transitionLeadSupportCase(
			{
				idLeadSupportCase: resolved.supportCase.idLeadSupportCase,
				idLead: resolved.supportCase.idLead,
				status: input.data.status,
				assignedTo: input.data.assignedTo,
			},
			requestContext(resolved.actor, request)
		)
		return NextResponse.json({ data: updated })
	} catch (cause) {
		console.error('Error updating lead support case:', cause)
		return error('Error al actualizar el caso de soporte', 500)
	}
}

export async function POST(request: Request, context: RouteContext) {
	try {
		const resolved = await resolveCase(context)
		if (!resolved.ok) return resolved.response
		const input = leadSupportCaseCommentSchema.safeParse(await request.json())
		if (!input.success) return error('Comentario inválido', 400)
		const comment = await addLeadSupportCaseComment(
			{
				idLeadSupportCase: resolved.supportCase.idLeadSupportCase,
				idLead: resolved.supportCase.idLead,
				body: input.data.body,
			},
			requestContext(resolved.actor, request)
		)
		return NextResponse.json({ data: comment }, { status: 201 })
	} catch (cause) {
		console.error('Error creating lead support case comment:', cause)
		return error('Error al registrar el comentario', 500)
	}
}
