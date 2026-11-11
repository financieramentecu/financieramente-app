import type { LeadActivityType, Prisma, PrismaClient } from '@prisma/client'
import type { LeadActivityAttachment } from '@/features/leads/activities/lead-activity-attachment'
import type { LoggedContactPayload } from '@/features/leads/crm/lead-crm-event.schema'

export type { LeadActivityAttachment } from '@/features/leads/activities/lead-activity-attachment'

export type LeadActivityKind = LeadActivityType

export type LeadActivityPayload =
	| { note: string; attachments?: LeadActivityAttachment[] }
	| (LoggedContactPayload & { attachments?: LeadActivityAttachment[] })
	| {
			taskId: number
			title?: string
			assignedTo?: number
			comment?: string
			attachments?: LeadActivityAttachment[]
	  }
	| { businessId: number }
	| {
			caseId: number
			subject?: string
			status?: string
			action?: 'COMMENTED'
			comment?: string
			attachments?: LeadActivityAttachment[]
	  }

export interface AppendLeadActivityInput {
	idLead: number
	idUser: number
	type: LeadActivityKind
	payload: LeadActivityPayload
	idBusiness?: number | null
	occurredAt?: Date
	correlationId?: string
}

/**
 * Events that mean someone actually worked the lead; they move
 * `lead.lastActivityAt` (inactivity indicator). Bookkeeping events do not.
 */
export const ACTIVITY_TYPES_COUNTING_AS_CONTACT: ReadonlySet<LeadActivityKind> = new Set<LeadActivityKind>([
	'NOTE_ADDED',
	'CALL_LOGGED',
	'MEETING_LOGGED',
	'EMAIL_LOGGED',
	'WHATSAPP_LOGGED',
	'TASK_COMPLETED',
	'CONVERTED',
])

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
	type: LeadActivityKind
	occurredAt: Date
	actorName: string
	payload: LeadActivityPayload
}

export interface LeadActivityPage {
	items: LeadTimelineItem[]
	nextCursor: LeadActivityCursor | null
}

export type ActivityWriter = Pick<Prisma.TransactionClient, 'leadActivity' | 'lead'>
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
	const occurredAt = input.occurredAt ?? new Date()
	const activity = await tx.leadActivity.create({
		data: {
			idLead: input.idLead,
			idBusiness: input.idBusiness ?? null,
			idUser: input.idUser,
			type: input.type,
			payload: input.payload as Prisma.InputJsonValue,
			payloadVersion: 1,
			occurredAt,
			correlationId: input.correlationId,
		},
	})
	if (ACTIVITY_TYPES_COUNTING_AS_CONTACT.has(input.type)) {
		await tx.lead.updateMany({
			where: { idLead: input.idLead, OR: [{ lastActivityAt: null }, { lastActivityAt: { lt: occurredAt } }] },
			data: { lastActivityAt: occurredAt },
		})
	}
	return activity
}

/**
 * Uses a compound timestamp/id cursor so the next page continues with events
 * older than the last one shown. The visible order is newest first.
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
