import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	crmErrorResponse as error,
	readJsonBody,
	requireCrmActor,
	toCrmRequestContext,
} from '@/lib/auth/require-crm-actor'
import { leadTagCreateSchema } from '@/features/leads/tags/lead-tag.schema'
import { createLeadTag, listLeadTags } from '@/features/leads/tags/lead-tag.service'
import type { LeadTagChip } from '@/features/leads/table/lead-table.types'

/** GET /api/crm/tags — active tag catalogue. */
export async function GET() {
	try {
		const guard = await requireCrmActor('crm_lead_fields')
		if (!guard.ok) return guard.response
		const tags = await listLeadTags()
		return NextResponse.json({ data: tags } satisfies ApiResponse<LeadTagChip[]>)
	} catch (cause) {
		console.error('Error fetching CRM tags:', cause)
		return error('Error al obtener las etiquetas', 500)
	}
}

/** POST /api/crm/tags — create (or reactivate) a tag. CRM managers only. */
export async function POST(request: Request) {
	try {
		const guard = await requireCrmActor('crm_lead_fields', { manage: true })
		if (!guard.ok) return guard.response
		const input = leadTagCreateSchema.safeParse(await readJsonBody(request))
		if (!input.success) return error(input.error.issues[0]?.message ?? 'Etiqueta inválida', 400)
		const result = await createLeadTag(input.data, toCrmRequestContext(guard.actor, request))
		if (!result.ok) return error('Ya existe una etiqueta con ese nombre', 409)
		return NextResponse.json({ data: result.tag } satisfies ApiResponse<LeadTagChip>, { status: 201 })
	} catch (cause) {
		console.error('Error creating CRM tag:', cause)
		return error('Error al crear la etiqueta', 500)
	}
}
