import type { LeadCustomFieldType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import { auditCrmEvent } from '@/features/leads/crm/audit-crm-event'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import type { CustomFieldDefinition } from '@/features/leads/custom-fields/custom-field.types'

const fieldSelect = {
	idLeadCustomField: true,
	key: true,
	label: true,
	type: true,
	options: true,
	position: true,
} satisfies Prisma.LeadCustomFieldSelect

type FieldRecord = Prisma.LeadCustomFieldGetPayload<{ select: typeof fieldSelect }>

function toDefinition(record: FieldRecord): CustomFieldDefinition {
	const options = Array.isArray(record.options)
		? record.options.filter((option): option is string => typeof option === 'string')
		: []
	return { ...record, options }
}

function findActiveField(idLeadCustomField: number) {
	return prisma.leadCustomField.findFirst({
		where: { idLeadCustomField, active: true },
		select: { idLeadCustomField: true, type: true },
	})
}

export async function listLeadCustomFields(): Promise<CustomFieldDefinition[]> {
	const records = await prisma.leadCustomField.findMany({
		where: { active: true },
		orderBy: [{ position: 'asc' }, { idLeadCustomField: 'asc' }],
		select: fieldSelect,
	})
	return records.map(toDefinition)
}

export interface CreateCustomFieldInput {
	key: string
	label: string
	type: LeadCustomFieldType
	options: string[]
	position: number
}

export type CustomFieldResult =
	| { ok: true; field: CustomFieldDefinition }
	| { ok: false; reason: 'DUPLICATE_KEY' | 'NOT_FOUND' | 'OPTIONS_NOT_ALLOWED' }

/** Creates a definition. Keys are permanent: a key used by an inactive field cannot be reused. */
export async function createLeadCustomField(input: CreateCustomFieldInput, ctx: CrmRequestContext): Promise<CustomFieldResult> {
	const existing = await prisma.leadCustomField.findUnique({ where: { key: input.key }, select: { idLeadCustomField: true } })
	if (existing) return { ok: false, reason: 'DUPLICATE_KEY' }
	const record = await prisma.leadCustomField.create({
		data: {
			key: input.key,
			label: input.label,
			type: input.type,
			options: input.type === 'SELECT' ? input.options : [],
			position: input.position,
			createdBy: ctx.userId,
		},
		select: fieldSelect,
	})
	await auditCrmEvent(ctx, AuditAction.LEAD_CUSTOM_FIELD_CREATED, `Lead custom field ${record.idLeadCustomField} "${record.key}" created`)
	return { ok: true, field: toDefinition(record) }
}

/** Updates label, options (SELECT only) or position. Key and type are immutable. */
export async function updateLeadCustomField(
	idLeadCustomField: number,
	input: { label?: string; options?: string[]; position?: number },
	ctx: CrmRequestContext
): Promise<CustomFieldResult> {
	const field = await findActiveField(idLeadCustomField)
	if (!field) return { ok: false, reason: 'NOT_FOUND' }
	if (input.options !== undefined && field.type !== 'SELECT') return { ok: false, reason: 'OPTIONS_NOT_ALLOWED' }
	const record = await prisma.leadCustomField.update({
		where: { idLeadCustomField },
		data: input,
		select: fieldSelect,
	})
	await auditCrmEvent(ctx, AuditAction.LEAD_CUSTOM_FIELD_UPDATED, `Lead custom field ${idLeadCustomField} updated (${Object.keys(input).join(', ')})`)
	return { ok: true, field: toDefinition(record) }
}

/** Soft delete: the field disappears from forms; stored values are kept. */
export async function deactivateLeadCustomField(
	idLeadCustomField: number,
	ctx: CrmRequestContext
): Promise<{ ok: true } | { ok: false; reason: 'NOT_FOUND' }> {
	if (!(await findActiveField(idLeadCustomField))) return { ok: false, reason: 'NOT_FOUND' }
	await prisma.leadCustomField.update({ where: { idLeadCustomField }, data: { active: false } })
	await auditCrmEvent(ctx, AuditAction.LEAD_CUSTOM_FIELD_DEACTIVATED, `Lead custom field ${idLeadCustomField} deactivated`)
	return { ok: true }
}
