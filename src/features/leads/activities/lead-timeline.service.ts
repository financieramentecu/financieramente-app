import type { LeadStageChangeSource, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
	getLeadActivityPage,
	type LeadActivityCursor,
	type LeadTimelineItem,
} from '@/features/leads/activities/lead-activity.service'
import {
	encodeTimelineCursor,
	mergeTimelineEntries,
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

export type LeadTimelineEntry = LeadTimelineActivityEntry | LeadTimelineStageEntry

export interface LeadTimelinePage {
	items: LeadTimelineEntry[]
	nextCursor: string | null
}

function toKey(entry: LeadTimelineEntry): TimelineKey {
	return entry.kind === 'activity'
		? { occurredAt: entry.occurredAt, kind: 'activity', id: entry.idLeadActivity }
		: { occurredAt: entry.occurredAt, kind: 'stage_change', id: entry.idLeadStageHistory }
}

function activityCursorAfter(cursor: TimelineKey): LeadActivityCursor {
	// Activities sort before stage changes at the same instant, so a stage
	// cursor has already passed every activity at that time.
	return {
		occurredAt: cursor.occurredAt,
		idLeadActivity: cursor.kind === 'activity' ? cursor.id : Number.MAX_SAFE_INTEGER,
	}
}

function stageWhereAfter(idLead: number, cursor?: TimelineKey): Prisma.LeadStageHistoryWhereInput {
	if (!cursor) return { idLead }
	if (cursor.kind === 'activity') return { idLead, changedAt: { gte: cursor.occurredAt } }
	return {
		idLead,
		OR: [
			{ changedAt: { gt: cursor.occurredAt } },
			{ changedAt: cursor.occurredAt, idLeadStageHistory: { gt: cursor.id } },
		],
	}
}

/**
 * Lead timeline: CRM activity events merged with funnel stage changes
 * (Twenty timeline / Odoo chatter tracking). Stage changes stay in
 * `LeadStageHistory` because webhook changes have no acting user.
 */
export async function getLeadTimelinePage(
	idLead: number,
	options: { limit?: number; cursor?: TimelineKey } = {}
): Promise<LeadTimelinePage> {
	const limit = Math.min(Math.max(options.limit ?? 25, 1), 100)
	const { cursor } = options

	const [activityPage, stageRows] = await Promise.all([
		getLeadActivityPage(prisma, idLead, { limit, cursor: cursor ? activityCursorAfter(cursor) : undefined }),
		prisma.leadStageHistory.findMany({
			where: stageWhereAfter(idLead, cursor),
			orderBy: [{ changedAt: 'asc' }, { idLeadStageHistory: 'asc' }],
			take: limit + 1,
			select: {
				idLeadStageHistory: true,
				changedAt: true,
				source: true,
				fromColumn: { select: { name: true } },
				toColumn: { select: { name: true } },
				user: { select: { name: true, lastName: true } },
			},
		}),
	])

	const activities: LeadTimelineEntry[] = activityPage.items.map((item) => ({ ...item, kind: 'activity' }))
	const stages: LeadTimelineEntry[] = stageRows.map((row) => ({
		kind: 'stage_change',
		idLeadStageHistory: row.idLeadStageHistory,
		occurredAt: row.changedAt,
		actorName: row.user ? [row.user.name, row.user.lastName].filter(Boolean).join(' ') : null,
		fromColumnName: row.fromColumn?.name ?? null,
		toColumnName: row.toColumn.name,
		source: row.source,
	}))

	const keyed = (entries: LeadTimelineEntry[]) => entries.map((entry) => ({ ...toKey(entry), entry }))
	const { items, hasMore } = mergeTimelineEntries(keyed(activities), keyed(stages), limit, {
		sourceHasMore: activityPage.nextCursor !== null || stageRows.length > limit,
	})
	const last = items.at(-1)
	return {
		items: items.map((item) => item.entry),
		nextCursor: hasMore && last ? encodeTimelineCursor(last) : null,
	}
}
