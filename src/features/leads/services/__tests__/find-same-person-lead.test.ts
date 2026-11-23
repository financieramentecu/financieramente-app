import { describe, expect, it, vi } from 'vitest'
import { findSamePersonLead } from '../find-same-person-lead'

function makeDb(rowsByCall: Array<Array<{ idLead: number; idUser: number | null }>>) {
	const findMany = vi.fn()
	for (const rows of rowsByCall) findMany.mockResolvedValueOnce(rows)
	return { db: { lead: { findMany }, leadClientOrigin: {} } as never, findMany }
}

describe('findSamePersonLead', () => {
	it('escapes LIKE wildcards in the email before the case-insensitive match', async () => {
		const { db, findMany } = makeDb([[]])
		await findSamePersonLead(db, { email: 'juan_perez@x.co' })
		expect(findMany.mock.calls[0][0].where.email).toEqual({
			equals: 'juan\\_perez@x.co',
			mode: 'insensitive',
		})
	})

	it('returns the single match and stops at the first key that finds one', async () => {
		const { db, findMany } = makeDb([[{ idLead: 5, idUser: 9 }]])
		const found = await findSamePersonLead(db, {
			identityNumber: '123',
			email: 'a@x.co',
			phone: '300',
		})
		expect(found).toEqual({ idLead: 5, idUser: 9 })
		expect(findMany).toHaveBeenCalledTimes(1)
	})

	it('falls through to the next key when the previous one finds nothing', async () => {
		const { db } = makeDb([[], [{ idLead: 7, idUser: null }]])
		expect(await findSamePersonLead(db, { identityNumber: '1', email: 'a@x.co' })).toEqual({
			idLead: 7,
			idUser: null,
		})
	})

	it('returns null without trying other keys when a key matches several leads', async () => {
		const { db, findMany } = makeDb([
			[
				{ idLead: 1, idUser: 2 },
				{ idLead: 3, idUser: 4 },
			],
		])
		expect(await findSamePersonLead(db, { identityNumber: '1', email: 'a@x.co' })).toBeNull()
		expect(findMany).toHaveBeenCalledTimes(1)
	})

	it('returns null when no contact data is present', async () => {
		const { db, findMany } = makeDb([])
		expect(await findSamePersonLead(db, { email: '  ' })).toBeNull()
		expect(findMany).not.toHaveBeenCalled()
	})
})
