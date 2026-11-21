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
import { recordOwnerChange } from '@/features/leads/services/record-lead-change.service'
import {
	findSamePersonLead,
	personAlreadyHasOrigin,
} from '@/features/leads/services/find-same-person-lead'
import type { FormSubmissionPayload } from '@/features/leads/types/form-submission.schema'

export interface FormSubmissionResult {
	idLead: number
	created: boolean
	submissionId: string
}

function present(value: string | undefined): string | undefined {
	const trimmed = value?.trim()
	return trimmed ? trimmed : undefined
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
				return {
					idLead: existing.idLead,
					created: false,
					stored: false,
					columnId: null as number | null,
					relatedTo: null as number | null,
					assignedAdvisorId: null as number | null,
				}
			}

			const matched = await findSamePersonLead(tx, payload.lead)
			const splitByOrigin =
				matched !== null &&
				origin.status === 'ready' &&
				!(await personAlreadyHasOrigin(tx, matched.idLead, origin.idClientOrigin))
			let idLead = splitByOrigin ? undefined : matched?.idLead
			let columnId: number | null = null
			let relatedTo: number | null = null
			let assignedAdvisorId: number | null = null
			if (!idLead) {
				const [funnelColumn, ownerId] = await Promise.all([
					resolveFunnelColumn(payload.lead.statusKey),
					resolveOwner(payload.lead.ownerEmail),
				])
				columnId = funnelColumn.idLeadFunnelColumn
				const advisorId = splitByOrigin ? (matched?.idUser ?? ownerId ?? null) : (ownerId ?? null)
				assignedAdvisorId = advisorId
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
							idUser: advisorId,
							idLeadFunnelColumn: columnId,
							active: true,
							createdAt: payload.submittedAt,
							updatedAt: payload.submittedAt,
						},
						select: { idLead: true },
					})
				).idLead
				if (splitByOrigin && matched) {
					await tx.leadLink.create({
						data: {
							idLead,
							idRelatedLead: matched.idLead,
							idClientOrigin: origin.idClientOrigin,
							source: 'AUTO',
							active: true,
							linkedAt: payload.submittedAt,
						},
					})
					relatedTo = matched.idLead
				}
			}

			if (idLead === undefined) {
				throw new Error('Form lead was not persisted')
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

			return {
				idLead,
				created: !matched || splitByOrigin,
				stored: true,
				columnId,
				relatedTo,
				assignedAdvisorId,
			}
		})

		if (result.stored && result.assignedAdvisorId != null && result.idLead != null) {
			await recordOwnerChange({
				idLead: result.idLead,
				fromUserId: null,
				toUserId: result.assignedAdvisorId,
				source: 'SYSTEM',
				changedAt: payload.submittedAt,
			})
		}

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

		if (result.stored && result.relatedTo !== null) {
			await logAuditEvent({
				action: AuditAction.LEAD_RELATED,
				email: 'crm-sync@system',
				details: `Lead ${result.idLead} ingresó por otro origen y quedó relacionado con ${result.relatedTo} (submissionId: ${payload.submissionId})`,
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
		idClientOrigin: origin.idClientOrigin,
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
