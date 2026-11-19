import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	crmErrorResponse as error,
	findScopedLead,
	parsePositiveId,
	readJsonBody,
	requireCrmActor,
	toCrmRequestContext,
} from '@/lib/auth/require-crm-actor'
import { leadCrmFieldsPatchSchema } from '@/features/leads/custom-fields/custom-field.schema'
import {
	getLeadCrmFields,
	updateLeadCrmFields,
	type LeadCrmFields,
} from '@/features/leads/custom-fields/lead-crm-fields.service'

interface RouteContext {
	params: Promise<{ id: string }>
}

/** GET /api/leads/[id]/crm-fields — value, probability and custom values. */
export async function GET(_: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_lead_fields')
		if (!guard.ok) return guard.response
		const idLead = parsePositiveId((await context.params).id)
		if (!idLead) return error('Identificador de lead inválido', 400)
		if (!(await findScopedLead(guard.actor, idLead))) return error('Lead no encontrado', 404)
		const fields = await getLeadCrmFields(idLead)
		if (!fields) return error('Lead no encontrado', 404)
		return NextResponse.json({ data: fields } satisfies ApiResponse<LeadCrmFields>)
	} catch (cause) {
		console.error('Error fetching lead CRM fields:', cause)
		return error('Error al obtener los datos del CRM', 500)
	}
}

/** PATCH /api/leads/[id]/crm-fields — CRM-owned data only; synced fields are not accepted. */
export async function PATCH(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_lead_fields', { manage: true })
		if (!guard.ok) return guard.response
		const idLead = parsePositiveId((await context.params).id)
		if (!idLead) return error('Identificador de lead inválido', 400)
		if (!(await findScopedLead(guard.actor, idLead))) return error('Lead no encontrado', 404)
		const input = leadCrmFieldsPatchSchema.safeParse(await readJsonBody(request))
		if (!input.success) return error(input.error.issues[0]?.message ?? 'Datos inválidos', 400)
		const result = await updateLeadCrmFields(idLead, input.data, toCrmRequestContext(guard.actor, request))
		if (!result.ok) return error(result.error, 400)
		return NextResponse.json({ data: result.fields } satisfies ApiResponse<LeadCrmFields>)
	} catch (cause) {
		console.error('Error updating lead CRM fields:', cause)
		return error('Error al actualizar los datos del CRM', 500)
	}
}
