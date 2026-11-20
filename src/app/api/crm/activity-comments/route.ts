import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { crmErrorResponse as error, findScopedLead, requireCrmActor } from '@/lib/auth/require-crm-actor'
import { listLeadSupportCaseComments, addLeadSupportCaseComment, findLeadSupportCaseRef } from '@/features/leads/cases/lead-support-case-commands.service'
import { addLeadTaskComment, findLeadTaskRef, listLeadTaskComments } from '@/features/leads/tasks/lead-task-commands.service'
import { leadTaskCommentSchema } from '@/features/leads/tasks/lead-task.schema'
import { leadSupportCaseCommentSchema } from '@/features/leads/cases/lead-support-case.schema'

const querySchema = z.object({
	kind: z.enum(['task', 'case']),
	id: z.coerce.number().int().positive(),
})

export interface ActivityCommentDto {
	id: number
	body: string
	createdAt: string
	authorName: string
}

function authorName(author: { name: string; lastName: string | null }): string {
	return [author.name, author.lastName].filter(Boolean).join(' ') || 'Sin nombre'
}

export async function GET(request: Request) {
	try {
		const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
		if (!parsed.success) return error('Consulta inválida', 400)
		const flag = parsed.data.kind === 'task' ? 'crm_tasks' : 'crm_cases'
		const guard = await requireCrmActor(flag)
		if (!guard.ok) return guard.response
		if (parsed.data.kind === 'task') {
			const task = await findLeadTaskRef(parsed.data.id)
			if (!task || !(await findScopedLead(guard.actor, task.idLead))) return error('Tarea no encontrada', 404)
			const rows = await listLeadTaskComments(task.idLeadTask)
			const data = rows.map((row) => ({
				id: row.idLeadTaskComment,
				body: row.body,
				createdAt: row.createdAt.toISOString(),
				authorName: authorName(row.author),
			}))
			return NextResponse.json({ data } satisfies ApiResponse<ActivityCommentDto[]>)
		}
		const supportCase = await findLeadSupportCaseRef(parsed.data.id)
		if (!supportCase || !(await findScopedLead(guard.actor, supportCase.idLead))) return error('Caso no encontrado', 404)
		const rows = await listLeadSupportCaseComments(supportCase.idLeadSupportCase)
		const data = rows.map((row) => ({
			id: row.idLeadSupportCaseComment,
			body: row.body,
			createdAt: row.createdAt.toISOString(),
			authorName: authorName(row.author),
		}))
		return NextResponse.json({ data } satisfies ApiResponse<ActivityCommentDto[]>)
	} catch (cause) {
		console.error('Error listing activity comments:', cause)
		return error('Error al obtener los comentarios', 500)
	}
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as { kind?: unknown; id?: unknown; body?: unknown }
		const parsed = querySchema.safeParse({ kind: body.kind, id: body.id })
		if (!parsed.success) return error('Comentario inválido', 400)
		const flag = parsed.data.kind === 'task' ? 'crm_tasks' : 'crm_cases'
		const guard = await requireCrmActor(flag, { manage: true })
		if (!guard.ok) return guard.response
		const ctx = {
			userId: guard.actor.idUser,
			email: guard.actor.email,
			ipAddress: getClientIp(request.headers),
			userAgent: getUserAgent(request.headers),
		}
		if (parsed.data.kind === 'task') {
			const input = leadTaskCommentSchema.safeParse({ body: body.body })
			if (!input.success) return error('Comentario inválido', 400)
			const task = await findLeadTaskRef(parsed.data.id)
			if (!task || !(await findScopedLead(guard.actor, task.idLead))) return error('Tarea no encontrada', 404)
			const comment = await addLeadTaskComment({ idLeadTask: task.idLeadTask, idLead: task.idLead, body: input.data.body }, ctx)
			return NextResponse.json({ data: { id: comment.idLeadTaskComment } }, { status: 201 })
		}
		const input = leadSupportCaseCommentSchema.safeParse({ body: body.body })
		if (!input.success) return error('Comentario inválido', 400)
		const supportCase = await findLeadSupportCaseRef(parsed.data.id)
		if (!supportCase || !(await findScopedLead(guard.actor, supportCase.idLead))) return error('Caso no encontrado', 404)
		const comment = await addLeadSupportCaseComment(
			{ idLeadSupportCase: supportCase.idLeadSupportCase, idLead: supportCase.idLead, body: input.data.body },
			ctx
		)
		return NextResponse.json({ data: { id: comment.idLeadSupportCaseComment } }, { status: 201 })
	} catch (cause) {
		console.error('Error creating activity comment:', cause)
		return error('Error al registrar el comentario', 500)
	}
}
