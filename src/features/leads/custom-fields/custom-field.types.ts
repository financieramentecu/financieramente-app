import type { LeadCustomFieldType } from '@prisma/client'

export type { LeadCustomFieldType }

export const LEAD_CUSTOM_FIELD_TYPES: readonly LeadCustomFieldType[] = ['TEXT', 'NUMBER', 'DATE', 'SELECT']

export const LEAD_CUSTOM_FIELD_TYPE_LABELS: Record<LeadCustomFieldType, string> = {
	TEXT: 'Texto',
	NUMBER: 'Número',
	DATE: 'Fecha',
	SELECT: 'Lista',
}

export interface CustomFieldDefinition {
	idLeadCustomField: number
	key: string
	label: string
	type: LeadCustomFieldType
	/** Allowed values; SELECT only. */
	options: string[]
	position: number
}

export type CustomFieldValue = string | number
export type CustomFieldValues = Record<string, CustomFieldValue>
/** Patch sent by the client: `null` removes the value. */
export type CustomFieldPatch = Record<string, CustomFieldValue | null>
