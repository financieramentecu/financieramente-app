import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/headers', () => ({
	headers: vi.fn(),
}))
vi.mock('@/features/auth/services/account-link-preview.service', () => ({
	resolveAccountLinkValidity: vi.fn(),
}))
vi.mock('@/features/auth/components/account/set-password-screen', () => ({
	SetPasswordScreen: () => null,
}))

import { headers } from 'next/headers'
import Page, { metadata } from '../page'
import { resolveAccountLinkValidity } from '@/features/auth/services/account-link-preview.service'

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(headers).mockResolvedValue(
		new Headers({
			'x-real-ip': '203.0.113.7',
			'x-forwarded-for': '6.6.6.6, 203.0.113.7',
		}) as never
	)
})

describe('reset-password page', () => {
	it('validates the link on the server and passes linkValid to the screen', async () => {
		vi.mocked(resolveAccountLinkValidity).mockResolvedValueOnce(true)
		const element = await Page({
			searchParams: Promise.resolve({ token: 'raw-token' }),
		})
		expect(resolveAccountLinkValidity).toHaveBeenCalledWith({
			scope: 'reset-password',
			rawToken: 'raw-token',
			clientIp: '203.0.113.7',
		})
		expect(element.props).toMatchObject({
			mode: 'reset',
			token: 'raw-token',
			linkValid: true,
		})
	})

	it('passes linkValid false for a closed link', async () => {
		vi.mocked(resolveAccountLinkValidity).mockResolvedValueOnce(false)
		const element = await Page({
			searchParams: Promise.resolve({ token: 'stale' }),
		})
		expect(element.props.linkValid).toBe(false)
	})

	it('uses the first token when the query string repeats it', async () => {
		vi.mocked(resolveAccountLinkValidity).mockResolvedValueOnce(true)
		const element = await Page({
			searchParams: Promise.resolve({ token: ['first', 'second'] }),
		})
		expect(element.props.token).toBe('first')
	})

	it('treats a missing token as an invalid link', async () => {
		vi.mocked(resolveAccountLinkValidity).mockResolvedValueOnce(false)
		const element = await Page({ searchParams: Promise.resolve({}) })
		expect(resolveAccountLinkValidity).toHaveBeenCalledWith(
			expect.objectContaining({ rawToken: null })
		)
		expect(element.props).toMatchObject({ token: null, linkValid: false })
	})

	it('does not log the token', async () => {
		const spies = [
			vi.spyOn(console, 'log'),
			vi.spyOn(console, 'error'),
			vi.spyOn(console, 'warn'),
		]
		vi.mocked(resolveAccountLinkValidity).mockResolvedValueOnce(true)
		await Page({ searchParams: Promise.resolve({ token: 'secret-token' }) })
		for (const spy of spies) {
			expect(JSON.stringify(spy.mock.calls)).not.toContain('secret-token')
			spy.mockRestore()
		}
	})

	it('keeps the page out of indexes and referrers', () => {
		expect(metadata.robots).toEqual({ index: false, follow: false })
		expect(metadata.referrer).toBe('no-referrer')
	})
})
