import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import {
	canAssignWithinScope,
	crmErrorResponse as error,
	findScopedLead,
	parsePositiveId,
	requireCrmActor,
	type CrmActor,
} from '@/lib/auth/require-crm-actor'
import { validateActivityFiles } from '@/features/leads/activities/lead-activity-attachment'
import { storeLeadActivityFiles } from '@/features/leads/activities/lead-activity-files.service'
import { LeadAttachmentStorageError } from '@/features/leads/activities/lead-attachment-storage'
import { readJsonOrFiles } from '@/features/leads/activities/json-or-files'
import {
	leadSupportCaseCommentSchema,
	leadSupportCaseUpdateSchema,
} from '@/features/leads/cases/lead-support-case.schema'
import { pinActivityColumn } from '@/features/leads/agenda/activity-column.service'
import { ACTIVITY_COLUMN_CODE } from '@/features/leads/agenda/activity-column.types'
import { isAgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'
import { dueAtForActivityBucket } from '@/features/leads/agenda/activity-bucket'
import {
	addLeadSupportCaseComment,
	findLeadSupportCaseRef,
	placeLeadSupportCase,
	transitionLeadSupportCase,
} from '@/features/leads/cases/lead-support-case-commands.service'

const caseMoveSchema = z.object({ bucket: z.string().regex(ACTIVITY_COLUMN_CODE) }).strict()

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
		const incoming = await readJsonOrFiles(request)
		if (!incoming.ok) return error(incoming.error, 400)
		const move = caseMoveSchema.safeParse(incoming.body)
		if (move.success) {
			const ctx = requestContext(resolved.actor, request)
			if (!isAgendaBucket(move.data.bucket)) {
				const pinned = await pinActivityColumn('case', resolved.supportCase.idLeadSupportCase, move.data.bucket, ctx)
				if (!pinned) return error('Columna no encontrada', 404)
				return NextResponse.json({ data: { idLeadSupportCase: resolved.supportCase.idLeadSupportCase } })
			}
			const updated = await placeLeadSupportCase(
				{
					idLeadSupportCase: resolved.supportCase.idLeadSupportCase,
					idLead: resolved.supportCase.idLead,
					bucket: move.data.bucket,
					dueAt: move.data.bucket === 'done' ? undefined : dueAtForActivityBucket(move.data.bucket, new Date()),
				},
				ctx
			)
			return NextResponse.json({ data: updated })
		}
		const files = validateActivityFiles(incoming.files)
		if (!files.ok) return error(files.error, 400)
		const input = leadSupportCaseUpdateSchema.safeParse(incoming.body)
		if (!input.success) return error('Actualización inválida', 400)
		if (incoming.files.length > 0 && input.data.status !== 'CLOSED') {
			return error('Los archivos solo se adjuntan al cerrar el caso', 400)
		}
		if (!canAssignWithinScope(resolved.actor, input.data.assignedTo)) {
			return error('No puedes asignar fuera de tu alcance', 403)
		}
		let attachments
		if (incoming.files.length > 0) {
			try {
				attachments = await storeLeadActivityFiles(resolved.supportCase.idLead, incoming.files)
			} catch (cause) {
				if (cause instanceof LeadAttachmentStorageError) {
					return error('No se pueden adjuntar archivos en este momento', 503)
				}
				throw cause
			}
		}
		const updated = await transitionLeadSupportCase(
			{
				idLeadSupportCase: resolved.supportCase.idLeadSupportCase,
				idLead: resolved.supportCase.idLead,
				status: input.data.status,
				assignedTo: input.data.assignedTo,
				comment: input.data.comment,
				attachments,
				resolvedAt: input.data.resolvedAt ? new Date(input.data.resolvedAt) : undefined,
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
