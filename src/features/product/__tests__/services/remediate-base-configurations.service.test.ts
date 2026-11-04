import { describe, expect, it, vi } from 'vitest'
import { applyMissingBaseConfigurations } from '@/features/product/services/remediate-base-configurations.service'

const { prisma } = vi.hoisted(() => ({
	prisma: {
		$transaction: vi.fn(),
	},
}))

vi.mock('@/lib/prisma', () => ({ prisma }))

describe('applyMissingBaseConfigurations', () => {
	it('gives the transaction room to start and to finish over a slow connection', async () => {
		prisma.$transaction.mockResolvedValue({ created: 0, skipped: 0 })

		await applyMissingBaseConfigurations({
			inserts: [],
			skippedExisting: 0,
			problems: [],
		})

		const options = prisma.$transaction.mock.calls[0][1]
		expect(options.maxWait).toBeGreaterThanOrEqual(30_000)
		expect(options.timeout).toBeGreaterThanOrEqual(120_000)
	})
})
