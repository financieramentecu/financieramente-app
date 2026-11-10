import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	crmErrorResponse as error,
	parsePositiveId,
	readJsonBody,
	requireCrmActor,
	toCrmRequestContext,
} from '@/lib/auth/require-crm-actor'
import { leadCustomFieldUpdateSchema } from '@/features/leads/custom-fields/custom-field.schema'
import { deactivateLeadCustomField, updateLeadCustomField } from '@/features/leads/custom-fields/lead-custom-field.service'
import type { CustomFieldDefinition } from '@/features/leads/custom-fields/custom-field.types'

interface RouteContext {
	params: Promise<{ id: string }>
}

/** PATCH /api/crm/custom-fields/[id] — label, options (lists) or position. CRM managers only. */
export async function PATCH(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_lead_fields', { manage: true })
		if (!guard.ok) return guard.response
		const idField = parsePositiveId((await context.params).id)
		if (!idField) return error('Identificador de campo inválido', 400)
		const input = leadCustomFieldUpdateSchema.safeParse(await readJsonBody(request))
		if (!input.success) return error(input.error.issues[0]?.message ?? 'Campo inválido', 400)
		const result = await updateLeadCustomField(idField, input.data, toCrmRequestContext(guard.actor, request))
		if (!result.ok) {
			return result.reason === 'NOT_FOUND'
				? error('Campo no encontrado', 404)
				: error('Solo las listas tienen opciones', 400)
		}
		return NextResponse.json({ data: result.field } satisfies ApiResponse<CustomFieldDefinition>)
	} catch (cause) {
		console.error('Error updating CRM custom field:', cause)
		return error('Error al actualizar el campo personalizado', 500)
	}
}

/** DELETE /api/crm/custom-fields/[id] — soft delete; stored values are kept. */
export async function DELETE(request: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_lead_fields', { manage: true })
		if (!guard.ok) return guard.response
		const idField = parsePositiveId((await context.params).id)
		if (!idField) return error('Identificador de campo inválido', 400)
		const result = await deactivateLeadCustomField(idField, toCrmRequestContext(guard.actor, request))
		if (!result.ok) return error('Campo no encontrado', 404)
		return NextResponse.json({ success: true })
	} catch (cause) {
		console.error('Error deleting CRM custom field:', cause)
		return error('Error al eliminar el campo personalizado', 500)
	}
}
