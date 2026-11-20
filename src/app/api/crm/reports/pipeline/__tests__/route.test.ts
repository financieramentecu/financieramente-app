import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'
import { crmErrorResponse, requireCrmActor } from '@/lib/auth/require-crm-actor'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { getCrmPipelineReport } from '@/features/leads/reports/crm-pipeline-report.service'

vi.mock('@/lib/auth/require-crm-actor', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/auth/require-crm-actor')>()),
	requireCrmActor: vi.fn(),
}))
vi.mock('@/features/report-permissions/services/report-permissions.service', () => ({ canViewReport: vi.fn() }))
vi.mock('@/features/leads/reports/crm-pipeline-report.service', () => ({
	getCrmPipelineReport: vi.fn(),
	CRM_REPORT_LEAD_LIMIT: 20000,
}))

const actor = { idUser: 7, email: 'a@x.co', roleCode: 'AGENTE', visibleUserIds: [7, 8], canManage: true, idCategory: 3 }
const request = (search = '') => new Request(`http://x/api/crm/reports/pipeline${search}`)

describe('GET /api/crm/reports/pipeline', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: true, actor })
		vi.mocked(canViewReport).mockResolvedValue(true)
	})

	it('passes through guard failures', async () => {
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: false, response: crmErrorResponse('No autorizado', 401) })
		expect((await GET(request())).status).toBe(401)
		expect(requireCrmActor).toHaveBeenCalledWith('crm_reports')
	})

	it('requires the CRM_PIPELINE report permission for the actor category', async () => {
		vi.mocked(canViewReport).mockResolvedValue(false)
		const response = await GET(request())
		expect(response.status).toBe(403)
		expect(canViewReport).toHaveBeenCalledWith({ roleCode: 'AGENTE', idCategory: 3 }, 'CRM_PIPELINE')
		expect(getCrmPipelineReport).not.toHaveBeenCalled()
	})

	it('rejects an invalid range', async () => {
		const response = await GET(request('?from=2026-03-02&to=2026-03-01'))
		expect(response.status).toBe(400)
		expect(getCrmPipelineReport).not.toHaveBeenCalled()
	})

	it('answers 413 when the cohort is too large', async () => {
		vi.mocked(getCrmPipelineReport).mockResolvedValue({ ok: false, reason: 'TOO_MANY_LEADS', total: 25000 })
		const response = await GET(request())
		expect(response.status).toBe(413)
		expect((await response.json()).error).toContain('20.000')
	})

	it('returns the report for the viewer scope', async () => {
		const report = { range: { from: '2026-10-01', to: '2026-10-31' } }
		vi.mocked(getCrmPipelineReport).mockResolvedValue({ ok: true, report } as never)
		const response = await GET(request('?from=2026-10-01&to=2026-10-31&owner=8'))
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ data: report })
		expect(getCrmPipelineReport).toHaveBeenCalledWith(
			{ idUser: 7, role: { code: 'AGENTE' } },
			{ from: '2026-10-01', to: '2026-10-31', ownerIds: [8] },
			[7, 8]
		)
	})

	it('answers 500 when the service throws', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(getCrmPipelineReport).mockRejectedValue(new Error('db'))
		expect((await GET(request())).status).toBe(500)
	})
})
