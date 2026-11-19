import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import {
	assignLeadOrigin,
	resolveLeadOrigin,
	type ResolvedLeadOrigin,
} from '@/features/leads/services/lead-origin.service'
import { resolveFunnelColumn, resolveOwner } from '@/features/leads/services/lead-sync.service'
import { recordLeadStageChange } from '@/features/leads/services/lead-stage-history.service'
import type { FormSubmissionPayload } from '@/features/leads/types/form-submission.schema'

export interface FormSubmissionResult {
	idLead: number
	created: boolean
	submissionId: string
}

type LeadLookup = Prisma.TransactionClient

function present(value: string | undefined): string | undefined {
	const trimmed = value?.trim()
	return trimmed ? trimmed : undefined
}

/**
 * Document, then email, then phone. The first hit wins.
 * An existing lead is not updated.
 */
async function findExistingLead(
	tx: LeadLookup,
	lead: FormSubmissionPayload['lead']
): Promise<{ idLead: number } | null> {
	const identityNumber = present(lead.identityNumber)
	const email = present(lead.email)
	const phone = present(lead.phone)

	if (identityNumber) {
		const byDocument = await tx.lead.findFirst({
			where: { identityNumber, active: true },
			select: { idLead: true },
		})
		if (byDocument) return byDocument
	}

	if (email) {
		const byEmail = await tx.lead.findFirst({
			where: { email: { equals: email, mode: 'insensitive' }, active: true },
			select: { idLead: true },
		})
		if (byEmail) return byEmail
	}

	if (!phone) return null
	return tx.lead.findFirst({
		where: { phone, active: true },
		select: { idLead: true },
	})
}

function isUniqueConflict(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code: unknown }).code === 'P2002'
	)
}

/**
 * Stores one landing snapshot. The lead row and the snapshot commit together.
 * A repeated `submissionId` returns the original lead and writes nothing.
 */
export async function ingestLeadFormSubmission(
	payload: FormSubmissionPayload
): Promise<FormSubmissionResult> {
	const alreadyStored = await loadExistingSubmission(payload.submissionId)
	if (alreadyStored) return alreadyStored

	const origin = await resolveLeadOrigin(payload.utm_source)

	try {
		const result = await prisma.$transaction(async (tx) => {
			const existing = await tx.leadFormSubmission.findUnique({
				where: { submissionId: payload.submissionId },
				select: { idLead: true },
			})
			if (existing) {
				return { idLead: existing.idLead, created: false, stored: false, columnId: null as number | null }
			}

			const matched = await findExistingLead(tx, payload.lead)
			let idLead = matched?.idLead
			let columnId: number | null = null
			if (!idLead) {
				const [funnelColumn, ownerId] = await Promise.all([
					resolveFunnelColumn(payload.lead.statusKey),
					resolveOwner(payload.lead.ownerEmail),
				])
				columnId = funnelColumn.idLeadFunnelColumn
				idLead = (
					await tx.lead.create({
						data: {
							name: present(payload.lead.name),
							lastName: present(payload.lead.lastName),
							email: present(payload.lead.email),
							phone: present(payload.lead.phone),
							identityNumber: present(payload.lead.identityNumber),
							originTag:
								origin.status === 'ready'
									? origin.name
									: (present(payload.lead.originTag) ?? payload.landing.name),
							idUser: ownerId ?? null,
							idLeadFunnelColumn: columnId,
							active: true,
							createdAt: payload.submittedAt,
							updatedAt: payload.submittedAt,
						},
						select: { idLead: true },
					})
				).idLead
			}

			await tx.leadFormSubmission.create({
				data: {
					submissionId: payload.submissionId,
					idLead,
					landingKey: payload.landing.key,
					landingName: payload.landing.name,
					landingVersion: payload.landing.version,
					submittedAt: payload.submittedAt,
					fields: payload.fields as Prisma.InputJsonValue,
				},
			})

			return { idLead, created: !matched, stored: true, columnId }
		})

		if (result.stored && result.created && result.columnId !== null) {
			await recordLeadStageChange({
				idLead: result.idLead,
				fromIdLeadFunnelColumn: null,
				toIdLeadFunnelColumn: result.columnId,
				source: 'CRM_SYNC',
				changedAt: payload.submittedAt,
			})
			await logAuditEvent({
				action: AuditAction.LEAD_CREATED,
				email: 'crm-sync@system',
				details: `Lead creado desde formulario ${payload.landing.key} (submissionId: ${payload.submissionId})`,
			})
		}

		if (result.stored) {
			await logAuditEvent({
				action: AuditAction.LEAD_FORM_SUBMISSION_RECORDED,
				email: 'crm-sync@system',
				details: `Foto de formulario ${payload.landing.key} v${payload.landing.version} guardada (submissionId: ${payload.submissionId}, idLead: ${result.idLead})`,
			})
			await recordFormOrigin(origin, result.idLead, payload.submissionId, payload.submittedAt)
		}

		return { idLead: result.idLead, created: result.created, submissionId: payload.submissionId }
	} catch (error) {
		if (!isUniqueConflict(error)) throw error
		const raced = await loadExistingSubmission(payload.submissionId)
		if (raced) return raced
		throw error
	}
}

async function recordFormOrigin(
	origin: ResolvedLeadOrigin,
	idLead: number,
	submissionId: string,
	seenAt: Date
): Promise<void> {
	if (origin.status === 'inactive') {
		await logAuditEvent({
			action: AuditAction.LEAD_ORIGIN_INACTIVE,
			email: 'crm-sync@system',
			details: `utm_source coincide con un origen inactivo y no se etiqueta (submissionId: ${submissionId}, code: ${origin.code})`,
		})
		return
	}

	if (origin.status !== 'ready') return

	const assignment = await assignLeadOrigin({
		idLead,
		idLeadOrigin: origin.idLeadOrigin,
		seenAt,
	})

	if (origin.createdCatalog) {
		await logAuditEvent({
			action: AuditAction.LEAD_ORIGIN_CREATED,
			email: 'crm-sync@system',
			details: `Origen de lead creado desde utm_source (code: ${origin.code}, name: ${origin.name})`,
		})
	}

	if (assignment !== 'refreshed') {
		await logAuditEvent({
			action: AuditAction.LEAD_ORIGIN_ASSIGNED,
			email: 'crm-sync@system',
			details: `Origen ${origin.code} ${assignment === 'created' ? 'asignado' : 'reactivado'} al lead (submissionId: ${submissionId})`,
		})
	}
}

export async function loadExistingSubmission(submissionId: string): Promise<FormSubmissionResult | null> {
	const existing = await prisma.leadFormSubmission.findUnique({
		where: { submissionId },
		select: { idLead: true, submissionId: true },
	})
	if (!existing) return null
	return { idLead: existing.idLead, created: false, submissionId: existing.submissionId }
}
