import { describe, it, expect } from 'vitest'
import {
	getTrustedClientIp,
	resolveTrustedClientIp,
	UNKNOWN_CLIENT_IP,
} from '../trusted-client-ip'
import { getClientIp } from '../audit-logger'

function headersOf(init: Record<string, string>): Headers {
	return new Headers(init)
}

describe('getTrustedClientIp', () => {
	it('prefers x-real-ip (set by nginx from $remote_addr)', () => {
		const headers = headersOf({
			'x-real-ip': '203.0.113.7',
			'x-forwarded-for': '1.2.3.4, 203.0.113.7',
		})
		expect(getTrustedClientIp(headers)).toBe('203.0.113.7')
	})

	it('falls back to the LAST x-forwarded-for hop when x-real-ip is missing', () => {
		const headers = headersOf({
			'x-forwarded-for': '1.2.3.4, 5.6.7.8, 203.0.113.9',
		})
		expect(getTrustedClientIp(headers)).toBe('203.0.113.9')
	})

	it('ignores spoofed leading x-forwarded-for entries', () => {
		const a = headersOf({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' })
		const b = headersOf({ 'x-forwarded-for': '7.7.7.7, 8.8.8.8, 203.0.113.9' })
		expect(getTrustedClientIp(a)).toBe(getTrustedClientIp(b))
	})

	it('ignores spoofed x-forwarded-for when x-real-ip is present', () => {
		const a = headersOf({
			'x-real-ip': '203.0.113.7',
			'x-forwarded-for': '6.6.6.6',
		})
		const b = headersOf({
			'x-real-ip': '203.0.113.7',
			'x-forwarded-for': '9.9.9.9',
		})
		expect(getTrustedClientIp(a)).toBe(getTrustedClientIp(b))
	})

	it('trims whitespace and skips empty trailing entries', () => {
		expect(
			getTrustedClientIp(
				headersOf({ 'x-forwarded-for': '1.1.1.1,  2.2.2.2  ,' })
			)
		).toBe('2.2.2.2')
	})

	it('shares one constant bucket when no header is present', () => {
		expect(getTrustedClientIp(headersOf({}))).toBe(UNKNOWN_CLIENT_IP)
		expect(getTrustedClientIp(headersOf({ 'x-real-ip': '  ' }))).toBe(
			UNKNOWN_CLIENT_IP
		)
		expect(getTrustedClientIp(headersOf({ 'x-forwarded-for': ' , ' }))).toBe(
			UNKNOWN_CLIENT_IP
		)
	})
})

describe('resolveTrustedClientIp', () => {
	it('returns undefined when no trusted source exists', () => {
		expect(resolveTrustedClientIp(headersOf({}))).toBeUndefined()
	})
})

describe('audit getClientIp', () => {
	it('uses the trusted source, not the attacker-controlled first hop', () => {
		expect(
			getClientIp(headersOf({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' }))
		).toBe('203.0.113.9')
		expect(
			getClientIp(
				headersOf({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '6.6.6.6' })
			)
		).toBe('203.0.113.7')
		expect(getClientIp(headersOf({}))).toBeUndefined()
	})
})
