import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import {
	createLeadTag,
	deactivateLeadTag,
	listLeadTags,
	setLeadTags,
} from '@/features/leads/tags/lead-tag.service'

const tx = {
	leadTagAssignment: { updateMany: vi.fn(), upsert: vi.fn(), findMany: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({
	prisma: {
		$transaction: vi.fn((callback: (client: unknown) => unknown) => callback(tx)),
		leadTag: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
	},
}))
vi.mock('@/features/auth/lib/audit-logger', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/auth/lib/audit-logger')>()),
	logAuditEvent: vi.fn(),
}))

const ctx = { userId: 7, email: 'a@x.co' }
const vip = { idLeadTag: 1, name: 'VIP', color: '#ff0000' }

describe('lead tag catalogue', () => {
	beforeEach(() => vi.clearAllMocks())

	it('lists active tags by name', async () => {
		vi.mocked(prisma.leadTag.findMany).mockResolvedValue([vip] as never)
		await expect(listLeadTags()).resolves.toEqual([vip])
		expect(prisma.leadTag.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { active: true }, orderBy: { name: 'asc' } }))
	})

	it('creates a new tag and audits it', async () => {
		vi.mocked(prisma.leadTag.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.leadTag.create).mockResolvedValue(vip as never)
		await expect(createLeadTag({ name: ' VIP ', color: '#ff0000' }, ctx)).resolves.toEqual({ ok: true, tag: vip })
		expect(prisma.leadTag.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { name: { equals: 'VIP', mode: 'insensitive' } } })
		)
		expect(prisma.leadTag.create).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'VIP', color: '#ff0000', createdBy: 7 } }))
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LEAD_TAG_CREATED }))
	})

	it('refuses a duplicate active name, case-insensitively', async () => {
		vi.mocked(prisma.leadTag.findFirst).mockResolvedValue({ ...vip, active: true } as never)
		await expect(createLeadTag({ name: 'vip', color: '#000000' }, ctx)).resolves.toEqual({ ok: false, reason: 'DUPLICATE' })
		expect(prisma.leadTag.create).not.toHaveBeenCalled()
	})

	it('reactivates an inactive tag with the same name', async () => {
		vi.mocked(prisma.leadTag.findFirst).mockResolvedValue({ ...vip, active: false } as never)
		vi.mocked(prisma.leadTag.update).mockResolvedValue({ ...vip, color: '#000000' } as never)
		await createLeadTag({ name: 'vip', color: '#000000' }, ctx)
		expect(prisma.leadTag.update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { idLeadTag: 1 }, data: { active: true, color: '#000000' } })
		)
	})

	it('deactivates a tag', async () => {
		vi.mocked(prisma.leadTag.findFirst).mockResolvedValue(null)
		await expect(deactivateLeadTag(1, ctx)).resolves.toEqual({ ok: false, reason: 'NOT_FOUND' })
		vi.mocked(prisma.leadTag.findFirst).mockResolvedValue({ idLeadTag: 1 } as never)
		await expect(deactivateLeadTag(1, ctx)).resolves.toEqual({ ok: true })
		expect(prisma.leadTag.update).toHaveBeenCalledWith({ where: { idLeadTag: 1 }, data: { active: false } })
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LEAD_TAG_DEACTIVATED }))
	})
})

describe('setLeadTags', () => {
	beforeEach(() => vi.clearAllMocks())

	it('rejects unknown or inactive tags', async () => {
		vi.mocked(prisma.leadTag.count).mockResolvedValue(1)
		await expect(setLeadTags(10, [1, 9], ctx)).resolves.toEqual({ ok: false, reason: 'UNKNOWN_TAG' })
		expect(prisma.$transaction).not.toHaveBeenCalled()
	})

	it('replaces the active set: removes missing, adds new ones, leaves kept ones untouched, audits', async () => {
		vi.mocked(prisma.leadTag.count).mockResolvedValue(2)
		tx.leadTagAssignment.findMany
			.mockResolvedValueOnce([{ idLeadTag: 1 }, { idLeadTag: 2 }])
			.mockResolvedValueOnce([{ tag: vip }])
		const result = await setLeadTags(10, [1, 3, 3], ctx)
		expect(tx.leadTagAssignment.updateMany).toHaveBeenCalledWith({
			where: { idLead: 10, active: true, idLeadTag: { notIn: [1, 3] } },
			data: { active: false },
		})
		expect(tx.leadTagAssignment.upsert).toHaveBeenCalledTimes(1)
		expect(tx.leadTagAssignment.upsert).toHaveBeenCalledWith({
			where: { idLead_idLeadTag: { idLead: 10, idLeadTag: 3 } },
			create: { idLead: 10, idLeadTag: 3, assignedBy: 7 },
			update: { active: true, assignedBy: 7 },
		})
		expect(result).toEqual({ ok: true, tags: [vip] })
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: AuditAction.LEAD_TAGS_UPDATED, details: 'Lead 10: tags set to [1, 3]' })
		)
	})

	it('clears every tag with an empty list', async () => {
		tx.leadTagAssignment.findMany.mockResolvedValue([])
		await setLeadTags(10, [], ctx)
		expect(tx.leadTagAssignment.upsert).not.toHaveBeenCalled()
		expect(prisma.leadTag.count).not.toHaveBeenCalled()
		expect(tx.leadTagAssignment.updateMany).toHaveBeenCalledWith({
			where: { idLead: 10, active: true, idLeadTag: { notIn: [] } },
			data: { active: false },
		})
	})
})
