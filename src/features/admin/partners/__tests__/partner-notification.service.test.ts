import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/features/email/lib/partner-activation-notification', () => ({
	sendPartnerActivationEmail: vi.fn(),
}))

import { sendPartnerActivationEmail } from '@/features/email/lib/partner-activation-notification'
import { sendPartnerActivationLink } from '../services/partner-notification.service'
import { deliverActivationLink } from '../services/partner-delivery'

beforeEach(() => {
	vi.clearAllMocks()
	vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('sendPartnerActivationLink', () => {
	it('passes name, email and the raw token to the activation e-mail builder', async () => {
		vi.mocked(sendPartnerActivationEmail).mockResolvedValue({ success: true })
		const sent = await sendPartnerActivationLink(
			{ name: 'Ana', email: 'ana@p.com' },
			'RAW'
		)
		expect(sent).toBe(true)
		expect(sendPartnerActivationEmail).toHaveBeenCalledWith({
			userName: 'Ana',
			userEmail: 'ana@p.com',
			rawToken: 'RAW',
		})
	})

	it('returns false when delivery reports failure', async () => {
		vi.mocked(sendPartnerActivationEmail).mockResolvedValue({
			success: false,
			error: 'x',
		})
		expect(
			await sendPartnerActivationLink({ name: 'A', email: 'a@p.com' }, 'RAW')
		).toBe(false)
	})

	it('returns false (never throws) and never logs the token', async () => {
		vi.mocked(sendPartnerActivationEmail).mockRejectedValue(
			new Error('RAW boom')
		)
		expect(
			await sendPartnerActivationLink({ name: 'A', email: 'a@p.com' }, 'RAW')
		).toBe(false)
		for (const call of vi.mocked(console.error).mock.calls) {
			expect(JSON.stringify(call)).not.toContain('RAW')
		}
	})
})

describe('deliverActivationLink', () => {
	it('returns the sender result when delivery works', async () => {
		vi.mocked(sendPartnerActivationEmail).mockResolvedValue({ success: true })
		expect(
			await deliverActivationLink({ name: 'A', email: 'a@p.com' }, 'RAW')
		).toBe(true)
	})
})
