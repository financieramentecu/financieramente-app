import { describe, it, expect } from 'vitest'
import { DEFAULT_CALLBACK_URL, sanitizeCallbackUrl } from '../callback-url'

describe('sanitizeCallbackUrl [TM]', () => {
	it.each([
		['/dashboard'],
		['/dashboard/negocios?x=1'],
		['/dashboard/negocios/12#comments'],
		['/'],
		['/dashboard/calculadora?a=1&b=%2Fx'],
	])('keeps the same-origin relative path %s', (value) => {
		expect(sanitizeCallbackUrl(value)).toBe(value)
	})

	it.each([
		['absolute https URL', 'https://evil.tld'],
		['absolute http URL', 'http://evil.tld/dashboard'],
		['protocol-relative', '//evil.tld'],
		['protocol-relative with path', '//evil.tld/dashboard'],
		['slash + backslash', '/\\evil.tld'],
		['backslash first', '\\evil.tld'],
		['backslash anywhere', '/dashboard\\..\\evil'],
		['javascript scheme', 'javascript:alert(1)'],
		['javascript scheme uppercase', 'JaVaScRiPt:alert(1)'],
		['data scheme', 'data:text/html,<script>alert(1)</script>'],
		['encoded protocol-relative', '%2F%2Fevil.tld'],
		['encoded slash after the first slash', '/%2Fevil.tld'],
		['encoded backslash', '/%5Cevil.tld'],
		['double encoded', '%252F%252Fevil.tld'],
		['tab inside the slashes', '/\t/evil.tld'],
		['newline', '/dashboard\n//evil.tld'],
		['carriage return', '/\r/evil.tld'],
		['NUL byte', '/dash\u0000board'],
		['DEL char', '/dash\u007fboard'],
		['leading space', ' /dashboard'],
		['no leading slash', 'dashboard'],
		['scheme-looking relative', 'dashboard:foo'],
		['malformed percent escape', '/%E0%A4%A'],
		['empty string', ''],
		['whitespace only', '   '],
	])('falls back to /dashboard for %s', (_label, value) => {
		expect(sanitizeCallbackUrl(value)).toBe(DEFAULT_CALLBACK_URL)
	})

	it.each([[null], [undefined]])('falls back for %s', (value) => {
		expect(sanitizeCallbackUrl(value)).toBe('/dashboard')
	})

	it('exposes /dashboard as the default', () => {
		expect(DEFAULT_CALLBACK_URL).toBe('/dashboard')
	})
})
