import { describe, it, expect } from 'vitest'
import { mapLeadOwnerToAgentInfo } from '@/features/leads/mappers/lead-owner-to-agent-info'

describe('mapLeadOwnerToAgentInfo', () => {
	it('maps a User (with role and category) to AgentInfo', () => {
		const result = mapLeadOwnerToAgentInfo({
			idUser: 5,
			name: 'Ana',
			lastName: 'Torres',
			email: 'ana@example.com',
			phone: '3001234567',
			role: { name: 'Agente/Coach' },
			category: { name: 'Junior' },
		})

		expect(result).toEqual({
			id: 5,
			fullName: 'Ana Torres',
			roleName: 'Agente/Coach',
			categoryName: 'Junior',
			email: 'ana@example.com',
			phone: '3001234567',
		})
	})

	it('maps null role/category/phone/lastName to null, not undefined', () => {
		const result = mapLeadOwnerToAgentInfo({
			idUser: 6,
			name: 'Beto',
			lastName: null,
			email: 'beto@example.com',
			phone: null,
			role: null,
			category: null,
		})

		expect(result).toEqual({
			id: 6,
			fullName: 'Beto',
			roleName: null,
			categoryName: null,
			email: 'beto@example.com',
			phone: null,
		})
	})
})
