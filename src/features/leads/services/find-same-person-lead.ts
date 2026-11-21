import type { Prisma } from '@prisma/client'

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

/**
 * Document, then email, then phone. The first hit wins.
 * The matched row is not rewritten. A different origin becomes its own lead.
 */
export async function findSamePersonLead(
	db: PersonLookup,
	contact: SamePersonContact
): Promise<{ idLead: number; idUser: number | null } | null> {
	const identityNumber = present(contact.identityNumber)
	const email = present(contact.email)
	const phone = present(contact.phone)

	if (identityNumber) {
		const byDocument = await db.lead.findFirst({
			where: { identityNumber, active: true },
			select: MATCHED_LEAD_SELECT,
		})
		if (byDocument) return byDocument
	}

	if (email) {
		const byEmail = await db.lead.findFirst({
			where: { email: { equals: email, mode: 'insensitive' }, active: true },
			select: MATCHED_LEAD_SELECT,
		})
		if (byEmail) return byEmail
	}

	if (!phone) return null
	return db.lead.findFirst({
		where: { phone, active: true },
		select: MATCHED_LEAD_SELECT,
	})
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
