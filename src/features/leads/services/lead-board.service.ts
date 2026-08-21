import { prisma } from '@/lib/prisma'
import { buildLeadListWhere } from '@/features/leads/lib/build-lead-list-where'
import type {
	LeadBoardColumn,
	LeadDetail,
	LeadOutcomeStatus,
	LeadViewer,
} from '@/features/leads/types/lead.types'

function buildOwnerName(user: { name: string; lastName: string | null } | null): string | null {
	if (!user) return null
	return [user.name, user.lastName].filter(Boolean).join(' ')
}

export interface LeadBoardOptions {
	visibleUserIds?: number[]
	outcomeStatuses?: LeadOutcomeStatus[]
	createdAtRange?: { gte: Date; lte: Date }
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
				user: { select: { name: true, lastName: true } },
			},
		}),
	])

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
			})),
	}))
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
	const where = buildLeadListWhere(viewer, {}, options)
	const lead = await prisma.lead.findFirst({
		where: { ...where, AND: [...(Array.isArray(where.AND) ? where.AND : []), { idLead }] },
		include: { user: { select: { name: true, lastName: true } } },
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
	}
}
