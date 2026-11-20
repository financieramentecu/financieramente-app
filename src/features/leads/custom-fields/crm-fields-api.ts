import { readApiData } from '@/features/leads/table/lead-table-api'
import type { LeadTagChip } from '@/features/leads/table/lead-table.types'
import type { CustomFieldDefinition, CustomFieldPatch } from '@/features/leads/custom-fields/custom-field.types'
import type { LeadCrmFields } from '@/features/leads/custom-fields/lead-crm-fields.service'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function fetchLeadCrmFields(idLead: number): Promise<LeadCrmFields> {
	return readApiData(await fetch(`/api/leads/${idLead}/crm-fields`), 'No fue posible cargar los datos del CRM.')
}

export async function saveLeadCrmFields(
	idLead: number,
	patch: { estimatedValue: string | null; probability: number | null; customFields?: CustomFieldPatch }
): Promise<LeadCrmFields> {
	const response = await fetch(`/api/leads/${idLead}/crm-fields`, {
		method: 'PATCH',
		headers: JSON_HEADERS,
		body: JSON.stringify(patch),
	})
	return readApiData(response, 'No fue posible guardar los datos del CRM.')
}

export async function saveLeadTags(idLead: number, tagIds: number[]): Promise<LeadTagChip[]> {
	const response = await fetch(`/api/leads/${idLead}/tags`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ tagIds }) })
	return readApiData(response, 'No fue posible guardar las etiquetas.')
}

export async function fetchCustomFields(): Promise<CustomFieldDefinition[]> {
	return readApiData(await fetch('/api/crm/custom-fields'), 'No fue posible cargar los campos personalizados.')
}

export async function createCustomField(input: {
	key: string
	label: string
	type: CustomFieldDefinition['type']
	options?: string[]
}): Promise<CustomFieldDefinition> {
	const response = await fetch('/api/crm/custom-fields', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(input) })
	return readApiData(response, 'No fue posible crear el campo.')
}

export async function deleteCustomField(idLeadCustomField: number): Promise<void> {
	const response = await fetch(`/api/crm/custom-fields/${idLeadCustomField}`, { method: 'DELETE' })
	if (!response.ok) throw new Error('No fue posible eliminar el campo.')
}

export async function createTag(input: { name: string; color: string }): Promise<LeadTagChip> {
	const response = await fetch('/api/crm/tags', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(input) })
	return readApiData(response, 'No fue posible crear la etiqueta.')
}

export async function deleteTag(idLeadTag: number): Promise<void> {
	const response = await fetch(`/api/crm/tags/${idLeadTag}`, { method: 'DELETE' })
	if (!response.ok) throw new Error('No fue posible eliminar la etiqueta.')
}
