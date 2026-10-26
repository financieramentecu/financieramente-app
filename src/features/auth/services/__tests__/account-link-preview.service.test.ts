import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../account-activation.service', () => ({
	peekToken: vi.fn(),
}))

import { peekToken } from '../account-activation.service'
import { resolveAccountLinkValidity } from '../account-link-preview.service'
import { resetAccountRateLimiters } from '../../lib/account-rate-limiters'

beforeEach(() => {
	vi.clearAllMocks()
	resetAccountRateLimiters()
})

describe('resolveAccountLinkValidity', () => {
	it('is false without touching the database when the token is missing', async () => {
		expect(
			await resolveAccountLinkValidity({
				scope: 'activate',
				rawToken: null,
				clientIp: '203.0.113.1',
			})
		).toBe(false)
		expect(peekToken).not.toHaveBeenCalled()
	})

	it.each([
		['activate', 'ACTIVATION'],
		['reset-password', 'RESET'],
	] as const)('peeks a %s link with token type %s', async (scope, type) => {
		vi.mocked(peekToken).mockResolvedValueOnce(true)
		expect(
			await resolveAccountLinkValidity({
				scope,
				rawToken: 'raw',
				clientIp: '203.0.113.1',
			})
		).toBe(true)
		expect(peekToken).toHaveBeenCalledWith({ rawToken: 'raw', type })
	})

	it('is false when the link is closed', async () => {
		vi.mocked(peekToken).mockResolvedValueOnce(false)
		expect(
			await resolveAccountLinkValidity({
				scope: 'reset-password',
				rawToken: 'raw',
				clientIp: '203.0.113.1',
			})
		).toBe(false)
	})

	it('[TM] is rate limited per IP and scope: the 21st lookup is not sent to the database', async () => {
		vi.mocked(peekToken).mockResolvedValue(true)
		const input = {
			scope: 'activate',
			rawToken: 'raw',
			clientIp: '203.0.113.1',
		} as const
		for (let index = 0; index < 20; index++) {
			expect(await resolveAccountLinkValidity(input)).toBe(true)
		}
		expect(await resolveAccountLinkValidity(input)).toBe(false)
		expect(peekToken).toHaveBeenCalledTimes(20)
		// Another scope and another IP keep their own budget.
		expect(
			await resolveAccountLinkValidity({ ...input, scope: 'reset-password' })
		).toBe(true)
		expect(
			await resolveAccountLinkValidity({ ...input, clientIp: '203.0.113.2' })
		).toBe(true)
	})
})
