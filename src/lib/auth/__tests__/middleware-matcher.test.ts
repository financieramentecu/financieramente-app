import { describe, it, expect } from 'vitest'
import { config } from '@/middleware'

describe('middleware matcher', () => {
	it('covers dashboard pages and every /api route', () => {
		expect(config.matcher).toEqual(['/dashboard/:path*', '/api/:path*'])
	})

	it('does not match public account pages or static assets', () => {
		const patterns = config.matcher.map(
			(m) => new RegExp(`^${m.replace(':path*', '.*')}$`)
		)
		for (const path of [
			'/activate-account',
			'/forgot-password',
			'/reset-password',
			'/login',
			'/_next/static/x.js',
		]) {
			expect(patterns.some((p) => p.test(path))).toBe(false)
		}
	})
})
