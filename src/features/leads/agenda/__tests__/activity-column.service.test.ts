import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import {
	createActivityColumn,
	deactivateActivityColumn,
	listActivityColumns,
	renameActivityColumn,
} from '@/features/leads/agenda/activity-column.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadActivityColumn: { findMany: vi.fn(), findFirst: vi.fn(), upsert: vi.fn(), create: vi.fn(), update: vi.fn() },
		leadTask: { update: vi.fn(), updateMany: vi.fn() },
		leadSupportCase: { update: vi.fn(), updateMany: vi.fn() },
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
			column: { code: 'overdue', name: 'Atrasadas', position: 0, system: true },
		})
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LEAD_ACTIVITY_COLUMN_RENAMED, userId: 7 }))
	})

	it('rejects an unknown column code', async () => {
		await expect(renameActivityColumn('later', 'Luego', ctx)).resolves.toEqual({ ok: false, reason: 'UNKNOWN_COLUMN' })
		expect(prisma.leadActivityColumn.upsert).not.toHaveBeenCalled()
	})

	it('adds a custom column after the due-date columns', async () => {
		vi.mocked(prisma.leadActivityColumn.findMany).mockResolvedValue([] as never)
		vi.mocked(prisma.leadActivityColumn.create).mockImplementation((async (args: { data: { code: string; name: string; position: number } }) => args.data) as never)
		const result = await createActivityColumn('Seguimiento', ctx)
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.column).toMatchObject({ name: 'Seguimiento', position: 4, system: false })
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LEAD_ACTIVITY_COLUMN_CREATED }))
	})

	it('refuses a name already visible and restores a hidden column with that name', async () => {
		vi.mocked(prisma.leadActivityColumn.findMany).mockResolvedValueOnce([
			{ code: 'today', name: 'Vencen hoy', position: 1, active: true },
		] as never)
		await expect(createActivityColumn('vencen hoy', ctx)).resolves.toEqual({ ok: false, reason: 'DUPLICATE' })

		vi.mocked(prisma.leadActivityColumn.findMany).mockResolvedValueOnce([
			{ code: 'xabc', name: 'Seguimiento', position: 4, active: false },
		] as never)
		vi.mocked(prisma.leadActivityColumn.update).mockResolvedValue({
			code: 'xabc',
			name: 'Seguimiento',
			position: 4,
			active: true,
		} as never)
		await expect(createActivityColumn('Seguimiento', ctx)).resolves.toEqual({
			ok: true,
			column: { code: 'xabc', name: 'Seguimiento', position: 4, system: false },
		})
	})

	it('hides a custom column, releases its cards, and keeps the last column', async () => {
		vi.mocked(prisma.leadActivityColumn.findMany).mockResolvedValueOnce([
			{ code: 'overdue', name: 'Vencidas', position: 0, active: true },
			{ code: 'xabc', name: 'Seguimiento', position: 4, active: true },
		] as never)
		vi.mocked(prisma.leadActivityColumn.update).mockResolvedValue({} as never)
		await expect(deactivateActivityColumn('xabc', ctx)).resolves.toEqual({ ok: true })
		expect(prisma.leadTask.updateMany).toHaveBeenCalledWith({ where: { columnCode: 'xabc' }, data: { columnCode: null } })
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LEAD_ACTIVITY_COLUMN_DEACTIVATED }))

		vi.mocked(prisma.leadActivityColumn.findMany).mockResolvedValueOnce([
			{ code: 'overdue', name: 'Vencidas', position: 0, active: false },
			{ code: 'today', name: 'Vencen hoy', position: 1, active: false },
			{ code: 'upcoming', name: 'Próximas a vencer', position: 2, active: false },
			{ code: 'done', name: 'Completadas', position: 3, active: true },
		] as never)
		await expect(deactivateActivityColumn('done', ctx)).resolves.toEqual({ ok: false, reason: 'LAST_ACTIVE' })
	})
})
