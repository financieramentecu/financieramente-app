import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildLeadListWhere } from '@/features/leads/lib/build-lead-list-where'
import { getInactivityDays, resolveInactivityThreshold } from '@/features/leads/lib/inactivity-days'
import type {
	LeadBoardColumn,
	LeadDetail,
	LeadOutcomeStatus,
	LeadViewer,
} from '@/features/leads/types/lead.types'

const activeTagsSelect = {
	where: { active: true, tag: { active: true } },
	select: { tag: { select: { idLeadTag: true, name: true, color: true } } },
	orderBy: { tag: { name: 'asc' } },
} satisfies Prisma.Lead$tagAssignmentsArgs

function buildOwnerName(user: { name: string; lastName: string | null } | null): string | null {
	if (!user) return null
	return [user.name, user.lastName].filter(Boolean).join(' ')
}

export interface LeadBoardOptions {
	visibleUserIds?: number[]
	outcomeStatuses?: LeadOutcomeStatus[]
	createdAtRange?: { gte: Date; lte: Date }
	/** Selected advisors. Empty keeps the full hierarchy. */
	ownerIds?: number[]
}

/**
 * Returns the Kanban board: every active `LeadFunnelColumn` (ordered by
 * `position`) with its hierarchy-scoped leads grouped server-side.
 */
export async function getLeadBoard(
	viewer: LeadViewer,
	options: LeadBoardOptions = {}
): Promise<LeadBoardColumn[]> {
	const [columns, leads] = await Promise.all([
		prisma.leadFunnelColumn.findMany({
			where: { active: true },
			orderBy: { position: 'asc' },
		}),
		prisma.lead.findMany({
			where: buildLeadListWhere(
				viewer,
				{
					outcomeStatuses: options.outcomeStatuses,
					createdAtRange: options.createdAtRange,
					ownerIds: options.ownerIds,
				},
				options
			),
			select: {
				idLead: true,
				name: true,
				lastName: true,
				email: true,
				phone: true,
				originTag: true,
				idUser: true,
				idLeadFunnelColumn: true,
				outcomeStatus: true,
				idBusiness: true,
				lastActivityAt: true,
				createdAt: true,
				estimatedValue: true,
				user: { select: { name: true, lastName: true } },
				tagAssignments: activeTagsSelect,
			},
		}),
	])
	const now = new Date()
	const threshold = resolveInactivityThreshold()

	return columns.map((column) => ({
		idLeadFunnelColumn: column.idLeadFunnelColumn,
		name: column.name,
		position: column.position,
		isFallback: column.isFallback,
		leads: leads
			.filter((lead) => lead.idLeadFunnelColumn === column.idLeadFunnelColumn)
			.map((lead) => ({
				idLead: lead.idLead,
				name: lead.name,
				lastName: lead.lastName,
				email: lead.email,
				phone: lead.phone,
				originTag: lead.originTag,
				idUser: lead.idUser,
				ownerName: buildOwnerName(lead.user ?? null),
				outcomeStatus: lead.outcomeStatus,
				idBusiness: lead.idBusiness,
				inactiveDays: getInactivityDays(lead, now, threshold),
				tags: lead.tagAssignments.map((assignment) => assignment.tag),
				estimatedValue: lead.estimatedValue?.toString() ?? null,
			})),
	}))
}

function whereForLead(
	idLead: number,
	viewer: LeadViewer,
	options: LeadBoardOptions
): Prisma.LeadWhereInput {
	const where = buildLeadListWhere(viewer, {}, options)
	return {
		...where,
		AND: [...(Array.isArray(where.AND) ? where.AND : []), { idLead }],
	}
}

/** True when the lead exists and the viewer is allowed to see it. Selects no extra columns. */
export async function isLeadVisible(
	idLead: number,
	viewer: LeadViewer,
	options: LeadBoardOptions = {}
): Promise<boolean> {
	const lead = await prisma.lead.findFirst({
		where: whereForLead(idLead, viewer, options),
		select: { idLead: true },
	})
	return lead !== null
}

/**
 * Returns a single lead's detail, scoped to the viewer's hierarchy.
 * Returns `null` when the lead does not exist or is outside the viewer's
 * visibility scope (caller maps this to a 404, never leaking existence).
 */
export async function getLeadDetail(
	idLead: number,
	viewer: LeadViewer,
	options: LeadBoardOptions = {}
): Promise<LeadDetail | null> {
	const lead = await prisma.lead.findFirst({
		where: whereForLead(idLead, viewer, options),
		include: { user: { select: { name: true, lastName: true } }, tagAssignments: activeTagsSelect },
	})

	if (!lead) return null

	return {
		idLead: lead.idLead,
		externalCrmId: lead.externalCrmId,
		name: lead.name,
		lastName: lead.lastName,
		email: lead.email,
		phone: lead.phone,
		identityNumber: lead.identityNumber,
		originTag: lead.originTag,
		externalUrl: lead.externalUrl,
		idUser: lead.idUser,
		ownerName: buildOwnerName(lead.user ?? null),
		outcomeStatus: lead.outcomeStatus,
		idLeadFunnelColumn: lead.idLeadFunnelColumn,
		idBusiness: lead.idBusiness,
		createdAt: lead.createdAt,
		updatedAt: lead.updatedAt,
		inactiveDays: getInactivityDays(lead, new Date(), resolveInactivityThreshold()),
		tags: lead.tagAssignments.map((assignment) => assignment.tag),
		estimatedValue: lead.estimatedValue?.toString() ?? null,
		probability: lead.probability,
	}
}
