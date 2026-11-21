import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import {
	resolveFunnelColumn,
	resolveOwner,
} from '@/features/leads/services/lead-sync.service'
import { escapeLikePattern } from '@/features/leads/lib/escape-like-pattern'
import type { FormSubmissionPayload } from '@/features/leads/types/form-submission.schema'
import type { IngestLeadFormResult } from '@/features/leads/types/form-submission.types'

import {
	assignLeadOrigin,
	resolveLeadOrigin,
} from '@/features/leads/services/lead-origin.service'

const SYSTEM_EMAIL = 'form-submission@system'

export class LeadFormSubmissionError extends Error {
	constructor(
		readonly code: 'AMBIGUOUS_LEAD',
		message: string
	) {
		super(message)
		this.name = 'LeadFormSubmissionError'
	}
}

interface AuditContext {
	ipAddress?: string
	userAgent?: string
}

interface LeadIdentity {
	identityNumber?: string
	email?: string
	phone?: string
}

type LeadLookup = {
	findMany: (args: {
		where: {
			active: boolean
			identityNumber?: string
			email?: { equals: string; mode: 'insensitive' }
			phone?: string
		}
		select: { idLead: true }
		take: number
	}) => Promise<Array<{ idLead: number }>>
}

async function findSingleActiveLead(
	lead: LeadLookup,
	where: {
		identityNumber?: string
		email?: { equals: string; mode: 'insensitive' }
		phone?: string
	}
): Promise<number | 'ambiguous' | null> {
	const rows = await lead.findMany({
		where: { active: true, ...where },
		select: { idLead: true },
		take: 2,
	})
	if (rows.length > 1) return 'ambiguous'
	if (rows.length === 1) return rows[0].idLead
	return null
}

async function resolveExistingLead(
	lead: LeadLookup,
	identity: LeadIdentity
): Promise<number | null> {
	if (identity.identityNumber) {
		const byDocument = await findSingleActiveLead(lead, {
			identityNumber: identity.identityNumber,
		})
		if (byDocument === 'ambiguous') {
			throw new LeadFormSubmissionError(
				'AMBIGUOUS_LEAD',
				'Hay más de un prospecto con ese documento'
			)
		}
		if (byDocument !== null) return byDocument
	}
	if (identity.email) {
		const byEmail = await findSingleActiveLead(lead, {
			email: { equals: escapeLikePattern(identity.email), mode: 'insensitive' },
		})
		if (byEmail === 'ambiguous') {
			throw new LeadFormSubmissionError(
				'AMBIGUOUS_LEAD',
				'Hay más de un prospecto con ese correo'
			)
		}
		if (byEmail !== null) return byEmail
	}
	if (identity.phone) {
		const byPhone = await findSingleActiveLead(lead, { phone: identity.phone })
		if (byPhone === 'ambiguous') {
			throw new LeadFormSubmissionError(
				'AMBIGUOUS_LEAD',
				'Hay más de un prospecto con ese teléfono'
			)
		}
		if (byPhone !== null) return byPhone
	}
	return null
}

function isUniqueViolation(error: unknown): boolean {
	return (
		error instanceof Prisma.PrismaClientKnownRequestError &&
		error.code === 'P2002'
	)
}

/**
 * Stores one landing snapshot and creates the prospect only when no active
 * match exists. An existing prospect keeps its stage, owner and CRM fields.
 * The same `submissionId` is a retry and writes nothing.
 */
