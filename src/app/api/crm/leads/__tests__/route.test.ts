import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'
import { GET as EXPORT } from '../export/route'
import { requireCrmActor } from '@/lib/auth/require-crm-actor'
import { getLeadTable } from '@/features/leads/table/lead-table.service'
import { exportLeadTable } from '@/features/leads/table/lead-table-export.service'

vi.mock('@/lib/auth/require-crm-actor', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/auth/require-crm-actor')>()),
	requireCrmActor: vi.fn(),
}))
vi.mock('@/features/leads/table/lead-table.service', () => ({ getLeadTable: vi.fn(), LEAD_TABLE_EXPORT_LIMIT: 5000 }))
vi.mock('@/features/leads/table/lead-table-export.service', () => ({ exportLeadTable: vi.fn() }))

const actor = { idUser: 7, email: 'a@x.co', roleCode: 'AGENTE', visibleUserIds: [7, 8], canManage: true }

describe('GET /api/crm/leads', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: true, actor })
	})

	it('returns a scoped page for a valid query', async () => {
		vi.mocked(getLeadTable).mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 25, totals: { estimatedValue: '0', weightedValue: '0' } })
		const response = await GET(new Request('http://x/api/crm/leads?q=ana&page=2'))
		expect(response.status).toBe(200)
		expect(requireCrmActor).toHaveBeenCalledWith('crm_lead_table')
		expect(getLeadTable).toHaveBeenCalledWith(
			{ idUser: 7, role: { code: 'AGENTE' } },
			expect.objectContaining({ q: 'ana', page: 2 }),
			expect.objectContaining({ visibleUserIds: [7, 8], inactivityDays: expect.any(Number) })
		)
	})

	it('400s on an invalid query', async () => {
		const response = await GET(new Request('http://x/api/crm/leads?pageSize=500'))
		expect(response.status).toBe(400)
		expect(getLeadTable).not.toHaveBeenCalled()
	})

	it('propagates the guard response', async () => {
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: false, response: new Response(null, { status: 404 }) as never })
		expect((await GET(new Request('http://x/api/crm/leads'))).status).toBe(404)
	})
})

describe('GET /api/crm/leads/export', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: true, actor })
	})

	it('streams a CSV attachment and passes the audit context', async () => {
		vi.mocked(exportLeadTable).mockResolvedValue({ ok: true, csv: '﻿ID\r\n', rowCount: 0 })
		const response = await EXPORT(new Request('http://x/api/crm/leads/export?status=OPEN', { headers: { 'user-agent': 'ua' } }))
		expect(response.status).toBe(200)
		expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8')
		expect(response.headers.get('content-disposition')).toMatch(/^attachment; filename="leads-\d{4}-\d{2}-\d{2}\.csv"$/)
		expect(response.headers.get('cache-control')).toBe('no-store')
		expect(exportLeadTable).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ statuses: ['OPEN'] }),
			expect.anything(),
			expect.objectContaining({ userId: 7, email: 'a@x.co', userAgent: 'ua' })
		)
	})

	it('413s above the export limit', async () => {
		vi.mocked(exportLeadTable).mockResolvedValue({ ok: false, reason: 'TOO_MANY_ROWS' })
		expect((await EXPORT(new Request('http://x/api/crm/leads/export'))).status).toBe(413)
	})

	it('400s on an invalid query', async () => {
		expect((await EXPORT(new Request('http://x/api/crm/leads/export?sort=nope'))).status).toBe(400)
	})
})
