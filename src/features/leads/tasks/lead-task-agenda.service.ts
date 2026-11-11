import type { LeadTaskStatus, LeadTaskType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { DONE_LOOKBACK_DAYS, getAgendaBucketWhere, getBogotaDayBounds, UPCOMING_DAYS, type AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'

export interface AgendaTaskItem {
	idLeadTask: number
	idLead: number
	leadName: string
	title: string
	type: LeadTaskType
	dueAt: Date | null
	status: LeadTaskStatus
	completedAt: Date | null
}

const AGENDA_LIMIT = 200
const BOARD_LIMIT = 500
const DAY_MS = 24 * 60 * 60 * 1000

export interface ActivityBoardTask {
	idLeadTask: number
	idLead: number
	leadName: string
	title: string
	type: LeadTaskType
	dueAt: Date | null
	status: LeadTaskStatus
	completedAt: Date | null
	assigneeName: string
}

/**
 * Tasks that belong in the four agenda columns, for the viewer's hierarchy.
 * `null` assignees means every task (hierarchy bypass, no advisor filter).
 */
export async function getActivityBoard(assigneeIds: number[] | null, now: Date = new Date()): Promise<ActivityBoardTask[]> {
	const { end } = getBogotaDayBounds(now)
	const rows = await prisma.leadTask.findMany({
		where: {
			lead: { active: true },
			...(assigneeIds ? { assignedTo: { in: assigneeIds } } : {}),
			OR: [
				{ status: 'OPEN', OR: [{ dueAt: null }, { dueAt: { lt: new Date(end.getTime() + UPCOMING_DAYS * DAY_MS) } }] },
				{ status: 'DONE', completedAt: { gte: new Date(now.getTime() - DONE_LOOKBACK_DAYS * DAY_MS) } },
			],
		},
		orderBy: [{ dueAt: 'asc' }, { idLeadTask: 'asc' }],
		take: BOARD_LIMIT,
		select: {
			idLeadTask: true,
			idLead: true,
			title: true,
			type: true,
			dueAt: true,
			status: true,
			completedAt: true,
			assignee: { select: { name: true, lastName: true } },
			lead: { select: { name: true, lastName: true } },
		},
	})
	return rows.map((row) => ({
		idLeadTask: row.idLeadTask,
		idLead: row.idLead,
		leadName: [row.lead.name, row.lead.lastName].filter(Boolean).join(' ') || 'Sin nombre',
		title: row.title,
		type: row.type,
		dueAt: row.dueAt,
		status: row.status,
		completedAt: row.completedAt,
		assigneeName: [row.assignee.name, row.assignee.lastName].filter(Boolean).join(' ') || 'Sin nombre',
	}))
}

/** The viewer's own tasks for one agenda bucket, on active leads only. */
export async function getTaskAgenda(viewerId: number, bucket: AgendaBucket, now: Date = new Date()): Promise<AgendaTaskItem[]> {
	const rows = await prisma.leadTask.findMany({
		where: { assignedTo: viewerId, lead: { active: true }, ...getAgendaBucketWhere(bucket, now) },
		orderBy: bucket === 'done' ? [{ completedAt: 'desc' }] : [{ dueAt: 'asc' }, { idLeadTask: 'asc' }],
		take: AGENDA_LIMIT,
		select: {
			idLeadTask: true,
			idLead: true,
			title: true,
			type: true,
			dueAt: true,
			status: true,
			completedAt: true,
			lead: { select: { name: true, lastName: true } },
		},
	})
	return rows.map(({ lead, ...task }) => ({
		...task,
		leadName: [lead.name, lead.lastName].filter(Boolean).join(' ') || 'Sin nombre',
	}))
}
