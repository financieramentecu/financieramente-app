import type { LeadTaskStatus, LeadTaskType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAgendaBucketWhere, type AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'

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
