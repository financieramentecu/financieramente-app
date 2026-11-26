import { describe, expect, it } from 'vitest'
import { readPoolOptionsFromEnv, withPoolParams } from '../prisma-pool'

const BASE_URL = 'postgresql://app_user:p%40ss%2Fw0rd@postgres:5432/financieramente_prod'

describe('withPoolParams', () => {
	it('adds connection_limit and pool_timeout when the URL has no query string', () => {
		const result = withPoolParams(BASE_URL, {
			connectionLimit: 15,
			poolTimeoutSeconds: 20,
		})

		expect(result).toBe(`${BASE_URL}?connection_limit=15&pool_timeout=20`)
	})

	it('appends with & when the URL already has a query string', () => {
		const result = withPoolParams(`${BASE_URL}?schema=public`, {
			connectionLimit: 15,
		})

		expect(result).toBe(`${BASE_URL}?schema=public&connection_limit=15`)
	})

	it('never overrides parameters already present in the URL', () => {
		const url = `${BASE_URL}?connection_limit=3&pool_timeout=5`

		const result = withPoolParams(url, {
			connectionLimit: 15,
			poolTimeoutSeconds: 20,
		})

		expect(result).toBe(url)
	})

	it('returns the URL untouched when no option is provided', () => {
		expect(withPoolParams(BASE_URL, {})).toBe(BASE_URL)
	})

	it('ignores non-positive or non-integer values', () => {
		const result = withPoolParams(BASE_URL, {
			connectionLimit: 0,
			poolTimeoutSeconds: -1,
			connectTimeoutSeconds: 2.5,
		})

		expect(result).toBe(BASE_URL)
	})

	it('keeps the encoded credentials byte-for-byte', () => {
		const result = withPoolParams(BASE_URL, { connectionLimit: 10 })

		expect(result.startsWith('postgresql://app_user:p%40ss%2Fw0rd@postgres:5432/')).toBe(true)
	})

	it('returns undefined when there is no URL', () => {
		expect(withPoolParams(undefined, { connectionLimit: 10 })).toBeUndefined()
	})
})

describe('readPoolOptionsFromEnv', () => {
	it('reads the three optional variables as integers', () => {
		const options = readPoolOptionsFromEnv({
			PRISMA_CONNECTION_LIMIT: '15',
			PRISMA_POOL_TIMEOUT: '20',
			PRISMA_CONNECT_TIMEOUT: '10',
		})

		expect(options).toEqual({
			connectionLimit: 15,
			poolTimeoutSeconds: 20,
			connectTimeoutSeconds: 10,
		})
	})

	it('omits unset or invalid variables', () => {
		const options = readPoolOptionsFromEnv({
			PRISMA_CONNECTION_LIMIT: 'abc',
			PRISMA_POOL_TIMEOUT: '',
		})

		expect(options).toEqual({})
	})
})
