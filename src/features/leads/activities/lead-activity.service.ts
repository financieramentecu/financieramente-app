import type { Prisma, PrismaClient } from '@prisma/client'

export interface AppendLeadActivityInput {
	idLead: number
	idUser: number
	type:
		| 'NOTE_ADDED'
		| 'TASK_CREATED'
		| 'TASK_COMPLETED'
		| 'TASK_REASSIGNED'
		| 'CONVERTED'
		| 'BUSINESS_LINKED'
		| 'CASE_OPENED'
		| 'CASE_UPDATED'
	payload:
		| { note: string }
		| { taskId: number; title?: string; assignedTo?: number }
		| { businessId: number }
		| { caseId: number; subject?: string; status?: string; action?: 'COMMENTED' }
	idBusiness?: number | null
	occurredAt?: Date
	correlationId?: string
}

export interface LeadActivityCursor {
	occurredAt: Date
	idLeadActivity: number
}

export interface LeadActivityPageOptions {
	limit?: number
	cursor?: LeadActivityCursor
}

export interface LeadTimelineItem {
	idLeadActivity: number
	type:
		| 'NOTE_ADDED'
		| 'TASK_CREATED'
		| 'TASK_COMPLETED'
		| 'TASK_REASSIGNED'
		| 'CONVERTED'
		| 'BUSINESS_LINKED'
		| 'CASE_OPENED'
		| 'CASE_UPDATED'
	occurredAt: Date
	actorName: string
	payload:
		| { note: string }
		| { taskId: number; title?: string; assignedTo?: number }
		| { businessId: number }
		| { caseId: number; subject?: string; status?: string; action?: 'COMMENTED' }
}

export interface LeadActivityPage {
	items: LeadTimelineItem[]
	nextCursor: LeadActivityCursor | null
}

type ActivityWriter = Pick<Prisma.TransactionClient, 'leadActivity'>
type ActivityReader = Pick<PrismaClient, 'leadActivity'>

/**
 * The sole write boundary for CRM timeline records. Callers only supply a
 * service-owned event type and a validated payload; historical rows are never
 * updated or deleted.
 */
export async function appendLeadActivityTx(
	tx: ActivityWriter,
	input: AppendLeadActivityInput
) {
	return tx.leadActivity.create({
		data: {
			idLead: input.idLead,
			idBusiness: input.idBusiness ?? null,
			idUser: input.idUser,
			type: input.type,
			payload: input.payload,
			payloadVersion: 1,
			occurredAt: input.occurredAt ?? new Date(),
			correlationId: input.correlationId,
		},
	})
}

/**
 * Uses a compound timestamp/id cursor so new activities cannot make a page
 * duplicate or skip older events with the same timestamp.
 */
export async function getLeadActivityPage(
	client: ActivityReader,
	idLead: number,
	options: LeadActivityPageOptions = {}
): Promise<LeadActivityPage> {
	const limit = Math.min(Math.max(options.limit ?? 25, 1), 100)
	const cursorFilter = options.cursor
		? {
				AND: [
					{
						OR: [
							{ occurredAt: { lt: options.cursor.occurredAt } },
							{
								occurredAt: options.cursor.occurredAt,
								idLeadActivity: { lt: options.cursor.idLeadActivity },
							},
						],
					},
				],
			}
		: {}

	const rows = await client.leadActivity.findMany({
		where: { idLead, ...cursorFilter },
		orderBy: [{ occurredAt: 'desc' }, { idLeadActivity: 'desc' }],
		take: limit + 1,
		select: {
			idLeadActivity: true,
			type: true,
			occurredAt: true,
			payload: true,
			actor: { select: { name: true, lastName: true } },
		},
	})

	const hasNextPage = rows.length > limit
	const visibleRows = hasNextPage ? rows.slice(0, limit) : rows
	const finalRow = visibleRows.at(-1)

	return {
		items: visibleRows.map((row) => ({
			idLeadActivity: row.idLeadActivity,
			type: row.type,
			occurredAt: row.occurredAt,
			actorName: [row.actor.name, row.actor.lastName].filter(Boolean).join(' '),
			payload: row.payload as LeadTimelineItem['payload'],
		})),
		nextCursor:
			hasNextPage && finalRow
				? {
						occurredAt: finalRow.occurredAt,
						idLeadActivity: finalRow.idLeadActivity,
					}
				: null,
	}
}
