import { describe, it, expect, beforeEach } from 'vitest'
import {
	CREDENTIALS_EMAIL_LIMIT,
	CREDENTIALS_IP_LIMIT,
	checkCredentialsAttempt,
	resetCredentialsRateLimiters,
} from '../credentials-rate-limiter'

beforeEach(() => resetCredentialsRateLimiters())

describe('credentials login rate limiter [TM] (F26)', () => {
	it('uses sensible constants: 10 per email, 30 per IP', () => {
		expect(CREDENTIALS_EMAIL_LIMIT).toBe(10)
		expect(CREDENTIALS_IP_LIMIT).toBe(30)
	})

	it('blocks attempt N+1 for the same email, whatever IP it comes from', () => {
		for (let i = 0; i < CREDENTIALS_EMAIL_LIMIT; i++) {
			expect(
				checkCredentialsAttempt({
					email: 'ana@example.com',
					clientIp: `10.0.0.${i}`,
				}).allowed
			).toBe(true)
		}
		expect(
			checkCredentialsAttempt({
				email: 'ana@example.com',
				clientIp: '10.9.9.9',
			}).allowed
		).toBe(false)
	})

	it('behaves identically for an existing and a non-existing email (no oracle)', () => {
		function run(email: string) {
			resetCredentialsRateLimiters()
			return Array.from(
				{ length: CREDENTIALS_EMAIL_LIMIT + 2 },
				(_, i) =>
					checkCredentialsAttempt({ email, clientIp: `10.1.0.${i}` }).allowed
			)
		}
		expect(run('exists@example.com')).toEqual(run('ghost@example.com'))
	})

	it('normalizes the email (case and surrounding whitespace share one bucket)', () => {
		const variants = ['A@x.com', 'a@X.COM', ' a@x.com ']
		let blocked = false
		for (let i = 0; i < CREDENTIALS_EMAIL_LIMIT + 1; i++) {
			const result = checkCredentialsAttempt({
				email: variants[i % variants.length],
				clientIp: `10.2.0.${i}`,
			})
			blocked = !result.allowed
		}
		expect(blocked).toBe(true)
	})

	it('blocks one IP that tries many different emails', () => {
		for (let i = 0; i < CREDENTIALS_IP_LIMIT; i++) {
			expect(
				checkCredentialsAttempt({
					email: `user${i}@example.com`,
					clientIp: '203.0.113.5',
				}).allowed
			).toBe(true)
		}
		expect(
			checkCredentialsAttempt({
				email: 'another@example.com',
				clientIp: '203.0.113.5',
			}).allowed
		).toBe(false)
		// A different IP is unaffected.
		expect(
			checkCredentialsAttempt({
				email: 'another@example.com',
				clientIp: '203.0.113.6',
			}).allowed
		).toBe(true)
	})

	it('does not count an email attempt that the IP limiter already blocked', () => {
		for (let i = 0; i < CREDENTIALS_IP_LIMIT; i++) {
			checkCredentialsAttempt({
				email: `u${i}@example.com`,
				clientIp: '203.0.113.7',
			})
		}
		for (let i = 0; i < 5; i++) {
			expect(
				checkCredentialsAttempt({
					email: 'victim@example.com',
					clientIp: '203.0.113.7',
				}).allowed
			).toBe(false)
		}
		// The victim can still log in from elsewhere: blocked attempts did not burn its budget.
		for (let i = 0; i < CREDENTIALS_EMAIL_LIMIT; i++) {
			expect(
				checkCredentialsAttempt({
					email: 'victim@example.com',
					clientIp: `198.51.100.${i}`,
				}).allowed
			).toBe(true)
		}
	})

	it('reports retryAfterSeconds when blocked', () => {
		for (let i = 0; i < CREDENTIALS_EMAIL_LIMIT; i++) {
			checkCredentialsAttempt({
				email: 'r@example.com',
				clientIp: `10.3.0.${i}`,
			})
		}
		const blocked = checkCredentialsAttempt({
			email: 'r@example.com',
			clientIp: '10.3.9.9',
		})
		expect(blocked.allowed).toBe(false)
		expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1)
	})
})
