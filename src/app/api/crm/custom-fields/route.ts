import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	crmErrorResponse as error,
	readJsonBody,
	requireCrmActor,
	toCrmRequestContext,
} from '@/lib/auth/require-crm-actor'
import { leadCustomFieldCreateSchema } from '@/features/leads/custom-fields/custom-field.schema'
import { createLeadCustomField, listLeadCustomFields } from '@/features/leads/custom-fields/lead-custom-field.service'
import type { CustomFieldDefinition } from '@/features/leads/custom-fields/custom-field.types'

/** GET /api/crm/custom-fields — active lead custom field definitions. */
export async function GET() {
	try {
		const guard = await requireCrmActor('crm_lead_fields')
		if (!guard.ok) return guard.response
		const fields = await listLeadCustomFields()
		return NextResponse.json({ data: fields } satisfies ApiResponse<CustomFieldDefinition[]>)
	} catch (cause) {
		console.error('Error fetching CRM custom fields:', cause)
		return error('Error al obtener los campos personalizados', 500)
	}
}

/** POST /api/crm/custom-fields — new definition. CRM managers only. */
export async function POST(request: Request) {
	try {
		const guard = await requireCrmActor('crm_lead_fields', { manage: true })
		if (!guard.ok) return guard.response
		const input = leadCustomFieldCreateSchema.safeParse(await readJsonBody(request))
		if (!input.success) return error(input.error.issues[0]?.message ?? 'Campo inválido', 400)
		const result = await createLeadCustomField(input.data, toCrmRequestContext(guard.actor, request))
		if (!result.ok) return error('Ya existe un campo con esa clave', 409)
		return NextResponse.json({ data: result.field } satisfies ApiResponse<CustomFieldDefinition>, { status: 201 })
	} catch (cause) {
		console.error('Error creating CRM custom field:', cause)
		return error('Error al crear el campo personalizado', 500)
	}
}
