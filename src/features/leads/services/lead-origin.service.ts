import { prisma } from '@/lib/prisma'
import { leadOriginLabel, normalizeUtmSource } from '@/features/leads/lib/normalize-utm-source'

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
export async function resolveLeadOrigin(raw: string | undefined): Promise<ResolvedLeadOrigin> {
	if (raw === undefined || raw.trim() === '') return { status: 'absent' }

	const code = normalizeUtmSource(raw)
	if (code === null) return { status: 'absent' }

	const rows = await prisma.clientOrigin.findMany({
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

	const created = await prisma.clientOrigin.create({
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

/**
 * Links a lead to a `client_origin` through `lead_client_origin`.
 * Repeating the same pair refreshes `lastSeenAt` and reactivates a removed row.
 */
export async function assignLeadOrigin(input: {
	idLead: number
	idClientOrigin: number
	seenAt: Date
}): Promise<OriginAssignmentChange> {
	const existing = await prisma.leadClientOrigin.findUnique({
		where: {
			idLead_idClientOrigin: {
				idLead: input.idLead,
				idClientOrigin: input.idClientOrigin,
			},
		},
		select: { idLeadClientOrigin: true, active: true },
	})

	if (!existing) {
		await prisma.leadClientOrigin.create({
			data: {
				idLead: input.idLead,
				idClientOrigin: input.idClientOrigin,
				active: true,
				firstSeenAt: input.seenAt,
				lastSeenAt: input.seenAt,
			},
		})
		return 'created'
	}

	await prisma.leadClientOrigin.update({
		where: { idLeadClientOrigin: existing.idLeadClientOrigin },
		data: { active: true, lastSeenAt: input.seenAt },
	})

	return existing.active ? 'refreshed' : 'reactivated'
}
