import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import { listLeadTableForExport } from '@/features/leads/table/lead-table.service'
import { exportLeadTable } from '@/features/leads/table/lead-table-export.service'
import { DEFAULT_LEAD_TABLE_QUERY } from '@/features/leads/table/lead-table-query.schema'

vi.mock('@/features/auth/lib/audit-logger', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/auth/lib/audit-logger')>()),
	logAuditEvent: vi.fn(),
}))
vi.mock('@/features/leads/table/lead-table.service', () => ({ listLeadTableForExport: vi.fn() }))

const viewer = { idUser: 7, role: { code: 'AGENTE' } }
const options = { visibleUserIds: [7], now: new Date(), inactivityDays: 7 }
const ctx = { userId: 7, email: 'a@x.co', ipAddress: '1.1.1.1', userAgent: 'ua' }

describe('exportLeadTable', () => {
	beforeEach(() => vi.clearAllMocks())

	it('builds the CSV and audits the export with the row count and filters', async () => {
		vi.mocked(listLeadTableForExport).mockResolvedValue({ ok: true, rows: [] })
		const result = await exportLeadTable(viewer, { ...DEFAULT_LEAD_TABLE_QUERY, q: 'ana' }, options, ctx)
		expect(result.ok && result.csv.startsWith('﻿ID,')).toBe(true)
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.LEAD_TABLE_EXPORTED,
				userId: 7,
				ipAddress: '1.1.1.1',
				details: expect.stringContaining('0 rows'),
			})
		)
		expect(vi.mocked(logAuditEvent).mock.calls[0][0].details).toContain('q=ana')
	})

	it('does not audit a refused export', async () => {
		vi.mocked(listLeadTableForExport).mockResolvedValue({ ok: false, reason: 'TOO_MANY_ROWS' })
		await expect(exportLeadTable(viewer, DEFAULT_LEAD_TABLE_QUERY, options, ctx)).resolves.toEqual({
			ok: false,
			reason: 'TOO_MANY_ROWS',
		})
		expect(logAuditEvent).not.toHaveBeenCalled()
	})
})
