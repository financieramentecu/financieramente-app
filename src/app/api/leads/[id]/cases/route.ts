import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import {
	canAssignWithinScope,
	crmErrorResponse as error,
	findScopedLead,
	parsePositiveId,
	requireCrmActor,
} from '@/lib/auth/require-crm-actor'
import { leadSupportCaseCreateSchema } from '@/features/leads/cases/lead-support-case.schema'
import {
	createLeadSupportCase,
	listLeadSupportCases,
} from '@/features/leads/cases/lead-support-case-commands.service'

interface RouteContext {
	params: Promise<{ id: string }>
}

export async function GET(_: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_cases')
		if (!guard.ok) return guard.response
		const idLead = parsePositiveId((await context.params).id)
		if (!idLead) return error('Identificador de lead inválido', 400)
		if (!(await findScopedLead(guard.actor, idLead))) return error('Lead no encontrado', 404)
		const cases = await listLeadSupportCases(idLead)
		return NextResponse.json({ data: cases } satisfies ApiResponse<typeof cases>)
	} catch (cause) {
		console.error('Error fetching lead support cases:', cause)
		return error('Error al obtener los casos de soporte', 500)
	}
}

export async function POST(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_cases', { manage: true })
		if (!guard.ok) return guard.response
		const { actor } = guard
		const idLead = parsePositiveId((await context.params).id)
		if (!idLead) return error('Identificador de lead inválido', 400)
		if (!(await findScopedLead(actor, idLead))) return error('Lead no encontrado', 404)

		const input = leadSupportCaseCreateSchema.safeParse(await request.json())
		if (!input.success) return error('Caso inválido', 400)
		if (!canAssignWithinScope(actor, input.data.assignedTo)) {
			return error('No puedes asignar fuera de tu alcance', 403)
		}

		const result = await createLeadSupportCase(
			{
				idLead,
				idBusiness: input.data.idBusiness,
				assignedTo: input.data.assignedTo,
				subject: input.data.subject,
				priority: input.data.priority,
				dueAt: input.data.dueAt ? new Date(input.data.dueAt) : null,
			},
			{
				userId: actor.idUser,
				email: actor.email,
				ipAddress: getClientIp(request.headers),
				userAgent: getUserAgent(request.headers),
			}
		)
		if (!result.ok) return error('Negocio no encontrado', 404)
		return NextResponse.json({ data: result.supportCase }, { status: 201 })
	} catch (cause) {
		console.error('Error creating lead support case:', cause)
		return error('Error al crear el caso de soporte', 500)
	}
}
