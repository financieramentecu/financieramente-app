import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import { listActivityColumns, renameActivityColumn } from '@/features/leads/agenda/activity-column.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadActivityColumn: { findMany: vi.fn(), findFirst: vi.fn(), upsert: vi.fn() },
	},
}))
vi.mock('@/features/auth/lib/audit-logger', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/auth/lib/audit-logger')>()),
	logAuditEvent: vi.fn(),
}))

const ctx = { userId: 7, email: 'a@x.co', ipAddress: '1.1.1.1', userAgent: 'ua' }

describe('activity column titles', () => {
	beforeEach(() => vi.clearAllMocks())

	it('fills a missing column with the built-in title', async () => {
		vi.mocked(prisma.leadActivityColumn.findMany).mockResolvedValue([
			{ code: 'overdue', name: 'Atrasadas', position: 0 },
		] as never)
		const columns = await listActivityColumns()
		expect(columns.map((column) => column.name)).toEqual(['Atrasadas', 'Vencen hoy', 'Próximas a vencer', 'Completadas'])
	})

	it('renames a column and refuses a name already used by another', async () => {
		vi.mocked(prisma.leadActivityColumn.findFirst).mockResolvedValueOnce({ code: 'today' } as never)
		await expect(renameActivityColumn('overdue', 'Vencen hoy', ctx)).resolves.toEqual({ ok: false, reason: 'DUPLICATE' })

		vi.mocked(prisma.leadActivityColumn.findFirst).mockResolvedValueOnce(null)
		vi.mocked(prisma.leadActivityColumn.upsert).mockResolvedValue({ code: 'overdue', name: 'Atrasadas', position: 0 } as never)
		await expect(renameActivityColumn('overdue', ' Atrasadas ', ctx)).resolves.toEqual({
			ok: true,
			column: { code: 'overdue', name: 'Atrasadas', position: 0 },
		})
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LEAD_ACTIVITY_COLUMN_RENAMED, userId: 7 }))
	})

	it('rejects an unknown column code', async () => {
		await expect(renameActivityColumn('later', 'Luego', ctx)).resolves.toEqual({ ok: false, reason: 'UNKNOWN_COLUMN' })
		expect(prisma.leadActivityColumn.upsert).not.toHaveBeenCalled()
	})
})
