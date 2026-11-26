import { describe, expect, it, vi } from 'vitest'
import {
	collectPersonGroupIds,
	resolvePersonGroupOwner,
	propagatePersonGroupOwner,
	findPersonContactIds,
	LeadPersonGroupError,
	type LeadGroupDb,
} from '../lead-person-group.service'

function database() {
	const db = {
		lead: { findMany: vi.fn(), updateMany: vi.fn() },
		leadLink: { findMany: vi.fn() },
		user: { findFirst: vi.fn() },
		leadChangeHistory: { createMany: vi.fn() },
	}
	return { db, client: db as unknown as LeadGroupDb }
}
describe('person group ownership', () => {
	it('traverses a persisted chain beyond the former eight pass cutoff without matching contacts', async () => {
		const { db, client } = database()
		db.leadLink.findMany.mockImplementation(async (args) => {
			const pending = args.where.OR[0].idLead.in as number[]
			return pending.flatMap((id) =>
				id < 12 ? [{ idLead: id, idRelatedLead: id + 1 }] : []
			)
		})
		expect(await collectPersonGroupIds([1], client)).toEqual(
			Array.from({ length: 12 }, (_, i) => i + 1)
		)
		expect(db.lead.findMany).not.toHaveBeenCalled()
	})
	it('rejects a hidden group member before writes even when the requested owner is in scope', async () => {
		const { db, client } = database()
		db.lead.findMany.mockResolvedValue([
			{ idLead: 1, idUser: 7 },
			{ idLead: 2, idUser: 99 },
		])
		await expect(
			resolvePersonGroupOwner(client, [1, 2], {
				manageableUserIds: [7],
				targetOwnerId: 7,
			})
		).rejects.toBeInstanceOf(LeadPersonGroupError)
		expect(db.lead.updateMany).not.toHaveBeenCalled()
	})
	it('inherits one known owner but rejects conflicting owners without an explicit choice', async () => {
		const { db, client } = database()
		db.lead.findMany.mockResolvedValue([
			{ idLead: 1, idUser: null },
			{ idLead: 2, idUser: 7 },
		])
		expect(
			await resolvePersonGroupOwner(client, [1, 2], { manageableUserIds: [] })
		).toBe(7)
		db.lead.findMany.mockResolvedValue([
			{ idLead: 1, idUser: 8 },
			{ idLead: 2, idUser: 7 },
		])
		await expect(
			resolvePersonGroupOwner(client, [1, 2], { manageableUserIds: [] })
		).rejects.toBeInstanceOf(LeadPersonGroupError)
		db.user.findFirst.mockResolvedValue({ idUser: 7 })
		expect(
			await resolvePersonGroupOwner(client, [1, 2], {
				manageableUserIds: [],
				targetOwnerId: 7,
			})
		).toBe(7)
	})
	it('writes owner history through the supplied transaction with the human initiator', async () => {
		const { db, client } = database()
		db.lead.findMany.mockResolvedValue([
			{ idLead: 2, user: { name: 'Old', lastName: null } },
		])
		db.user.findFirst.mockResolvedValue({ name: 'New', lastName: null })
		await propagatePersonGroupOwner(client, [1, 2], 7, {
			source: 'MANUAL',
			idActor: 4,
			actorLabel: 'actor@example.com',
		})
		expect(db.lead.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idLead: { in: [2] }, active: true },
				data: expect.objectContaining({ idUser: 7 }),
			})
		)
		expect(db.leadChangeHistory.createMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					idLead: 2,
					source: 'MANUAL',
					idActor: 4,
					actorLabel: 'actor@example.com',
					fromLabel: 'Old',
					toLabel: 'New',
				}),
			],
		})
	})
	it('does not query empty contacts and escapes email wildcard matching', async () => {
		const { db, client } = database()
		expect(
			await findPersonContactIds(client, { email: '  ', phone: '' })
		).toEqual([])
		expect(db.lead.findMany).not.toHaveBeenCalled()
		db.lead.findMany.mockResolvedValue([{ idLead: 3 }])
		expect(
			await findPersonContactIds(client, { email: 'a_%@x.co' }, 2)
		).toEqual([3])
		expect(db.lead.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					OR: [{ email: { equals: 'a\\_\\%@x.co', mode: 'insensitive' } }],
				}),
			})
		)
	})
})
