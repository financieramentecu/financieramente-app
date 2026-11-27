import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { escapeLikePattern } from '@/features/leads/lib/escape-like-pattern'

export const PERSON_GROUP_ERROR =
	'No fue posible modificar el grupo relacionado'
export class LeadPersonGroupError extends Error {
	constructor() {
		super(PERSON_GROUP_ERROR)
	}
}
export type LeadGroupDb = Pick<
	Prisma.TransactionClient,
	'lead' | 'leadLink' | 'user' | 'leadChangeHistory'
>
export interface LeadPersonContact {
	email?: string | null
	phone?: string | null
	identityNumber?: string | null
}
export function personContactFilters(
	contact: LeadPersonContact
): Prisma.LeadWhereInput[] {
	const email = contact.email?.trim()
	const phone = contact.phone?.trim()
	const identityNumber = contact.identityNumber?.trim()
	return [
		...(email
			? [
					{
						email: {
							equals: escapeLikePattern(email),
							mode: 'insensitive' as const,
						},
					},
				]
			: []),
		...(phone ? [{ phone }] : []),
		...(identityNumber ? [{ identityNumber }] : []),
	]
}

export async function findPersonContactIds(
	db: LeadGroupDb,
	contact: LeadPersonContact,
	excludeId?: number
): Promise<number[]> {
	const OR = personContactFilters(contact)
	if (OR.length === 0) return []
	const rows = await db.lead.findMany({
		where: {
			active: true,
			OR,
			...(excludeId === undefined ? {} : { idLead: { not: excludeId } }),
		},
		select: { idLead: true },
	})
	return rows.map((row) => row.idLead)
}

/** Traverse persisted active links, without truncating the component by write visibility. */
export async function collectPersonGroupIds(
	seedIds: readonly number[],
	db: LeadGroupDb = prisma
): Promise<number[]> {
	const ids = new Set(seedIds)
	let pending = [...ids]
	while (pending.length > 0) {
		const links = await db.leadLink.findMany({
			where: {
				active: true,
				lead: { active: true },
				relatedLead: { active: true },
				OR: [{ idLead: { in: pending } }, { idRelatedLead: { in: pending } }],
			},
			select: { idLead: true, idRelatedLead: true },
		})
		pending = links
			.flatMap((link) => [link.idLead, link.idRelatedLead])
			.filter((id) => {
				if (ids.has(id)) return false
				ids.add(id)
				return true
			})
	}
	return [...ids]
}

/** Empty allowed IDs means an explicitly authorized company-wide writer. */
export async function resolvePersonGroupOwner(
	db: LeadGroupDb,
	ids: readonly number[],
	options: { manageableUserIds?: readonly number[]; targetOwnerId?: number }
): Promise<number | null> {
	const rows = await db.lead.findMany({
		where: { idLead: { in: [...ids] }, active: true },
		select: { idLead: true, idUser: true },
	})
	const scope = options.manageableUserIds
	if (
		scope === undefined ||
		(scope.length > 0 &&
			rows.some((row) => row.idUser == null || !scope.includes(row.idUser)))
	)
		throw new LeadPersonGroupError()
	const owners = [
		...new Set(rows.flatMap((row) => (row.idUser == null ? [] : [row.idUser]))),
	]
	const target = options.targetOwnerId
	if (target !== undefined) {
		if (scope.length > 0 && !scope.includes(target))
			throw new LeadPersonGroupError()
		if (
			!(await db.user.findFirst({
				where: { idUser: target, active: true },
				select: { idUser: true },
			}))
		)
			throw new LeadPersonGroupError()
		return target
	}
	if (owners.length > 1) throw new LeadPersonGroupError()
	return owners[0] ?? null
}

export async function propagatePersonGroupOwner(
	db: LeadGroupDb,
	ids: readonly number[],
	idUser: number,
	actor: {
		source: 'MANUAL' | 'SYSTEM'
		idActor?: number | null
		actorLabel?: string | null
	},
	changedAt = new Date()
): Promise<void> {
	const pending = await db.lead.findMany({
		where: {
			idLead: { in: [...ids] },
			active: true,
			OR: [{ idUser: null }, { idUser: { not: idUser } }],
		},
		select: { idLead: true, user: { select: { name: true, lastName: true } } },
	})
	if (pending.length === 0) return
	const owner = await db.user.findFirst({
		where: { idUser, active: true },
		select: { name: true, lastName: true },
	})
	if (!owner) throw new LeadPersonGroupError()
	await db.lead.updateMany({
		where: { idLead: { in: pending.map((row) => row.idLead) }, active: true },
		data: { idUser, lastActivityAt: changedAt },
	})
	await db.leadChangeHistory.createMany({
		data: pending.map((row) => ({
			idLead: row.idLead,
			kind: 'OWNER',
			source: actor.source,
			idActor: actor.idActor ?? null,
			actorLabel: actor.actorLabel ?? null,
			fromLabel: row.user
				? [row.user.name, row.user.lastName].filter(Boolean).join(' ')
				: null,
			toLabel: [owner.name, owner.lastName].filter(Boolean).join(' '),
			changedAt,
		})),
	})
}
