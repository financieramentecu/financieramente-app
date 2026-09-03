import { describe, expect, it } from 'vitest'
import {
	sortRankingAgents,
	takeRanking,
} from '../lib/sort-ranking-agents'
import { ABA_MFUND_RANKING_TAKE } from '../types/aba-mfund.types'

function agent(
	idUser: number,
	agentName: string,
	totalValue: number
) {
	return { idUser, agentName, totalValue, businessCount: 1 }
}

describe('sortRankingAgents', () => {
	it('sorts totalValue DESC', () => {
		const sorted = sortRankingAgents([
			agent(1, 'Ana', 100),
			agent(2, 'Beto', 300),
			agent(3, 'Carla', 200),
		])
		expect(sorted.map((a) => a.idUser)).toEqual([2, 3, 1])
	})

	it('tie-breaks by agentName ASC then idUser ASC', () => {
		const sorted = sortRankingAgents([
			agent(20, 'Zoe', 100),
			agent(10, 'Ana', 100),
			agent(5, 'Ana', 100),
			agent(8, 'Beto', 100),
		])
		expect(sorted.map((a) => a.idUser)).toEqual([5, 10, 8, 20])
	})
})

describe('takeRanking', () => {
	it('takes 6 when more than 6 agents', () => {
		const agents = Array.from({ length: 8 }, (_, i) =>
			agent(i + 1, `Agent ${i + 1}`, 100 - i)
		)
		const taken = takeRanking(sortRankingAgents(agents), ABA_MFUND_RANKING_TAKE)
		expect(taken).toHaveLength(6)
		expect(taken.map((a) => a.idUser)).toEqual([1, 2, 3, 4, 5, 6])
	})

	it('returns all when fewer than 6', () => {
		const agents = [agent(1, 'Ana', 10), agent(2, 'Beto', 5)]
		expect(takeRanking(agents, ABA_MFUND_RANKING_TAKE)).toHaveLength(2)
	})

	it('returns empty for empty input', () => {
		expect(takeRanking([], ABA_MFUND_RANKING_TAKE)).toEqual([])
	})
})
