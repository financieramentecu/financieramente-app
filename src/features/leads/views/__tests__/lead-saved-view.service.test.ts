import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import { DEFAULT_LEAD_TABLE_QUERY, toSavedLeadTableQuery } from '@/features/leads/table/lead-table-query.schema'
import {
	MAX_SAVED_VIEWS_PER_USER,
	createLeadSavedView,
	deactivateLeadSavedView,
	listLeadSavedViews,
	updateLeadSavedView,
} from '@/features/leads/views/lead-saved-view.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadSavedView: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
	},
}))
vi.mock('@/features/auth/lib/audit-logger', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/auth/lib/audit-logger')>()),
	logAuditEvent: vi.fn(),
}))

const ctx = { userId: 7, email: 'a@x.co', ipAddress: '1.1.1.1', userAgent: 'ua' }
const savedQuery = toSavedLeadTableQuery({ ...DEFAULT_LEAD_TABLE_QUERY, statuses: ['OPEN'] })
const stored = { idLeadSavedView: 3, name: 'Abiertos', query: savedQuery, updatedAt: new Date('2026-11-10T00:00:00Z') }

describe('lead saved views', () => {
	beforeEach(() => vi.clearAllMocks())

	it('lists only the active views of the user and drops invalid stored queries', async () => {
		vi.mocked(prisma.leadSavedView.findMany).mockResolvedValue([
			stored,
			{ ...stored, idLeadSavedView: 4, query: { statuses: ['NOPE'] } },
		] as never)
		const views = await listLeadSavedViews(7)
		expect(prisma.leadSavedView.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { idUser: 7, active: true }, orderBy: { name: 'asc' } })
		)
		expect(views).toEqual([{ idLeadSavedView: 3, name: 'Abiertos', query: savedQuery }])
	})

	it('creates a view without paging and audits it', async () => {
		vi.mocked(prisma.leadSavedView.count).mockResolvedValue(0)
		vi.mocked(prisma.leadSavedView.create).mockResolvedValue(stored as never)
		const result = await createLeadSavedView(
			{ name: ' Abiertos ', query: { ...DEFAULT_LEAD_TABLE_QUERY, statuses: ['OPEN'], page: 4 } },
			ctx
		)
		expect(prisma.leadSavedView.create).toHaveBeenCalledWith(
			expect.objectContaining({ data: { idUser: 7, name: 'Abiertos', query: savedQuery } })
		)
		expect(result).toEqual({ ok: true, view: { idLeadSavedView: 3, name: 'Abiertos', query: savedQuery } })
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LEAD_VIEW_CREATED }))
	})

	it('refuses a view above the per-user limit', async () => {
		vi.mocked(prisma.leadSavedView.count).mockResolvedValue(MAX_SAVED_VIEWS_PER_USER)
		await expect(createLeadSavedView({ name: 'x', query: DEFAULT_LEAD_TABLE_QUERY }, ctx)).resolves.toEqual({
			ok: false,
			reason: 'LIMIT_REACHED',
		})
		expect(prisma.leadSavedView.create).not.toHaveBeenCalled()
	})

	it("never touches another user's view", async () => {
		vi.mocked(prisma.leadSavedView.findFirst).mockResolvedValue(null)
		await expect(updateLeadSavedView(3, { name: 'y' }, ctx)).resolves.toEqual({ ok: false, reason: 'NOT_FOUND' })
		expect(prisma.leadSavedView.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { idLeadSavedView: 3, idUser: 7, active: true } })
		)
		await expect(deactivateLeadSavedView(3, ctx)).resolves.toEqual({ ok: false, reason: 'NOT_FOUND' })
		expect(prisma.leadSavedView.update).not.toHaveBeenCalled()
	})

	it('renames and re-filters a view, auditing the update', async () => {
		vi.mocked(prisma.leadSavedView.findFirst).mockResolvedValue({ idLeadSavedView: 3 } as never)
		vi.mocked(prisma.leadSavedView.update).mockResolvedValue({ ...stored, name: 'Nuevo' } as never)
		const result = await updateLeadSavedView(3, { name: 'Nuevo', query: { ...DEFAULT_LEAD_TABLE_QUERY, statuses: ['OPEN'] } }, ctx)
		expect(prisma.leadSavedView.update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { idLeadSavedView: 3 }, data: { name: 'Nuevo', query: savedQuery } })
		)
		expect(result).toMatchObject({ ok: true, view: { name: 'Nuevo' } })
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LEAD_VIEW_UPDATED }))
	})

	it('soft-deletes a view', async () => {
		vi.mocked(prisma.leadSavedView.findFirst).mockResolvedValue({ idLeadSavedView: 3 } as never)
		await expect(deactivateLeadSavedView(3, ctx)).resolves.toEqual({ ok: true })
		expect(prisma.leadSavedView.update).toHaveBeenCalledWith({ where: { idLeadSavedView: 3 }, data: { active: false } })
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LEAD_VIEW_DEACTIVATED }))
	})
})
