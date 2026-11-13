import { describe, it, expect } from 'vitest'
import { scopeUserIdsToSession } from '../../lib/scope-user-ids'

const partnerSession = { user: { id: '7', role: 'PARTNER' } }

describe('scopeUserIdsToSession', () => {
	it('forces a PARTNER session to its own id, ignoring the requested ids', async () => {
		expect(await scopeUserIdsToSession(partnerSession, [1, 2, 7, 9])).toEqual([7])
		expect(await scopeUserIdsToSession(partnerSession, [42])).toEqual([7])
	})

	it('keeps the empty request empty for a PARTNER (short-circuit contract)', async () => {
		expect(await scopeUserIdsToSession(partnerSession, [])).toEqual([])
	})

	it('fails closed for a PARTNER whose session id is missing or invalid', async () => {
		expect(
			await scopeUserIdsToSession({ user: { id: undefined, role: 'PARTNER' } }, [1])
		).toEqual([])
		expect(
			await scopeUserIdsToSession({ user: { id: 'abc', role: 'PARTNER' } }, [1])
		).toEqual([])
	})

	it('leaves other roles untouched', async () => {
		expect(
			await scopeUserIdsToSession({ user: { id: '3', role: 'AGENTE' } }, [1, 2])
		).toEqual([1, 2])
		expect(
			await scopeUserIdsToSession({ user: { id: '3', role: 'ADMIN' } }, [5])
		).toEqual([5])
		expect(await scopeUserIdsToSession({ user: { id: '3' } }, [5])).toEqual([5])
	})
})
