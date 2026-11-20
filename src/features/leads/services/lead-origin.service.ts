import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
	leadOriginLabel,
	normalizeUtmSource,
} from '@/features/leads/lib/normalize-utm-source'

export type ResolvedLeadOrigin =
	| { status: 'absent' }
	| { status: 'inactive'; code: string }
	| {
			status: 'ready'
			idLeadOrigin: number
			code: string
			name: string
			createdCatalog: boolean
	  }

/**
 * Loads the origin catalogue row for an incoming `utm_source`.
 * A missing code is created. An inactive code is left inactive.
 */
export async function resolveLeadOrigin(
	raw: string | undefined,
	client: Prisma.TransactionClient = prisma
): Promise<ResolvedLeadOrigin> {
	if (raw === undefined || raw.trim() === '') return { status: 'absent' }

	const code = normalizeUtmSource(raw)
	if (code === null) return { status: 'absent' }

	const existing = await client.leadOrigin.findUnique({ where: { code } })
	if (existing) {
		if (!existing.status) return { status: 'inactive', code }
		return {
			status: 'ready',
			idLeadOrigin: existing.idLeadOrigin,
			code: existing.code,
			name: existing.name,
			createdCatalog: false,
		}
	}

	const created = await client.leadOrigin.upsert({
		where: { code },
		create: { code, name: leadOriginLabel(raw, code), status: true },
		update: { code },
	})
	if (!created.status) return { status: 'inactive', code }
	return {
		status: 'ready',
		idLeadOrigin: created.idLeadOrigin,
		code: created.code,
		name: created.name,
		createdCatalog: true,
	}
}

export type OriginAssignmentChange = 'created' | 'reactivated' | 'refreshed'

/**
 * Links a lead to an origin through the pivot. Repeating the same pair
 * refreshes `lastSeenAt` and reactivates a previously removed row.
 */
export async function assignLeadOrigin(
	input: {
		idLead: number
		idLeadOrigin: number
		seenAt: Date
	},
	client: Prisma.TransactionClient = prisma
): Promise<OriginAssignmentChange> {
	const existing = await client.leadOriginAssignment.findUnique({
		where: {
			idLead_idLeadOrigin: {
				idLead: input.idLead,
				idLeadOrigin: input.idLeadOrigin,
			},
		},
		select: { idLeadOriginAssignment: true, active: true },
	})

	await client.leadOriginAssignment.upsert({
		where: {
			idLead_idLeadOrigin: {
				idLead: input.idLead,
				idLeadOrigin: input.idLeadOrigin,
			},
		},
		create: {
			idLead: input.idLead,
			idLeadOrigin: input.idLeadOrigin,
			active: true,
			firstSeenAt: input.seenAt,
			lastSeenAt: input.seenAt,
		},
		update: { active: true, lastSeenAt: input.seenAt },
	})
	return !existing ? 'created' : existing.active ? 'refreshed' : 'reactivated'
}
