import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/features/email/lib/email-service', () => ({
	sendEmail: vi.fn(),
}))

import { sendEmail } from '@/features/email/lib/email-service'
import {
	generatePartnerActivationHTML,
	generatePartnerActivationPlainText,
	sendPartnerActivationEmail,
} from '../partner-activation-notification'
import {
	generatePasswordResetHTML,
	generatePasswordResetPlainText,
	sendPasswordResetEmail,
} from '../password-reset-notification'

const RAW_TOKEN = 'tok_A1-b2_C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t'
const BASE_URL = 'https://app.example.com'

describe('partner activation email (AA-10)', () => {
	const params = {
		userName: 'Ana <b>Partner</b>',
		userEmail: 'ana@example.com',
		rawToken: RAW_TOKEN,
		baseUrl: BASE_URL,
	}

	it('links to /activate-account with the token and states 72 hours', () => {
		const html = generatePartnerActivationHTML(params)
		const text = generatePartnerActivationPlainText(params)
		const link = `${BASE_URL}/activate-account?token=${RAW_TOKEN}`
		expect(html).toContain(link)
		expect(text).toContain(link)
		expect(html).toContain('72 horas')
		expect(text).toContain('72 horas')
	})

	it('escapes the recipient name in HTML', () => {
		const html = generatePartnerActivationHTML(params)
		expect(html).not.toContain('<b>Partner</b>')
		expect(html).toContain('Ana &lt;b&gt;Partner&lt;/b&gt;')
	})

	it('URL-encodes tokens so they cannot break out of the link', () => {
		const html = generatePartnerActivationHTML({
			...params,
			rawToken: 'a b"c',
		})
		expect(html).toContain('token=a%20b%22c')
		expect(html).not.toContain('token=a b"c')
	})
})

describe('password reset email (AA-10)', () => {
	const params = {
		userName: 'Luis',
		userEmail: 'luis@example.com',
		rawToken: RAW_TOKEN,
		baseUrl: BASE_URL,
	}

	it('links to /reset-password with the token and states 1 hour', () => {
		const html = generatePasswordResetHTML(params)
		const text = generatePasswordResetPlainText(params)
		const link = `${BASE_URL}/reset-password?token=${RAW_TOKEN}`
		expect(html).toContain(link)
		expect(text).toContain(link)
		expect(html).toContain('1 hora')
		expect(text).toContain('1 hora')
	})

	it('escapes the recipient name in HTML', () => {
		const html = generatePasswordResetHTML({
			...params,
			userName: '<script>x</script>',
		})
		expect(html).not.toContain('<script>x</script>')
		expect(html).toContain('&lt;script&gt;')
	})
})

describe('senders', () => {
	let logSpy: ReturnType<typeof vi.spyOn>
	let errorSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubEnv('NEXTAUTH_URL', BASE_URL)
		logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		logSpy.mockRestore()
		errorSpy.mockRestore()
	})

	function loggedText(): string {
		return [...logSpy.mock.calls, ...errorSpy.mock.calls]
			.flat()
			.map((value) => String(value))
			.join('\n')
	}

	it.each([
		['activation', sendPartnerActivationEmail, '/activate-account'],
		['reset', sendPasswordResetEmail, '/reset-password'],
	] as const)(
		'%s sender uses sendEmail with the link and never logs the token on success',
		async (_name, send, path) => {
			vi.mocked(sendEmail).mockResolvedValueOnce({ success: true })
			const result = await send({
				userName: 'Ana',
				userEmail: 'ana@example.com',
				rawToken: RAW_TOKEN,
			})
			expect(result).toEqual({ success: true })
			const call = vi.mocked(sendEmail).mock.calls[0][0]
			expect(call.to).toBe('ana@example.com')
			expect(call.html).toContain(`${BASE_URL}${path}?token=${RAW_TOKEN}`)
			expect(loggedText()).not.toContain(RAW_TOKEN)
		}
	)

	it.each([
		['activation', sendPartnerActivationEmail],
		['reset', sendPasswordResetEmail],
	] as const)(
		'%s sender reports provider failure without logging the token',
		async (_name, send) => {
			vi.mocked(sendEmail).mockResolvedValueOnce({
				success: false,
				error: 'provider down',
			})
			const result = await send({
				userName: 'Ana',
				userEmail: 'ana@example.com',
				rawToken: RAW_TOKEN,
			})
			expect(result).toEqual({ success: false, error: 'provider down' })
			expect(loggedText()).not.toContain(RAW_TOKEN)
		}
	)

	it.each([
		['activation', sendPartnerActivationEmail],
		['reset', sendPasswordResetEmail],
	] as const)(
		'%s sender never throws when sendEmail throws',
		async (_n, send) => {
			vi.mocked(sendEmail).mockRejectedValueOnce(new Error(`boom ${RAW_TOKEN}`))
			const result = await send({
				userName: 'Ana',
				userEmail: 'ana@example.com',
				rawToken: RAW_TOKEN,
			})
			expect(result.success).toBe(false)
			expect(result.error).not.toContain(RAW_TOKEN)
			expect(loggedText()).not.toContain(RAW_TOKEN)
		}
	)
})
