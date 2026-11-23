import type { Prisma } from '@prisma/client'
import { escapeLikePattern } from '@/features/leads/lib/escape-like-pattern'

type PersonLookup = Pick<Prisma.TransactionClient, 'lead' | 'leadClientOrigin'>

const MATCHED_LEAD_SELECT = { idLead: true, idUser: true } as const

export interface SamePersonContact {
	identityNumber?: string | null
	email?: string | null
	phone?: string | null
}

function present(value: string | null | undefined): string | undefined {
	const trimmed = value?.trim()
	return trimmed ? trimmed : undefined
}

type MatchedLead = { idLead: number; idUser: number | null }

/** One unambiguous row, `'ambiguous'` when several match, or `null` when none do. */
async function findUnique(
	db: PersonLookup,
	where: Prisma.LeadWhereInput
): Promise<MatchedLead | 'ambiguous' | null> {
	const rows = await db.lead.findMany({
		where: { active: true, ...where },
		select: MATCHED_LEAD_SELECT,
		orderBy: { idLead: 'asc' },
		take: 2,
	})
	if (rows.length > 1) return 'ambiguous'
	return rows[0] ?? null
}

/**
 * Document, then email, then phone. The first key with exactly one hit wins.
 * When a key matches more than one lead the person cannot be told apart, so
 * the result is `null`: the caller must not link to or inherit from any of them.
 * The matched row is not rewritten. A different origin becomes its own lead.
 */
export async function findSamePersonLead(
	db: PersonLookup,
	contact: SamePersonContact
): Promise<MatchedLead | null> {
	const identityNumber = present(contact.identityNumber)
	const email = present(contact.email)
	const phone = present(contact.phone)

	const attempts: Prisma.LeadWhereInput[] = []
	if (identityNumber) attempts.push({ identityNumber })
	if (email) {
		// Prisma's case-insensitive equality is an ILIKE: escape `%`, `_` and `\`.
		attempts.push({ email: { equals: escapeLikePattern(email), mode: 'insensitive' } })
	}
	if (phone) attempts.push({ phone })

	for (const where of attempts) {
		const found = await findUnique(db, where)
		if (found === 'ambiguous') return null
		if (found) return found
	}
	return null
}

/** True when this person already has an active link to the incoming origin. */
export async function personAlreadyHasOrigin(
	db: PersonLookup,
	idLead: number,
	idClientOrigin: number
): Promise<boolean> {
	const row = await db.leadClientOrigin.findFirst({
		where: { idLead, idClientOrigin, active: true },
		select: { idLeadClientOrigin: true },
	})
	return row !== null
}
