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
import { leadTagsSetSchema } from '@/features/leads/tags/lead-tag.schema'
import { setLeadTags } from '@/features/leads/tags/lead-tag.service'
import type { LeadTagChip } from '@/features/leads/table/lead-table.types'

interface RouteContext {
	params: Promise<{ id: string }>
}

/** PUT /api/leads/[id]/tags — replace the lead's tags (CRM-owned data). */
export async function PUT(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_lead_fields', { manage: true })
		if (!guard.ok) return guard.response
		const idLead = parsePositiveId((await context.params).id)
		if (!idLead) return error('Identificador de lead inválido', 400)
		if (!(await findScopedLead(guard.actor, idLead))) return error('Lead no encontrado', 404)
		const input = leadTagsSetSchema.safeParse(await readJsonBody(request))
		if (!input.success) return error(input.error.issues[0]?.message ?? 'Etiquetas inválidas', 400)
		const result = await setLeadTags(idLead, input.data.tagIds, toCrmRequestContext(guard.actor, request))
		if (!result.ok) return error('Alguna etiqueta no existe', 400)
		return NextResponse.json({ data: result.tags } satisfies ApiResponse<LeadTagChip[]>)
	} catch (cause) {
		console.error('Error updating lead tags:', cause)
		return error('Error al actualizar las etiquetas', 500)
	}
}
