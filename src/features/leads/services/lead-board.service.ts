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
	const graph = await getLeadAssociationGraph(graphWhere)
	const { groups } = countLeadAssociationGroups(graph.leadIds, graph.links)
	let where = filteredWhere
	if (options.associatedOnly) {
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
				capture: {
					select: {
						idLeadCapture: true,
						name: true,
						level: true,
						status: true,
					},
				},
				referrerName: true,
				leadClientOrigins: {
					orderBy: { firstSeenAt: 'asc' },
					take: 1,
					select: {
						firstSeenAt: true,
						clientOrigin: { select: { name: true } },
					},
				},
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
	const selectedIds = new Set(leads.map((lead) => lead.idLead))
	const contextIds = groups
		.filter((group) => group.some((id) => selectedIds.has(id)))
		.flatMap((group) => group.filter((id) => !selectedIds.has(id)))
	// One scoped batch supplies initial attribution without widening selectable opportunities.
	const context = contextIds.length
		? await prisma.lead.findMany({
				where: { AND: [graphWhere, { idLead: { in: contextIds } }] },
				select: {
					idLead: true,
					createdAt: true,
					referrerName: true,
					leadClientOrigins: {
						orderBy: [{ firstSeenAt: 'asc' }, { idLeadClientOrigin: 'asc' }],
						take: 1,
						select: {
							firstSeenAt: true,
							clientOrigin: { select: { name: true } },
						},
					},
				},
			})
		: []
	const attributionLeads = [...leads, ...context]

	const selectedLeads = groups.flatMap((group) => {
		const members = leads.filter((lead) => group.includes(lead.idLead))
		if (members.length === 0) return []
		members.sort(
			(a, b) =>
				(b.capture?.level ?? -1) - (a.capture?.level ?? -1) ||
				b.createdAt.getTime() - a.createdAt.getTime() ||
				b.idLead - a.idLead
		)
		const attributionMembers = attributionLeads.filter((member) =>
			group.includes(member.idLead)
		)
		const first = [...attributionMembers].sort(
			(a, b) =>
				a.createdAt.getTime() - b.createdAt.getTime() || a.idLead - b.idLead
		)[0]
		const firstOrigin = attributionMembers
			.flatMap((member) => member.leadClientOrigins ?? [])
			.sort((a, b) => a.firstSeenAt.getTime() - b.firstSeenAt.getTime())[0]
		return [
			{
				...members[0],
				firstOriginTag: firstOrigin?.clientOrigin.name ?? null,
				firstReferrerName: first?.referrerName ?? null,
				personKey: Math.min(...group),
				captures: members.map((member) => ({
					idLead: member.idLead,
					capture: member.capture ?? null,
					referrerName: member.referrerName ?? null,
					originTag: member.originTag,
					idLeadFunnelColumn: member.idLeadFunnelColumn,
					outcomeStatus: member.outcomeStatus,
					createdAt: member.createdAt.toISOString(),
				})),
			},
		]
	})
	const now = new Date()
	const threshold = resolveInactivityThreshold()

	return columns.map((column) => ({
		idLeadFunnelColumn: column.idLeadFunnelColumn,
		name: column.name,
		position: column.position,
		isFallback: column.isFallback,
		leads: selectedLeads
			.filter((lead) => lead.idLeadFunnelColumn === column.idLeadFunnelColumn)
			.map((lead) => ({
				idLead: lead.idLead,
				capture: lead.capture ?? null,
				referrerName: lead.referrerName ?? null,
				personKey: lead.personKey,
				firstOriginTag: lead.firstOriginTag,
				firstReferrerName: lead.firstReferrerName,
				captures: lead.captures,
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

function whereForLeadScope(
	viewer: LeadViewer,
	options: LeadBoardOptions
): Prisma.LeadWhereInput {
	return buildLeadListWhere(viewer, {}, options)
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
			capture: {
				select: { idLeadCapture: true, name: true, level: true, status: true },
			},
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
				where: {
					active: true,
					relatedLead: whereForLeadScope(viewer, options),
				},
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
				where: { active: true, lead: whereForLeadScope(viewer, options) },
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
	const graph = await getLeadAssociationGraph(
		whereForLeadScope(viewer, options)
	)
	const group = countLeadAssociationGroups(
		graph.leadIds,
		graph.links
	).groups.find((ids) => ids.includes(idLead)) ?? [idLead]
	const records = await prisma.lead.findMany({
		where: {
			AND: [whereForLeadScope(viewer, options), { idLead: { in: group } }],
		},
		select: {
			idLead: true,
			leadClientOrigins: {
				orderBy: { firstSeenAt: 'asc' },
				take: 1,
				select: { firstSeenAt: true, clientOrigin: { select: { name: true } } },
			},
			capture: {
				select: { idLeadCapture: true, name: true, level: true, status: true },
			},
			referrerName: true,
			originTag: true,
			idLeadFunnelColumn: true,
			outcomeStatus: true,
			createdAt: true,
		},
		orderBy: [{ createdAt: 'desc' }, { idLead: 'desc' }],
	})
	const first = [...records].sort(
		(a, b) =>
			a.createdAt.getTime() - b.createdAt.getTime() || a.idLead - b.idLead
	)[0]
	const firstOrigin = records
		.flatMap((row) => row.leadClientOrigins ?? [])
		.sort((a, b) => a.firstSeenAt.getTime() - b.firstSeenAt.getTime())[0]
	return {
		firstOriginTag: firstOrigin?.clientOrigin.name ?? null,
		firstReferrerName: first?.referrerName ?? null,
		idLead: lead.idLead,
		externalCrmId: lead.externalCrmId,
		capture: lead.capture ?? null,
		referrerName: lead.referrerName ?? null,
		personKey: Math.min(...group),
		captures: records.map((row) => ({
			...row,
			createdAt: row.createdAt.toISOString(),
		})),
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
