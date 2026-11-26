import * as Sentry from '@sentry/nextjs'
import type { LeadChangeSource, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { leadOriginLabel, normalizeUtmSource } from '@/features/leads/lib/normalize-utm-source'
import { recordLeadChanges } from '@/features/leads/services/record-lead-change.service'

const CLIENT_ORIGIN_NAME_MAX = 100

export type ResolvedLeadOrigin =
	| { status: 'absent' }
	| { status: 'inactive'; code: string }
	| {
			status: 'ready'
			idClientOrigin: number
			code: string
			name: string
			createdCatalog: boolean
	  }

/**
 * Matches `utm_source` against `client_origin.name`.
 * "Money Strategy", "money-strategy" and "money_strategy" are the same origin.
 * A missing name is created. An inactive name is left inactive.
 */
export async function resolveLeadOrigin(
	raw: string | undefined,
	client: Prisma.TransactionClient = prisma
): Promise<ResolvedLeadOrigin> {
	if (raw === undefined || raw.trim() === '') return { status: 'absent' }

	const code = normalizeUtmSource(raw)
	if (code === null) return { status: 'absent' }

	const rows = await client.clientOrigin.findMany({
		select: { idClientOrigin: true, name: true, status: true },
	})
	const matches = rows.filter((row) => normalizeUtmSource(row.name) === code)
	const active = matches.find((row) => row.status)
	if (active) {
		return {
			status: 'ready',
			idClientOrigin: active.idClientOrigin,
			code,
			name: active.name,
			createdCatalog: false,
		}
	}
	if (matches.some((row) => !row.status)) return { status: 'inactive', code }

	const created = await client.clientOrigin.create({
		data: { name: leadOriginLabel(raw, code).slice(0, CLIENT_ORIGIN_NAME_MAX), status: true },
		select: { idClientOrigin: true, name: true },
	})
	return {
		status: 'ready',
		idClientOrigin: created.idClientOrigin,
		code,
		name: created.name,
		createdCatalog: true,
	}
}

export type OriginAssignmentChange = 'created' | 'reactivated' | 'refreshed'

export interface OriginAssignmentInput {
	idLead: number
	idClientOrigin: number
	seenAt: Date
	/** Who assigned it. Omitted calls are the webhook or the form, so they count as the system. */
	history?: { source: LeadChangeSource; idActor?: number | null; actorLabel?: string | null }
}

/**
 * Links a lead to a `client_origin` through `lead_client_origin`.
 * Repeating the same pair refreshes `lastSeenAt` and reactivates a removed row.
 *
 * The timeline entry is written here only when no transaction client is passed.
 * Inside a transaction the lead may not be committed yet, so the caller must
 * call `recordOriginChange` after the commit.
 */
export async function assignLeadOrigin(
	input: OriginAssignmentInput,
	client: Prisma.TransactionClient = prisma
): Promise<OriginAssignmentChange> {
	const existing = await client.leadClientOrigin.findUnique({
		where: {
			idLead_idClientOrigin: {
				idLead: input.idLead,
				idClientOrigin: input.idClientOrigin,
			},
		},
		select: { idLeadClientOrigin: true, active: true },
	})

	if (!existing) {
		await client.leadClientOrigin.create({
			data: {
				idLead: input.idLead,
				idClientOrigin: input.idClientOrigin,
				active: true,
				firstSeenAt: input.seenAt,
				lastSeenAt: input.seenAt,
			},
		})
		if (client === prisma) await recordOriginChange(input)
		return 'created'
	}

	await client.leadClientOrigin.update({
		where: { idLeadClientOrigin: existing.idLeadClientOrigin },
		data: { active: true, lastSeenAt: input.seenAt },
	})

	if (!existing.active && client === prisma) await recordOriginChange(input)
	return existing.active ? 'refreshed' : 'reactivated'
}

/** Appends the origin change to the CRM timeline. Never throws. */
export async function recordOriginChange(input: OriginAssignmentInput): Promise<void> {
	try {
		const [origin, previous] = await Promise.all([
			prisma.clientOrigin.findUnique({
				where: { idClientOrigin: input.idClientOrigin },
				select: { name: true },
			}),
			prisma.leadClientOrigin.findFirst({
				where: {
					idLead: input.idLead,
					active: true,
					idClientOrigin: { not: input.idClientOrigin },
				},
				orderBy: { lastSeenAt: 'desc' },
				select: { clientOrigin: { select: { name: true } } },
			}),
		])
		await recordLeadChanges([
			{
				idLead: input.idLead,
				kind: 'ORIGIN',
				source: input.history?.source ?? 'SYSTEM',
				idActor: input.history?.idActor,
				actorLabel: input.history?.actorLabel,
				fromLabel: previous?.clientOrigin.name ?? null,
				toLabel: origin?.name ?? 'Origen',
				changedAt: input.seenAt,
			},
		])
	} catch (error) {
		Sentry.captureException(error)
	}
}
