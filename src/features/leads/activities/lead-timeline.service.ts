import type { LeadChangeKind, LeadChangeSource, LeadLinkSource, LeadStageChangeSource, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { leadDisplayName } from '@/features/leads/lib/lead-display-name'
import type { LeadLinkSide } from '@/features/leads/types/lead-link.types'
import {
	getLeadActivityPage,
	type LeadActivityCursor,
	type LeadTimelineItem,
} from '@/features/leads/activities/lead-activity.service'
import {
	compareTimelineKeys,
	encodeTimelineCursor,
	type TimelineKey,
} from '@/features/leads/activities/merge-timeline'

export type LeadTimelineActivityEntry = LeadTimelineItem & { kind: 'activity' }

export interface LeadTimelineStageEntry {
	kind: 'stage_change'
	idLeadStageHistory: number
	occurredAt: Date
	actorName: string | null
	fromColumnName: string | null
	toColumnName: string
	source: LeadStageChangeSource
}

export interface LeadTimelineChangeEntry {
	kind: 'lead_change'
	idLeadChangeHistory: number
	occurredAt: Date
	change: LeadChangeKind
	source: LeadChangeSource
	actorName: string | null
	fromLabel: string | null
	toLabel: string
}

export interface LeadTimelineIngressEntry {
	kind: 'lead_ingress'
	idLeadLink: number
	occurredAt: Date
	actorName: string | null
	originName: string
	incomingLeadName: string
	relatedLeadName: string
	side: LeadLinkSide
	source: LeadLinkSource
}

export type LeadTimelineEntry =
	| LeadTimelineActivityEntry
	| LeadTimelineStageEntry
	| LeadTimelineChangeEntry
	| LeadTimelineIngressEntry

export interface LeadTimelinePage {
	items: LeadTimelineEntry[]
	nextCursor: string | null
}

function toKey(entry: LeadTimelineEntry): TimelineKey {
	if (entry.kind === 'activity') {
		return { occurredAt: entry.occurredAt, kind: 'activity', id: entry.idLeadActivity }
	}
	if (entry.kind === 'lead_ingress') {
		return { occurredAt: entry.occurredAt, kind: 'lead_ingress', id: entry.idLeadLink }
	}
	if (entry.kind === 'lead_change') {
		return { occurredAt: entry.occurredAt, kind: 'lead_change', id: entry.idLeadChangeHistory }
	}
	return { occurredAt: entry.occurredAt, kind: 'stage_change', id: entry.idLeadStageHistory }
}

function activityCursorBefore(cursor: TimelineKey): LeadActivityCursor {
	// Ingress and assignment changes sort ahead of stages and activities
	// at the same instant, so those activities still belong on the next page.
	if (cursor.kind === 'lead_ingress' || cursor.kind === 'lead_change') {
		return { occurredAt: cursor.occurredAt, idLeadActivity: Number.MAX_SAFE_INTEGER }
	}
	// A stage cursor has already passed every activity at that time.
	return {
		occurredAt: cursor.occurredAt,
		idLeadActivity: cursor.kind === 'activity' ? cursor.id : 0,
	}
}

function stageWhereBefore(idLead: number, cursor?: TimelineKey): Prisma.LeadStageHistoryWhereInput {
	if (!cursor) return { idLead }
	if (cursor.kind === 'activity') return { idLead, changedAt: { lt: cursor.occurredAt } }
	if (cursor.kind === 'lead_ingress' || cursor.kind === 'lead_change') {
		return { idLead, changedAt: { lte: cursor.occurredAt } }
	}
	return {
		idLead,
		OR: [
			{ changedAt: { lt: cursor.occurredAt } },
			{ changedAt: cursor.occurredAt, idLeadStageHistory: { lt: cursor.id } },
		],
	}
}

function changeWhereBefore(idLead: number, cursor?: TimelineKey): Prisma.LeadChangeHistoryWhereInput {
	if (!cursor) return { idLead }
	if (cursor.kind === 'lead_ingress') return { idLead, changedAt: { lte: cursor.occurredAt } }
	if (cursor.kind === 'lead_change') {
		return {
			idLead,
			OR: [
				{ changedAt: { lt: cursor.occurredAt } },
				{ changedAt: cursor.occurredAt, idLeadChangeHistory: { lt: cursor.id } },
			],
		}
	}
	return { idLead, changedAt: { lt: cursor.occurredAt } }
}

function personWhere(idLead: number): Prisma.LeadLinkWhereInput {
	return { active: true, OR: [{ idLead }, { idRelatedLead: idLead }] }
}

function ingressWhereBefore(idLead: number, cursor?: TimelineKey): Prisma.LeadLinkWhereInput {
	const person = personWhere(idLead)
	if (!cursor || cursor.kind !== 'lead_ingress') {
		if (!cursor) return person
		return { AND: [person, { linkedAt: { lt: cursor.occurredAt } }] }
	}
	return {
		AND: [
			person,
			{
				OR: [
					{ linkedAt: { lt: cursor.occurredAt } },
					{ linkedAt: cursor.occurredAt, idLeadLink: { lt: cursor.id } },
				],
			},
		],
	}
}

/**
 * Lead timeline: CRM activity events merged with funnel stage changes
 * (Twenty timeline / Odoo chatter tracking). Stage changes stay in
 * `LeadStageHistory`. A move made in this CRM keeps the person who dragged
 * the card. Older sync rows without an actor fall back to the lead's advisor.
 */
export async function getLeadTimelinePage(
	idLead: number,
	options: { limit?: number; cursor?: TimelineKey } = {}
): Promise<LeadTimelinePage> {
	const limit = Math.min(Math.max(options.limit ?? 25, 1), 100)
	const { cursor } = options

	const [activityPage, stageRows, changeRows, ingressRows] = await Promise.all([
		getLeadActivityPage(prisma, idLead, { limit, cursor: cursor ? activityCursorBefore(cursor) : undefined }),
		prisma.leadStageHistory.findMany({
			where: stageWhereBefore(idLead, cursor),
			orderBy: [{ changedAt: 'desc' }, { idLeadStageHistory: 'desc' }],
			take: limit + 1,
			select: {
				idLeadStageHistory: true,
				changedAt: true,
				source: true,
				fromColumn: { select: { name: true } },
				toColumn: { select: { name: true } },
				user: { select: { name: true, lastName: true } },
				lead: { select: { user: { select: { name: true, lastName: true } } } },
			},
		}),
		prisma.leadChangeHistory.findMany({
			where: changeWhereBefore(idLead, cursor),
			orderBy: [{ changedAt: 'desc' }, { idLeadChangeHistory: 'desc' }],
			take: limit + 1,
			select: {
				idLeadChangeHistory: true,
				changedAt: true,
				kind: true,
				source: true,
				actorLabel: true,
				fromLabel: true,
				toLabel: true,
			},
		}),
		prisma.leadLink.findMany({
			where: ingressWhereBefore(idLead, cursor),
			orderBy: [{ linkedAt: 'desc' }, { idLeadLink: 'desc' }],
			take: limit + 1,
			select: {
				idLeadLink: true,
				idLead: true,
				idRelatedLead: true,
				source: true,
				linkedAt: true,
				clientOrigin: { select: { name: true } },
				linker: { select: { name: true, lastName: true } },
				lead: {
					select: {
						name: true,
						lastName: true,
						user: { select: { name: true, lastName: true } },
					},
				},
				relatedLead: {
					select: {
						name: true,
						lastName: true,
						user: { select: { name: true, lastName: true } },
					},
				},
			},
		}),
	])

	const activities: LeadTimelineEntry[] = activityPage.items.map((item) => ({ ...item, kind: 'activity' }))
	const stages: LeadTimelineEntry[] = stageRows.map((row) => {
		const actor = row.user ?? row.lead.user
		return {
			kind: 'stage_change',
			idLeadStageHistory: row.idLeadStageHistory,
			occurredAt: row.changedAt,
			actorName: actor ? [actor.name, actor.lastName].filter(Boolean).join(' ') : null,
			fromColumnName: row.fromColumn?.name ?? null,
			toColumnName: row.toColumn.name,
			source: row.source,
		}
	})

	const changes: LeadTimelineEntry[] = changeRows.map((row) => ({
		kind: 'lead_change',
		idLeadChangeHistory: row.idLeadChangeHistory,
		occurredAt: row.changedAt,
		change: row.kind,
		source: row.source,
		actorName: row.actorLabel,
		fromLabel: row.fromLabel,
		toLabel: row.toLabel,
	}))

	const ingress: LeadTimelineEntry[] = ingressRows.map((row) => {
		const advisor = row.linker ?? row.lead.user ?? row.relatedLead.user
		return {
			kind: 'lead_ingress',
			idLeadLink: row.idLeadLink,
			occurredAt: row.linkedAt,
			actorName: advisor ? [advisor.name, advisor.lastName].filter(Boolean).join(' ') : null,
			originName: row.clientOrigin?.name ?? 'Sin origen',
			incomingLeadName: leadDisplayName({ idLead: row.idLead, ...row.lead }),
			relatedLeadName: leadDisplayName({ idLead: row.idRelatedLead, ...row.relatedLead }),
			side: row.idLead === idLead ? 'incoming' : 'related',
			source: row.source,
		}
	})

	const keyed = (entries: LeadTimelineEntry[]) => entries.map((entry) => ({ ...toKey(entry), entry }))
	const merged = [...keyed(activities), ...keyed(stages), ...keyed(changes), ...keyed(ingress)].sort(
		(left, right) => compareTimelineKeys(left, right)
	)
	const hasMore =
		merged.length > limit ||
		activityPage.nextCursor !== null ||
		stageRows.length > limit ||
		changeRows.length > limit ||
		ingressRows.length > limit
	const items = merged.slice(0, limit)
	const last = items.at(-1)
	return {
		items: items.map((item) => item.entry),
		nextCursor: hasMore && last ? encodeTimelineCursor(last) : null,
	}
}
