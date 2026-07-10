import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	updateBusinessDateAnchored,
	assertHasSupports,
} from '../business-date-anchored.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		payment: {
			updateMany: vi.fn(),
		},
		businessSupport: {
			count: vi.fn(),
		},
		$transaction: vi.fn((cb: (tx: unknown) => unknown) =>
			cb({
				payment: { updateMany: vi.fn() },
				business: { update: vi.fn() },
			})
		),
	},
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	AuditAction: {
		BUSINESS_DATE_ANCHORED_UPDATED: 'BUSINESS_DATE_ANCHORED_UPDATED',
	},
}))

vi.mock('@/features/negocios/mappers/business-entity.mapper', () => ({
	prismaBusinessToEntity: vi.fn((b: unknown) => ({ id: (b as { idBusiness: number }).idBusiness })),
}))

import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'

const mockPrisma = prisma as unknown as {
	business: {
		findUnique: ReturnType<typeof vi.fn>
		update: ReturnType<typeof vi.fn>
	}
	payment: {
		updateMany: ReturnType<typeof vi.fn>
	}
	businessSupport: {
		count: ReturnType<typeof vi.fn>
	}
	$transaction: ReturnType<typeof vi.fn>
}

const actor = {
	userId: 1 as number | undefined,
	email: 'test@example.com',
	ip: '127.0.0.1',
	ua: 'vitest',
}

beforeEach(() => {
	vi.clearAllMocks()
	mockPrisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
		cb({
			payment: { updateMany: mockPrisma.payment.updateMany },
			business: { update: mockPrisma.business.update },
		})
	)
})

describe('updateBusinessDateAnchored', () => {
	const date = new Date('2026-06-15T12:00:00Z')

	it('returns NOT_FOUND when the business does not exist', async () => {
		mockPrisma.business.findUnique.mockResolvedValue(null)

		const result = await updateBusinessDateAnchored(999, actor, date)

		expect(result).toEqual({ ok: false, code: 'NOT_FOUND' })
		expect(mockPrisma.$transaction).not.toHaveBeenCalled()
	})

	it('syncs Business.dateAnchored and Payment[installmentIndex=1] in one transaction', async () => {
		mockPrisma.business.findUnique.mockResolvedValue({ idBusiness: 1 })
		mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 })
		mockPrisma.business.update.mockResolvedValue({ idBusiness: 1, dateAnchored: date })

		const result = await updateBusinessDateAnchored(1, actor, date)

		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
		expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
			where: { idBusiness: 1, installmentIndex: 1 },
			data: { dateAnchored: date },
		})
		expect(mockPrisma.business.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idBusiness: 1 },
				data: { dateAnchored: date },
			})
		)
		expect(result.ok).toBe(true)
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'BUSINESS_DATE_ANCHORED_UPDATED' })
		)
	})

	it('is a no-op on Payment when the business has no payments (count 0, no error)', async () => {
		mockPrisma.business.findUnique.mockResolvedValue({ idBusiness: 2 })
		mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 })
		mockPrisma.business.update.mockResolvedValue({ idBusiness: 2, dateAnchored: date })

		const result = await updateBusinessDateAnchored(2, actor, date)

		expect(result.ok).toBe(true)
	})

	it('rolls back (propagates) when the transaction throws mid-way', async () => {
		mockPrisma.business.findUnique.mockResolvedValue({ idBusiness: 3 })
		mockPrisma.$transaction.mockImplementation(async () => {
			throw new Error('partial failure')
		})

		await expect(updateBusinessDateAnchored(3, actor, date)).rejects.toThrow(
			'partial failure'
		)
	})
})

describe('assertHasSupports', () => {
	it('returns NO_SUPPORTS when there are 0 active supports', async () => {
		mockPrisma.businessSupport.count.mockResolvedValue(0)

		const result = await assertHasSupports(1)

		expect(result).toEqual({ ok: false, code: 'NO_SUPPORTS' })
		expect(mockPrisma.businessSupport.count).toHaveBeenCalledWith({
			where: { businessId: 1, status: true },
		})
	})

	it('ignores deactivated supports (status: false excluded by the count filter)', async () => {
		mockPrisma.businessSupport.count.mockResolvedValue(0)

		await assertHasSupports(1)

		expect(mockPrisma.businessSupport.count).toHaveBeenCalledWith(
			expect.objectContaining({ where: { businessId: 1, status: true } })
		)
	})

	it('returns ok when there is at least 1 active support', async () => {
		mockPrisma.businessSupport.count.mockResolvedValue(1)

		const result = await assertHasSupports(1)

		expect(result).toEqual({ ok: true })
	})
})
