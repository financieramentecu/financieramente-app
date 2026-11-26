import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import {
	createActivityLabel,
	deactivateActivityLabel,
	resolveTaskActivityLabel,
	updateActivityLabel,
} from '@/features/leads/activities/activity-label.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadActivityLabel: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
	},
}))
vi.mock('@/features/auth/lib/audit-logger', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/auth/lib/audit-logger')>()),
	logAuditEvent: vi.fn(),
}))

const ctx = { userId: 7, email: 'a@x.co', ipAddress: '1.1.1.1', userAgent: 'ua' }
const visita = { idLeadActivityLabel: 9, name: 'Visita', color: '#111111', code: null }

describe('activity label catalogue', () => {
	beforeEach(() => vi.clearAllMocks())

	it('creates a label and audits it', async () => {
		vi.mocked(prisma.leadActivityLabel.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.leadActivityLabel.count).mockResolvedValue(5)
		vi.mocked(prisma.leadActivityLabel.create).mockResolvedValue(visita as never)
		await expect(createActivityLabel({ name: ' Visita ', color: '#111111' }, ctx)).resolves.toEqual({ ok: true, label: visita })
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LEAD_ACTIVITY_LABEL_CREATED, userId: 7 }))
	})

	it('rejects a duplicate active name and reactivates an inactive one', async () => {
		vi.mocked(prisma.leadActivityLabel.findFirst).mockResolvedValueOnce({ idLeadActivityLabel: 9, active: true } as never)
		await expect(createActivityLabel({ name: 'Visita', color: '#111111' }, ctx)).resolves.toEqual({ ok: false, reason: 'DUPLICATE' })

		vi.mocked(prisma.leadActivityLabel.findFirst).mockResolvedValueOnce({ idLeadActivityLabel: 9, active: false } as never)
		vi.mocked(prisma.leadActivityLabel.update).mockResolvedValue(visita as never)
		await expect(createActivityLabel({ name: 'Visita', color: '#111111' }, ctx)).resolves.toEqual({ ok: true, label: visita })
	})

	it('renames a label and refuses a name already in use', async () => {
		vi.mocked(prisma.leadActivityLabel.findFirst)
			.mockResolvedValueOnce({ idLeadActivityLabel: 9 } as never)
			.mockResolvedValueOnce({ idLeadActivityLabel: 3, active: true } as never)
		await expect(updateActivityLabel(9, { name: 'Llamada', color: '#111111' }, ctx)).resolves.toEqual({ ok: false, reason: 'DUPLICATE' })

		vi.mocked(prisma.leadActivityLabel.findFirst)
			.mockResolvedValueOnce({ idLeadActivityLabel: 9 } as never)
			.mockResolvedValueOnce(null)
		vi.mocked(prisma.leadActivityLabel.update).mockResolvedValue({ ...visita, name: 'Visita comercial' } as never)
		await expect(updateActivityLabel(9, { name: 'Visita comercial', color: '#111111' }, ctx)).resolves.toEqual({
			ok: true,
			label: { ...visita, name: 'Visita comercial' },
		})
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LEAD_ACTIVITY_LABEL_UPDATED }))
	})

	it('keeps the last active label', async () => {
		vi.mocked(prisma.leadActivityLabel.findFirst).mockResolvedValue({ idLeadActivityLabel: 9 } as never)
		vi.mocked(prisma.leadActivityLabel.count).mockResolvedValue(0)
		await expect(deactivateActivityLabel(9, ctx)).resolves.toEqual({ ok: false, reason: 'LAST_ACTIVE' })
		expect(prisma.leadActivityLabel.update).not.toHaveBeenCalled()
	})

	it('resolves a custom label as a generic task and a built-in code as its type', async () => {
		vi.mocked(prisma.leadActivityLabel.findFirst).mockResolvedValueOnce({ idLeadActivityLabel: 9, code: null } as never)
		await expect(resolveTaskActivityLabel({ idLeadActivityLabel: 9 })).resolves.toEqual({
			ok: true,
			type: 'TODO',
			idLeadActivityLabel: 9,
		})
		vi.mocked(prisma.leadActivityLabel.findFirst).mockResolvedValueOnce({ idLeadActivityLabel: 2 } as never)
		await expect(resolveTaskActivityLabel({ type: 'CALL' })).resolves.toEqual({
			ok: true,
			type: 'CALL',
			idLeadActivityLabel: 2,
		})
		vi.mocked(prisma.leadActivityLabel.findFirst).mockResolvedValueOnce(null)
		await expect(resolveTaskActivityLabel({ idLeadActivityLabel: 99 })).resolves.toEqual({ ok: false, reason: 'UNKNOWN_LABEL' })
	})
})
