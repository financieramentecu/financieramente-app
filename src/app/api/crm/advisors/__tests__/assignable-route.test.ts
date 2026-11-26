import { expect, it, vi } from 'vitest'
import { GET } from '../route'
import {
	requireCrmActor,
	actorLeadsMoneyStrategies,
} from '@/lib/auth/require-crm-actor'
import { listHierarchyAdvisors } from '@/features/leads/services/hierarchy-advisors.service'
vi.mock('@/lib/auth/require-crm-actor', () => ({
	requireCrmActor: vi.fn(),
	actorLeadsMoneyStrategies: vi.fn(),
	crmErrorResponse: vi.fn(),
}))
vi.mock('@/features/leads/services/hierarchy-advisors.service', () => ({
	listHierarchyAdvisors: vi.fn(),
}))
it('uses write scope for assignment while preserving read scope for filters', async () => {
	vi.mocked(requireCrmActor).mockResolvedValue({
		ok: true,
		actor: { visibleUserIds: [], manageableUserIds: [1, 2] },
	} as never)
	vi.mocked(listHierarchyAdvisors).mockResolvedValue([])
	vi.mocked(actorLeadsMoneyStrategies).mockResolvedValue(true)
	await GET(new Request('http://localhost/api/crm/advisors?assignable=true'))
	expect(requireCrmActor).toHaveBeenLastCalledWith('leads_module', {
		manage: true,
	})
	expect(listHierarchyAdvisors).toHaveBeenLastCalledWith([1, 2])
	await GET(new Request('http://localhost/api/crm/advisors'))
	expect(listHierarchyAdvisors).toHaveBeenLastCalledWith([])
})
