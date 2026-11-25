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

	it.each([
		'NOTE_ADDED',
		'CALL_LOGGED',
		'TASK_COMPLETED',
		'CONVERTED',
	] as const)(
		'bumps lead.lastActivityAt for contact event %s only when newer',
		async (type) => {
			create.mockResolvedValue({ idLeadActivity: 1 })
			const occurredAt = new Date('2026-11-09T14:00:00.000Z')
			await appendLeadActivityTx(tx as never, {
				idLead: 12,
				idUser: 4,
				type,
				payload:
					type === 'NOTE_ADDED'
						? { note: 'x' }
						: type === 'CALL_LOGGED'
							? { summary: 'x' }
							: type === 'CONVERTED'
								? { businessId: 1 }
								: { taskId: 1 },
				occurredAt,
			})
			expect(updateMany).toHaveBeenCalledWith({
				where: {
					idLead: 12,
					OR: [
						{ lastActivityAt: null },
						{ lastActivityAt: { lt: occurredAt } },
					],
				},
				data: { lastActivityAt: occurredAt },
			})
		}
	)

	it.each([
		'TASK_CREATED',
		'TASK_REASSIGNED',
		'TASK_COMMENTED',
		'CASE_UPDATED',
		'BUSINESS_LINKED',
	] as const)('does not bump lastActivityAt for %s', async (type) => {
		create.mockResolvedValue({ idLeadActivity: 1 })
		await appendLeadActivityTx(tx as never, {
			idLead: 12,
			idUser: 4,
			type,
			payload: { taskId: 1 },
		})
		expect(updateMany).not.toHaveBeenCalled()
	})

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
		expect(create).toHaveBeenCalledWith({
			data: expect.objectContaining({ occurredAt }),
		})
	})
})

it('pages visible group activities together, retaining their source lead, capture and original author', async () => {
	const occurredAt = new Date('2026-11-24T12:00:00Z')
	const rows = [
		{
			idLead: 2,
			idLeadActivity: 9,
			lead: { capture: { name: 'Programa' } },
			type: 'NOTE_ADDED',
			occurredAt,
			actor: { name: 'Original', lastName: 'Author' },
			payload: { note: 'New' },
		},
		{
			idLead: 1,
			idLeadActivity: 8,
			lead: { capture: null },
			type: 'NOTE_ADDED',
			occurredAt,
			actor: { name: 'Other', lastName: null },
			payload: { note: 'Old' },
		},
	]
	findMany.mockResolvedValue(rows)
	const client = { leadActivity: { findMany } }
	const first = await getLeadActivityPage(client as never, 1, {
		limit: 1,
		leadIds: [1, 2],
	})
	expect(first.items).toEqual([
		expect.objectContaining({
			idLead: 2,
			captureName: 'Programa',
			actorName: 'Original Author',
		}),
	])
	expect(first.nextCursor).toEqual({ occurredAt, idLeadActivity: 9 })
	expect(findMany).toHaveBeenLastCalledWith(
		expect.objectContaining({ where: { idLead: { in: [1, 2] } }, take: 2 })
	)
	findMany.mockResolvedValue(rows.slice(1))
	const second = await getLeadActivityPage(client as never, 1, {
		limit: 1,
		leadIds: [1, 2],
		cursor: first.nextCursor!,
	})
	expect(second.items).toEqual([
		expect.objectContaining({
			idLead: 1,
			captureName: null,
			actorName: 'Other',
		}),
	])
	expect(second.nextCursor).toBeNull()
	expect(findMany).toHaveBeenLastCalledWith(
		expect.objectContaining({
			where: {
				idLead: { in: [1, 2] },
				AND: [
					{
						OR: [
							{ occurredAt: { lt: occurredAt } },
							{ occurredAt, idLeadActivity: { lt: 9 } },
						],
					},
				],
			},
		})
	)
})
