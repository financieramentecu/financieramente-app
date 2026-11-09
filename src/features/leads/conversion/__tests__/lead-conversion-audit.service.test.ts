import { describe, expect, it, vi } from 'vitest'
import { appendLeadConversionAuditTx } from '@/features/leads/conversion/lead-conversion-audit.service'

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
})
