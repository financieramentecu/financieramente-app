/**
 * Ranking service — Top 6 agents by volume (Business.idUser owner grain).
 * Embeds up to 500 businesses per agent as CellBusinessRowView.
 */

import { prisma } from '@/lib/prisma'
import { buildAbaMfundWhere } from '../lib/build-aba-mfund-where'
import { coerceDecimal } from '../lib/coerce-decimal'
import { formatAgentName } from '../lib/format-client-name'
import {
	sortRankingAgents,
	takeRanking,
} from '../lib/sort-ranking-agents'
import { mapRankingBusinessToCellRow } from '../mappers/aba-mfund-ranking.mapper'
import {
	ABA_MFUND_RANKING_EMBED_CAP,
	ABA_MFUND_RANKING_TAKE,
	type AbaMfundRanking,
	type AbaMfundRankingAgent,
	type AbaMfundRankingQuery,
} from '../types/aba-mfund.types'

const RANKING_BUSINESS_INCLUDE = {
	currency: { select: { name: true } },
	productPercentageCommission: {
		select: {
			productConfiguration: {
				select: {
					product: {
						select: {
							name: true,
							company: { select: { name: true } },
						},
					},
				},
			},
		},
	},
} as const

const EMPTY_RANKING: AbaMfundRanking = { agents: [] }

/**
 * Top 6 ABA por Agente. Agent = Business.idUser (owner), never commission beneficiary.
 * Empty `userIds` → empty ranking, no Prisma.
 */
export async function getAbaMfundRanking(
	query: AbaMfundRankingQuery
): Promise<AbaMfundRanking> {
	const { filters } = query

	if (filters.userIds.length === 0) {
		return EMPTY_RANKING
	}

	const baseWhere = buildAbaMfundWhere(filters)

	const groups = await prisma.business.groupBy({
		by: ['idUser'],
		where: baseWhere,
		_sum: { value: true },
		_count: { idBusiness: true },
	})

	if (groups.length === 0) {
		return EMPTY_RANKING
	}

	const ownerIds = groups.map((group) => group.idUser)
	const users = await prisma.user.findMany({
		where: { idUser: { in: ownerIds } },
		select: { idUser: true, name: true, lastName: true },
	})
	const userById = new Map(users.map((user) => [user.idUser, user]))

	const unsorted = groups.map((group) => {
		const user = userById.get(group.idUser)
		return {
			idUser: group.idUser,
			agentName: user
				? formatAgentName(user.name, user.lastName)
				: '',
			totalValue: coerceDecimal(group._sum.value),
			businessCount: group._count.idBusiness,
		}
	})

	const top = takeRanking(
		sortRankingAgents(unsorted),
		ABA_MFUND_RANKING_TAKE
	)

	const embeddedLists = await Promise.all(
		top.map((agent) =>
			prisma.business.findMany({
				where: buildAbaMfundWhere({
					...filters,
					userIds: [agent.idUser],
				}),
				include: RANKING_BUSINESS_INCLUDE,
				orderBy: [{ createdAt: 'desc' }, { idBusiness: 'desc' }],
				take: ABA_MFUND_RANKING_EMBED_CAP,
			})
		)
	)

	const agents: AbaMfundRankingAgent[] = top.map((agent, index) => ({
		idUser: agent.idUser,
		agentName: agent.agentName,
		totalValue: agent.totalValue,
		businessCount: agent.businessCount,
		businesses: embeddedLists[index].map(mapRankingBusinessToCellRow),
	}))

	return { agents }
}
