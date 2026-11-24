import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildLeadListWhere } from '@/features/leads/lib/build-lead-list-where'
import { parseStoredFormFields } from '@/features/leads/lib/parse-stored-form-fields'
import {
	resolveLeadPipelineScope,
	type LeadPipelineOptions,
} from '@/features/leads/services/lead-pipeline-scope.service'
import { getLeadAssociationGraph } from '@/features/leads/services/lead-associations.service'
import { countLeadAssociationGroups } from '@/features/leads/lib/lead-association-groups'
import {
	getInactivityDays,
	resolveInactivityThreshold,
} from '@/features/leads/lib/inactivity-days'
import { leadDisplayName } from '@/features/leads/lib/lead-display-name'
import { LEAD_LINK_SIDES } from '@/features/leads/types/lead-link.types'
import type {
	LeadBoardColumn,
	LeadDetail,
	LeadViewer,
} from '@/features/leads/types/lead.types'

const activeTagsSelect = {
	where: { active: true, tag: { active: true } },
	select: { tag: { select: { idLeadTag: true, name: true, color: true } } },
	orderBy: { tag: { name: 'asc' } },
} satisfies Prisma.Lead$tagAssignmentsArgs

function buildOwnerName(
	user: { name: string; lastName: string | null } | null
): string | null {
	if (!user) return null
	return [user.name, user.lastName].filter(Boolean).join(' ')
}

export type LeadBoardOptions = LeadPipelineOptions

/**
 * Returns the Kanban board: every active `LeadFunnelColumn` (ordered by
 * `position`) with its hierarchy-scoped leads grouped server-side.
 */
export async function getLeadBoard(
	viewer: LeadViewer,
	options: LeadBoardOptions = {}
): Promise<LeadBoardColumn[]> {
	const { graphWhere, filteredWhere } = await resolveLeadPipelineScope(
		viewer,
		options
	)
	let where = filteredWhere
	if (options.associatedOnly) {
		const graph = await getLeadAssociationGraph(graphWhere)
		const { associatedLeadIds } = countLeadAssociationGroups(
			graph.leadIds,
			graph.links
		)
		where = { AND: [filteredWhere, { idLead: { in: associatedLeadIds } }] }
	}
	const [columns, leads] = await Promise.all([
		prisma.leadFunnelColumn.findMany({
			where: { active: true },
			orderBy: { position: 'asc' },
		}),
		prisma.lead.findMany({
			where,
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
		include: {
			tagAssignments: activeTagsSelect,
			user: { select: { name: true, lastName: true } },
			formSubmissions: {
				orderBy: { submittedAt: 'desc' },
				select: {
					submissionId: true,
					landingKey: true,
					landingName: true,
					formVersion: true,
					submittedAt: true,
					fields: true,
				},
			},
			ingressLinks: {
				where: { active: true },
				orderBy: { linkedAt: 'desc' },
				select: {
					idLeadLink: true,
					source: true,
					linkedAt: true,
					clientOrigin: { select: { name: true } },
					relatedLead: { select: { idLead: true, name: true, lastName: true } },
				},
			},
			relatedLinks: {
				where: { active: true },
				orderBy: { linkedAt: 'desc' },
				select: {
					idLeadLink: true,
					source: true,
					linkedAt: true,
					clientOrigin: { select: { name: true } },
					lead: { select: { idLead: true, name: true, lastName: true } },
				},
			},
		},
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
		formSubmissions: lead.formSubmissions.map((submission) => ({
			submissionId: submission.submissionId,
			landingKey: submission.landingKey,
			landingName: submission.landingName,
			formVersion: submission.formVersion,
			submittedAt: submission.submittedAt.toISOString(),
			fields: parseStoredFormFields(submission.fields),
		})),
		inactiveDays: getInactivityDays(
			lead,
			new Date(),
			resolveInactivityThreshold()
		),
		tags: lead.tagAssignments.map((assignment) => assignment.tag),
		estimatedValue: lead.estimatedValue?.toString() ?? null,
		probability: lead.probability,
		relations: [
			...(lead.ingressLinks ?? []).map((row) => ({
				idLeadLink: row.idLeadLink,
				otherLeadId: row.relatedLead.idLead,
				otherName: leadDisplayName(row.relatedLead),
				originName: row.clientOrigin?.name ?? 'Sin origen',
				side: LEAD_LINK_SIDES.INCOMING,
				source: row.source,
				linkedAt: row.linkedAt.toISOString(),
			})),
			...(lead.relatedLinks ?? []).map((row) => ({
				idLeadLink: row.idLeadLink,
				otherLeadId: row.lead.idLead,
				otherName: leadDisplayName(row.lead),
				originName: row.clientOrigin?.name ?? 'Sin origen',
				side: LEAD_LINK_SIDES.RELATED,
				source: row.source,
				linkedAt: row.linkedAt.toISOString(),
			})),
		],
	}
}
