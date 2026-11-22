import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { auditCrmEvent } from '@/features/leads/crm/audit-crm-event'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import { getTaskNoticeSetting, saveTaskNoticeSetting } from '@/features/leads/tasks/crm-notification-setting.service'

vi.mock('@/lib/prisma', () => ({
	prisma: { crmNotificationSetting: { findUnique: vi.fn(), upsert: vi.fn() } },
}))
vi.mock('@/features/leads/crm/audit-crm-event', () => ({ auditCrmEvent: vi.fn() }))

const ctx = { userId: 7, email: 'admin@x.co', ipAddress: '127.0.0.1', userAgent: 'vitest' }

describe('crm notification setting', () => {
	beforeEach(() => vi.clearAllMocks())

	it('returns the stored anticipation days', async () => {
		vi.mocked(prisma.crmNotificationSetting.findUnique).mockResolvedValue({ anticipationDays: 3 } as never)
		expect(await getTaskNoticeSetting()).toEqual({ anticipationDays: 3 })
	})

	it('falls back to 1 day when the row is missing', async () => {
		vi.mocked(prisma.crmNotificationSetting.findUnique).mockResolvedValue(null)
		expect(await getTaskNoticeSetting()).toEqual({ anticipationDays: 1 })
	})

	it('saves the days and writes an audit event', async () => {
		vi.mocked(prisma.crmNotificationSetting.upsert).mockResolvedValue({ anticipationDays: 5 } as never)
		expect(await saveTaskNoticeSetting(5, ctx)).toEqual({ anticipationDays: 5 })
		expect(prisma.crmNotificationSetting.upsert).toHaveBeenCalledWith({
			where: { id: 1 },
			create: { id: 1, anticipationDays: 5, updatedBy: 7 },
			update: { anticipationDays: 5, updatedBy: 7 },
			select: { anticipationDays: true },
		})
		expect(auditCrmEvent).toHaveBeenCalledWith(ctx, AuditAction.CRM_TASK_NOTICE_UPDATED, 'CRM task notice anticipation set to 5 days')
	})
})
