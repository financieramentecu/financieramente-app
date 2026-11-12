import type { CustomFieldDefinition, CustomFieldPatch, CustomFieldValues } from '@/features/leads/custom-fields/custom-field.types'

/** Raw form values of the "Datos del CRM" section (all strings, as typed). */
export interface CrmFieldsFormValues {
	estimatedValue: string
	probability: string
	custom: Record<string, string>
}

export function toCrmFieldsFormValues(
	fields: { estimatedValue: string | null; probability: number | null; customFieldValues: CustomFieldValues },
	definitions: readonly CustomFieldDefinition[]
): CrmFieldsFormValues {
	return {
		estimatedValue: fields.estimatedValue ?? '',
		probability: fields.probability === null ? '' : String(fields.probability),
		custom: Object.fromEntries(
			definitions.map((definition) => [definition.key, String(fields.customFieldValues[definition.key] ?? '')])
		),
	}
}

/** PATCH body from the form: empty inputs clear the value; numbers are parsed. */
export function buildCrmFieldsPatch(
	values: CrmFieldsFormValues,
	definitions: readonly CustomFieldDefinition[]
): { estimatedValue: string | null; probability: number | null; customFields?: CustomFieldPatch } {
	const estimatedValue = values.estimatedValue.trim() || null
	const probability = values.probability.trim() === '' ? null : Number(values.probability)
	if (definitions.length === 0) return { estimatedValue, probability }
	const customFields: CustomFieldPatch = {}
	for (const definition of definitions) {
		const raw = (values.custom[definition.key] ?? '').trim()
		customFields[definition.key] = raw === '' ? null : definition.type === 'NUMBER' ? Number(raw) : raw
	}
	return { estimatedValue, probability, customFields }
}
