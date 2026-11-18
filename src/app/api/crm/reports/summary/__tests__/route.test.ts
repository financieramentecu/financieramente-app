import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'
import { crmErrorResponse, requireCrmActor } from '@/lib/auth/require-crm-actor'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { getCrmSummary } from '@/features/leads/analytics/crm-summary.service'
import { EMPTY_CRM_SUMMARY } from '@/features/leads/analytics/crm-summary.types'

vi.mock('@/lib/auth/require-crm-actor', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/auth/require-crm-actor')>()),
	requireCrmActor: vi.fn(),
}))
vi.mock(
	'@/features/report-permissions/services/report-permissions.service',
	() => ({ canViewReport: vi.fn() })
)
vi.mock('@/features/leads/analytics/crm-summary.service', () => ({
	getCrmSummary: vi.fn(),
}))

const actor = {
	idUser: 7,
	email: 'a@x.co',
	roleCode: 'AGENTE',
	visibleUserIds: [7, 8],
	canManage: true,
	idCategory: 3,
	manageableUserIds: [7, 8],
	canViewOthersCrm: false,
}

describe('GET /api/crm/reports/summary', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: true, actor })
		vi.mocked(canViewReport).mockResolvedValue(true)
		vi.mocked(getCrmSummary).mockResolvedValue(EMPTY_CRM_SUMMARY)
	})

	it('passes through guard failures without querying metrics', async () => {
		vi.mocked(requireCrmActor).mockResolvedValue({
			ok: false,
			response: crmErrorResponse('No autorizado', 401),
		})
		expect((await GET()).status).toBe(401)
		expect(requireCrmActor).toHaveBeenCalledWith('crm_reports')
		expect(getCrmSummary).not.toHaveBeenCalled()
	})

	it('rejects a CRM actor without the category report permission', async () => {
		vi.mocked(canViewReport).mockResolvedValue(false)
		const response = await GET()
		expect(response.status).toBe(403)
		expect(canViewReport).toHaveBeenCalledWith(
			{ roleCode: 'AGENTE', idCategory: 3 },
			'CRM_PIPELINE'
		)
		expect(getCrmSummary).not.toHaveBeenCalled()
	})

	it('returns metrics restricted to the authorized actor hierarchy', async () => {
		const response = await GET()
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ data: EMPTY_CRM_SUMMARY })
		expect(getCrmSummary).toHaveBeenCalledWith({
			viewer: { idUser: 7, role: { code: 'AGENTE' } },
			visibleUserIds: [7, 8],
			isBypass: false,
		})
	})
})
