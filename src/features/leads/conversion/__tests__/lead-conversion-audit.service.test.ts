import { describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
	appendLeadConversionAuditAfterCommit,
	appendLeadConversionAuditTx,
} from '@/features/leads/conversion/lead-conversion-audit.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		$transaction: vi.fn(),
	},
}))

describe('lead conversion audit service', () => {
	it('appends conversion and business-link events with deterministic distinct correlation ids', async () => {
		const create = vi.fn().mockResolvedValue({})
		const tx = { leadActivity: { create }, lead: { updateMany: vi.fn() } }

		await appendLeadConversionAuditTx(tx as never, {
			idLead: 12,
			idBusiness: 77,
			idUser: 4,
		})

		expect(create).toHaveBeenCalledTimes(2)
		expect(create).toHaveBeenNthCalledWith(1, {
			data: expect.objectContaining({
				idLead: 12,
				idBusiness: 77,
				idUser: 4,
				type: 'CONVERTED',
				payload: { businessId: 77 },
				correlationId: 'lead-conversion:12:77:converted',
			}),
		})
		expect(create).toHaveBeenNthCalledWith(2, {
			data: expect.objectContaining({
				type: 'BUSINESS_LINKED',
				payload: { businessId: 77 },
				correlationId: 'lead-conversion:12:77:business-linked',
			}),
		})
	})

	it('writes the conversion audit in its own transaction', async () => {
		const create = vi.fn().mockResolvedValue({})
		vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
			if (typeof callback !== 'function') {
				throw new Error('expected an interactive transaction')
			}
			return callback({
				leadActivity: { create },
				lead: { updateMany: vi.fn() },
			} as never)
		})

		await appendLeadConversionAuditAfterCommit({
			idLead: 12,
			idBusiness: 77,
			idUser: 4,
		})

		expect(prisma.$transaction).toHaveBeenCalledOnce()
		expect(create).toHaveBeenCalledTimes(2)
	})
})
