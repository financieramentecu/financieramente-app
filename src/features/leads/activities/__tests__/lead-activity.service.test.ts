import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	appendLeadActivityTx,
	getLeadActivityPage,
} from '@/features/leads/activities/lead-activity.service'

const create = vi.fn()
const findMany = vi.fn()
const updateMany = vi.fn()

const tx = { leadActivity: { create }, lead: { updateMany } }

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

	it.each(['NOTE_ADDED', 'CALL_LOGGED', 'TASK_COMPLETED', 'CONVERTED'] as const)(
		'bumps lead.lastActivityAt for contact event %s only when newer',
		async (type) => {
			create.mockResolvedValue({ idLeadActivity: 1 })
			const occurredAt = new Date('2026-11-09T14:00:00.000Z')
			await appendLeadActivityTx(tx as never, {
				idLead: 12,
				idUser: 4,
				type,
				payload: type === 'NOTE_ADDED' ? { note: 'x' } : type === 'CALL_LOGGED' ? { summary: 'x' } : type === 'CONVERTED' ? { businessId: 1 } : { taskId: 1 },
				occurredAt,
			})
			expect(updateMany).toHaveBeenCalledWith({
				where: { idLead: 12, OR: [{ lastActivityAt: null }, { lastActivityAt: { lt: occurredAt } }] },
				data: { lastActivityAt: occurredAt },
			})
		}
	)

	it.each(['TASK_CREATED', 'TASK_REASSIGNED', 'TASK_COMMENTED', 'CASE_UPDATED', 'BUSINESS_LINKED'] as const)(
		'does not bump lastActivityAt for %s',
		async (type) => {
			create.mockResolvedValue({ idLeadActivity: 1 })
			await appendLeadActivityTx(tx as never, { idLead: 12, idUser: 4, type, payload: { taskId: 1 } })
			expect(updateMany).not.toHaveBeenCalled()
		}
	)

	it('stores the logged occurredAt from the client payload', async () => {
		create.mockResolvedValue({ idLeadActivity: 1 })
		const occurredAt = new Date('2026-11-08T09:30:00.000Z')
		await appendLeadActivityTx(tx as never, {
			idLead: 12,
			idUser: 4,
			type: 'MEETING_LOGGED',
			payload: { summary: 'Reunión inicial' },
			occurredAt,
		})
		expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ occurredAt }) })
	})
})
