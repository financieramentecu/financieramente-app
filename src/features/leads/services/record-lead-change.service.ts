import * as Sentry from '@sentry/nextjs'
import type { LeadChangeKind, LeadChangeSource } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export interface LeadChangeInput {
	idLead: number
	kind: LeadChangeKind
	source: LeadChangeSource
	idActor?: number | null
	actorLabel?: string | null
	fromLabel: string | null
	toLabel: string
	changedAt: Date
}

const UNASSIGNED_OWNER = 'Sin Money Strategy'

function personName(user: { name: string; lastName: string | null } | null | undefined): string | null {
	if (!user) return null
	const name = [user.name, user.lastName].filter(Boolean).join(' ').trim()
	return name || null
}

/**
 * Appends Money Strategy and origin changes for the CRM timeline.
 * A failure never blocks the assignment that already happened.
 */
export async function recordLeadChanges(rows: LeadChangeInput[]): Promise<void> {
	if (rows.length === 0) return
	try {
		const actorIds = [
			...new Set(
				rows.flatMap((row) =>
					row.source === 'MANUAL' && row.actorLabel === undefined && row.idActor ? [row.idActor] : []
				)
			),
		]
		const actors =
			actorIds.length === 0
				? []
				: await prisma.user.findMany({
						where: { idUser: { in: actorIds } },
						select: { idUser: true, name: true, lastName: true },
					})
		const actorById = new Map(actors.map((actor) => [actor.idUser, personName(actor)]))
		await prisma.leadChangeHistory.createMany({
			data: rows.map((row) => ({
				idLead: row.idLead,
				kind: row.kind,
				source: row.source,
				idActor: row.source === 'SYSTEM' ? null : (row.idActor ?? null),
				actorLabel:
					row.source === 'SYSTEM' ? null : (row.actorLabel ?? (row.idActor ? actorById.get(row.idActor) ?? null : null)),
				fromLabel: row.fromLabel,
				toLabel: row.toLabel,
				changedAt: row.changedAt,
			})),
		})
	} catch (error) {
		Sentry.captureException(error)
	}
}

/** Records one Money Strategy change. Skips a no-op where the owner stays the same. */
export async function recordOwnerChange(input: {
	idLead: number
	fromUserId: number | null
	toUserId: number | null
	source: LeadChangeSource
	idActor?: number | null
	actorLabel?: string | null
	/** When set, the caller already knows the labels and no user lookup runs. */
	fromLabel?: string | null
	toLabel?: string
	changedAt: Date
}): Promise<void> {
	if (input.fromUserId === input.toUserId) return
	if (input.toLabel !== undefined) {
		await recordLeadChanges([
			{
				idLead: input.idLead,
				kind: 'OWNER',
				source: input.source,
				idActor: input.idActor,
				actorLabel: input.actorLabel,
				fromLabel: input.fromLabel ?? null,
				toLabel: input.toLabel,
				changedAt: input.changedAt,
			},
		])
		return
	}
	try {
		const ids = [input.fromUserId, input.toUserId].filter((id): id is number => id != null)
		const users =
			ids.length === 0
				? []
				: await prisma.user.findMany({
						where: { idUser: { in: ids } },
						select: { idUser: true, name: true, lastName: true },
					})
		const byId = new Map(users.map((user) => [user.idUser, personName(user)]))
		await recordLeadChanges([
			{
				idLead: input.idLead,
				kind: 'OWNER',
				source: input.source,
				idActor: input.idActor,
				actorLabel: input.actorLabel,
				fromLabel: input.fromUserId == null ? null : (byId.get(input.fromUserId) ?? null),
				toLabel: input.toUserId == null ? UNASSIGNED_OWNER : (byId.get(input.toUserId) ?? UNASSIGNED_OWNER),
				changedAt: input.changedAt,
			},
		])
	} catch (error) {
		Sentry.captureException(error)
	}
}
