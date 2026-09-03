import { ABA_MFUND_RANKING_TAKE } from '../types/aba-mfund.types'

export interface RankingAgentSortKey {
	readonly idUser: number
	readonly agentName: string
	readonly totalValue: number
}

/**
 * Sorts ranking agents: totalValue DESC, then agentName ASC, then idUser ASC.
 */
export function sortRankingAgents<T extends RankingAgentSortKey>(
	agents: readonly T[]
): T[] {
	return [...agents].sort((a, b) => {
		if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue
		const nameCmp = a.agentName.localeCompare(b.agentName, 'es')
		if (nameCmp !== 0) return nameCmp
		return a.idUser - b.idUser
	})
}

/**
 * Takes the first `take` agents (default Top 6).
 */
export function takeRanking<T>(
	agents: readonly T[],
	take: number = ABA_MFUND_RANKING_TAKE
): T[] {
	return agents.slice(0, take)
}
