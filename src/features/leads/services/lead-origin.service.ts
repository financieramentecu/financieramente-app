import { prisma } from '@/lib/prisma'
import { leadOriginLabel, normalizeUtmSource } from '@/features/leads/lib/normalize-utm-source'

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

function isUniqueConflict(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code: unknown }).code === 'P2002'
	)
}

/**
 * Loads the origin catalogue row for an incoming `utm_source`.
 * A missing code is created. An inactive code is left inactive.
 */
export async function resolveLeadOrigin(raw: string | undefined): Promise<ResolvedLeadOrigin> {
	if (raw === undefined || raw.trim() === '') return { status: 'absent' }

	const code = normalizeUtmSource(raw)
	if (code === null) return { status: 'absent' }

	const existing = await prisma.leadOrigin.findUnique({ where: { code } })
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

	try {
		const created = await prisma.leadOrigin.create({
			data: { code, name: leadOriginLabel(raw, code), status: true },
		})
		return {
			status: 'ready',
			idLeadOrigin: created.idLeadOrigin,
			code: created.code,
			name: created.name,
			createdCatalog: true,
		}
	} catch (error) {
		if (!isUniqueConflict(error)) throw error
		const raced = await prisma.leadOrigin.findUnique({ where: { code } })
		if (!raced) throw error
		if (!raced.status) return { status: 'inactive', code }
		return {
			status: 'ready',
			idLeadOrigin: raced.idLeadOrigin,
			code: raced.code,
			name: raced.name,
			createdCatalog: false,
		}
	}
}

export type OriginAssignmentChange = 'created' | 'reactivated' | 'refreshed'

/**
 * Links a lead to an origin through the pivot. Repeating the same pair
 * refreshes `lastSeenAt` and reactivates a previously removed row.
 */
export async function assignLeadOrigin(input: {
	idLead: number
	idLeadOrigin: number
	seenAt: Date
}): Promise<OriginAssignmentChange> {
	const existing = await prisma.leadOriginAssignment.findUnique({
		where: {
			idLead_idLeadOrigin: {
				idLead: input.idLead,
				idLeadOrigin: input.idLeadOrigin,
			},
		},
		select: { idLeadOriginAssignment: true, active: true },
	})

	if (!existing) {
		await prisma.leadOriginAssignment.create({
			data: {
				idLead: input.idLead,
				idLeadOrigin: input.idLeadOrigin,
				active: true,
				firstSeenAt: input.seenAt,
				lastSeenAt: input.seenAt,
			},
		})
		return 'created'
	}

	await prisma.leadOriginAssignment.update({
		where: { idLeadOriginAssignment: existing.idLeadOriginAssignment },
		data: { active: true, lastSeenAt: input.seenAt },
	})

	return existing.active ? 'refreshed' : 'reactivated'
}
