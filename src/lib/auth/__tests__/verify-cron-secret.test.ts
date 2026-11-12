import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyCronSecret } from '@/lib/auth/verify-cron-secret'

describe('verifyCronSecret', () => {
	afterEach(() => vi.unstubAllEnvs())

	it('accepts the exact bearer secret', () => {
		vi.stubEnv('CRON_SECRET', 's3cret')
		expect(verifyCronSecret('Bearer s3cret')).toBe(true)
	})
	it.each([null, '', 's3cret', 'Bearer wrong', 'Bearer s3cre', 'Basic s3cret'])('rejects %j', (header) => {
		vi.stubEnv('CRON_SECRET', 's3cret')
		expect(verifyCronSecret(header)).toBe(false)
	})
	it('rejects everything when no secret is configured', () => {
		vi.stubEnv('CRON_SECRET', '')
		expect(verifyCronSecret('Bearer ')).toBe(false)
	})
})
