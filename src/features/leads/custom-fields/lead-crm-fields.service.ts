import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import { auditCrmEvent } from '@/features/leads/crm/audit-crm-event'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import { listLeadCustomFields } from '@/features/leads/custom-fields/lead-custom-field.service'
import {
	mergeCustomFieldValues,
	pickVisibleCustomFieldValues,
	validateCustomFieldPatch,
} from '@/features/leads/custom-fields/custom-field-values'
import type { CustomFieldValues } from '@/features/leads/custom-fields/custom-field.types'

/** CRM-owned lead data. The `crm-sync` webhook never writes these columns. */
export interface LeadCrmFields {
	estimatedValue: string | null
	probability: number | null
	customFieldValues: CustomFieldValues
}

export interface LeadCrmFieldsPatch {
	/** Decimal string with up to 2 decimals, or null to clear. */
	estimatedValue?: string | null
	probability?: number | null
	customFields?: Record<string, unknown>
}

const crmFieldsSelect = { estimatedValue: true, probability: true, customFieldValues: true } satisfies Prisma.LeadSelect

function toFields(
	record: Prisma.LeadGetPayload<{ select: typeof crmFieldsSelect }>,
	definitions: Awaited<ReturnType<typeof listLeadCustomFields>>
): LeadCrmFields {
	return {
		estimatedValue: record.estimatedValue?.toString() ?? null,
		probability: record.probability,
		customFieldValues: pickVisibleCustomFieldValues(record.customFieldValues, definitions),
	}
}

export async function getLeadCrmFields(idLead: number): Promise<LeadCrmFields | null> {
	const [record, definitions] = await Promise.all([
		prisma.lead.findUnique({ where: { idLead }, select: crmFieldsSelect }),
		listLeadCustomFields(),
	])
	return record ? toFields(record, definitions) : null
}

export type UpdateLeadCrmFieldsResult = { ok: true; fields: LeadCrmFields } | { ok: false; error: string }

/** Updates value, probability and/or custom values (merged; `null` removes a key). */
export async function updateLeadCrmFields(
	idLead: number,
	patch: LeadCrmFieldsPatch,
	ctx: CrmRequestContext
): Promise<UpdateLeadCrmFieldsResult> {
	const definitions = await listLeadCustomFields()
	const data: Prisma.LeadUpdateInput = {}
	const changed: string[] = []

	if (patch.estimatedValue !== undefined) {
		data.estimatedValue = patch.estimatedValue === null ? null : new Prisma.Decimal(patch.estimatedValue)
		changed.push('estimatedValue')
	}
	if (patch.probability !== undefined) {
		data.probability = patch.probability
		changed.push('probability')
	}
	if (patch.customFields !== undefined) {
		const validated = validateCustomFieldPatch(definitions, patch.customFields)
		if (!validated.ok) return validated
		const current = await prisma.lead.findUnique({ where: { idLead }, select: { customFieldValues: true } })
		data.customFieldValues = mergeCustomFieldValues(current?.customFieldValues, validated.values)
		changed.push(...Object.keys(validated.values).map((key) => `custom.${key}`))
	}

	const record = await prisma.lead.update({ where: { idLead }, data, select: crmFieldsSelect })
	await auditCrmEvent(ctx, AuditAction.LEAD_CRM_FIELDS_UPDATED, `Lead ${idLead}: CRM fields updated (${changed.join(', ')})`)
	return { ok: true, fields: toFields(record, definitions) }
}
