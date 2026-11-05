import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	appendLeadActivityTx,
	getLeadActivityPage,
} from '@/features/leads/activities/lead-activity.service'

const create = vi.fn()
const findMany = vi.fn()

const tx = { leadActivity: { create } }

describe('lead activity service', () => {
	beforeEach(() => vi.clearAllMocks())

	it('appends a typed immutable note event through the transaction client', async () => {
		create.mockResolvedValue({ idLeadActivity: 7 })

		await appendLeadActivityTx(tx as never, {
			idLead: 12,
			idUser: 4,
			type: 'NOTE_ADDED',
			payload: { note: 'Llamar el viernes' },
			correlationId: 'note-12-1',
		})

		expect(create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				idLead: 12,
				idUser: 4,
				type: 'NOTE_ADDED',
				payload: { note: 'Llamar el viernes' },
				payloadVersion: 1,
				correlationId: 'note-12-1',
			}),
		})
	})

	it('uses a stable occurredAt/id cursor and requests one extra record', async () => {
		findMany.mockResolvedValue([])
		await getLeadActivityPage({ leadActivity: { findMany } } as never, 12, {
			limit: 20,
			cursor: {
				occurredAt: new Date('2026-11-05T10:00:00.000Z'),
				idLeadActivity: 8,
			},
		})

		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ idLead: 12 }),
				orderBy: [{ occurredAt: 'desc' }, { idLeadActivity: 'desc' }],
				take: 21,
			})
		)
		const where = findMany.mock.calls[0][0].where
		expect(where.AND).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					OR: expect.arrayContaining([
						{ occurredAt: { lt: new Date('2026-11-05T10:00:00.000Z') } },
					]),
				}),
			])
		)
	})
})