export async function ingestLeadFormSubmission(
	payload: FormSubmissionPayload,
	audit: AuditContext = {}
): Promise<IngestLeadFormResult> {
	try {
		const result = await prisma.$transaction(
			async (tx) => {
				const identityKeys = [
					payload.lead.identityNumber &&
						`document:${payload.lead.identityNumber}`,
					payload.lead.email && `email:${payload.lead.email.toLowerCase()}`,
					payload.lead.phone && `phone:${payload.lead.phone}`,
				]
					.filter((key): key is string => Boolean(key))
					.sort()
				// Serialize overlapping identities before matching; sorted keys avoid deadlocks.
				for (const identityKey of identityKeys) {
					await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`lead-form:${identityKey}`}, 0))`
				}

				const stored = await tx.leadFormSubmission.findUnique({
					where: { submissionId: payload.submissionId },
					select: { idLead: true },
				})
				if (stored) {
					return {
						idLead: stored.idLead,
						created: false,
						replayed: true,
						ownerUnresolved: false,
					}
				}

				const origin = await resolveLeadOrigin(payload.utm_source, tx)
				const existingId = await resolveExistingLead(tx.lead, payload.lead)
				let idLead = existingId
				let ownerUnresolved = false
				if (idLead === null) {
					const column = await resolveFunnelColumn(payload.lead.statusKey, tx)
					const ownerId = await resolveOwner(payload.lead.ownerEmail, tx)
					const createdLead = await tx.lead.create({
						data: {
							name: payload.lead.name ?? null,
							lastName: payload.lead.lastName ?? null,
							email: payload.lead.email ?? null,
							phone: payload.lead.phone ?? null,
							identityNumber: payload.lead.identityNumber ?? null,
							originTag:
								origin.status === 'ready'
									? origin.name
									: (payload.lead.originTag ?? payload.landing.name),
							idUser: ownerId ?? null,
							idLeadFunnelColumn: column.idLeadFunnelColumn,
							outcomeStatus: 'OPEN',
							active: true,
						},
					})
					await tx.leadStageHistory.create({
						data: {
							idLead: createdLead.idLead,
							fromIdLeadFunnelColumn: null,
							toIdLeadFunnelColumn: column.idLeadFunnelColumn,
							source: 'LANDING_FORM',
							changedAt: payload.submittedAt,
						},
					})
					idLead = createdLead.idLead
					ownerUnresolved = Boolean(payload.lead.ownerEmail) && ownerId === null
				}
				const assignment =
					origin.status === 'ready'
						? await assignLeadOrigin(
								{
									idLead,
									idLeadOrigin: origin.idLeadOrigin,
									seenAt: payload.submittedAt,
								},
								tx
							)
						: null
				await tx.leadFormSubmission.create({
					data: {
						idLead,
						submissionId: payload.submissionId,
						landingKey: payload.landing.key,
						landingName: payload.landing.name,
						formVersion: payload.landing.version,
						submittedAt: payload.submittedAt,
						fields: payload.fields,
					},
				})
				return {
					idLead,
					created: existingId === null,
					replayed: false,
					ownerUnresolved,
					origin,
					assignment,
				}
			},
			{ isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
		)

		if (!result.replayed) {
			if (result.origin?.status === 'inactive') {
				await logAuditEvent({
					action: AuditAction.LEAD_ORIGIN_INACTIVE,
					email: SYSTEM_EMAIL,
					details: `Origen inactivo: ${result.origin.code} (submissionId: ${payload.submissionId})`,
				})
			} else if (result.origin?.status === 'ready') {
				if (result.origin.createdCatalog) {
					await logAuditEvent({
						action: AuditAction.LEAD_ORIGIN_CREATED,
						email: SYSTEM_EMAIL,
						details: `Origen creado: ${result.origin.code}`,
					})
				}
				if (result.assignment !== 'refreshed') {
					await logAuditEvent({
						action: AuditAction.LEAD_ORIGIN_ASSIGNED,
						email: SYSTEM_EMAIL,
						details: `Origen ${result.origin.code} asignado al lead ${result.idLead}`,
					})
				}
			}
			if (result.created) {
				await logAuditEvent({
					action: AuditAction.LEAD_CREATED,
					email: SYSTEM_EMAIL,
					ipAddress: audit.ipAddress,
					userAgent: audit.userAgent,
					details: `Prospecto creado desde landing ${payload.landing.key} (submissionId: ${payload.submissionId})`,
				})
			}
			if (result.ownerUnresolved) {
				await logAuditEvent({
					action: AuditAction.LEAD_OWNER_UNRESOLVED,
					email: SYSTEM_EMAIL,
					ipAddress: audit.ipAddress,
					userAgent: audit.userAgent,
					details: `ownerEmail no coincide con ningún usuario activo (submissionId: ${payload.submissionId})`,
				})
			}
			await logAuditEvent({
				action: AuditAction.LEAD_FORM_SUBMISSION_STORED,
				email: SYSTEM_EMAIL,
				ipAddress: audit.ipAddress,
				userAgent: audit.userAgent,
				details: `Foto de formulario guardada (submissionId: ${payload.submissionId}, landing: ${payload.landing.key}, lead: ${result.idLead})`,
			})
		}

		return {
			idLead: result.idLead,
			created: result.created,
			replayed: result.replayed,
		}
	} catch (error) {
		if (!isUniqueViolation(error)) throw error
		const stored = await prisma.leadFormSubmission.findUnique({
			where: { submissionId: payload.submissionId },
			select: { idLead: true },
		})
		if (!stored) throw error
		return { idLead: stored.idLead, created: false, replayed: true }
	}
}
