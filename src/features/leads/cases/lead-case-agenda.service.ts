import type { LeadSupportCasePriority, LeadSupportCaseStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { DONE_LOOKBACK_DAYS, UPCOMING_DAYS, getBogotaDayBounds } from '@/features/leads/tasks/agenda-bucket-range'

const DAY_MS = 24 * 60 * 60 * 1000
const BOARD_LIMIT = 500
const OPEN_STATUSES: LeadSupportCaseStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING']

export interface ActivityBoardCase {
	idLeadSupportCase: number
	idLead: number
	leadName: string
	subject: string
	status: LeadSupportCaseStatus
	priority: LeadSupportCasePriority
	dueAt: Date | null
	resolvedAt: Date | null
	createdAt: Date
	assigneeName: string
	commentCount: number
}

function personName(user: { name: string; lastName: string | null } | null): string {
	if (!user) return 'Sin asignar'
	return [user.name, user.lastName].filter(Boolean).join(' ') || 'Sin asignar'
}

/** Support cases in the same four time windows as tasks. `null` assignees means every case. */
export async function getActivityCases(assigneeIds: number[] | null, now: Date = new Date()): Promise<ActivityBoardCase[]> {
	const { end } = getBogotaDayBounds(now)
	const rows = await prisma.leadSupportCase.findMany({
		where: {
			lead: { active: true },
			...(assigneeIds ? { assignedTo: { in: assigneeIds } } : {}),
			OR: [
				{
					status: { in: OPEN_STATUSES },
					OR: [{ dueAt: null }, { dueAt: { lt: new Date(end.getTime() + UPCOMING_DAYS * DAY_MS) } }],
				},
				{
					status: { in: ['RESOLVED', 'CLOSED'] },
					resolvedAt: { gte: new Date(now.getTime() - DONE_LOOKBACK_DAYS * DAY_MS) },
				},
			],
		},
		orderBy: [{ dueAt: 'asc' }, { idLeadSupportCase: 'asc' }],
		take: BOARD_LIMIT,
		select: {
			idLeadSupportCase: true,
			idLead: true,
			subject: true,
			status: true,
			priority: true,
			dueAt: true,
			resolvedAt: true,
			createdAt: true,
			assignee: { select: { name: true, lastName: true } },
			lead: { select: { name: true, lastName: true } },
			_count: { select: { comments: true } },
		},
	})
	return rows.map((row) => ({
		idLeadSupportCase: row.idLeadSupportCase,
		idLead: row.idLead,
		leadName: [row.lead.name, row.lead.lastName].filter(Boolean).join(' ') || 'Sin nombre',
		subject: row.subject,
		status: row.status,
		priority: row.priority,
		dueAt: row.dueAt,
		resolvedAt: row.resolvedAt,
		createdAt: row.createdAt,
		assigneeName: personName(row.assignee),
		commentCount: row._count.comments,
	}))
}
