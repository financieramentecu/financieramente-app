import { describe, it, expect } from 'vitest'
import {
	buildDefaultDateSeedQuery,
	getCurrentMonthRange,
	getDefaultDateParamPair,
	hasAnyDateParam,
} from '@/features/negocios/lib/default-date-filter'
import { UserRole } from '@/features/auth/lib/roles'

describe('getDefaultDateParamPair', () => {
	it('AGENTE defaults to creation date params', () => {
		expect(getDefaultDateParamPair(UserRole.AGENTE)).toEqual({
			fromKey: 'createdFrom',
			toKey: 'createdTo',
		})
	})

	it.each([
		UserRole.PARTNER,
		UserRole.ADMIN,
		UserRole.ASISTENTE_GERENCIA_OPERATIVA,
		UserRole.ANALISTA_SOPORTE,
	])('%s defaults to creation date params', (role) => {
		expect(getDefaultDateParamPair(role)).toEqual({
			fromKey: 'createdFrom',
			toKey: 'createdTo',
		})
	})

	it('returns null for roles without a default date filter', () => {
		expect(getDefaultDateParamPair(UserRole.DEFAULT)).toBeNull()
		expect(getDefaultDateParamPair(undefined)).toBeNull()
		expect(getDefaultDateParamPair('UNKNOWN_ROLE')).toBeNull()
	})
})

describe('getCurrentMonthRange', () => {
	it('returns first day of current month through today as YYYY-MM-DD (Bogota calendar day)', () => {
		const now = new Date('2026-06-10T12:00:00Z') // 07:00 Bogota, June 10
		expect(getCurrentMonthRange(now)).toEqual({
			from: '2026-06-01',
			to: '2026-06-10',
		})
	})

	it('zero-pads month and day', () => {
		const now = new Date('2026-01-05T12:00:00Z')
		expect(getCurrentMonthRange(now)).toEqual({
			from: '2026-01-01',
			to: '2026-01-05',
		})
	})

	it('handles last day of month', () => {
		const now = new Date('2026-12-31T12:00:00Z')
		expect(getCurrentMonthRange(now)).toEqual({
			from: '2026-12-01',
			to: '2026-12-31',
		})
	})

	it('uses the Bogota calendar day, not the UTC day, near the UTC midnight boundary', () => {
		// UTC 2026-06-11T02:00:00Z = Bogota 2026-06-10 21:00:00 (UTC-5)
		const now = new Date('2026-06-11T02:00:00Z')
		expect(getCurrentMonthRange(now)).toEqual({
			from: '2026-06-01',
			to: '2026-06-10',
		})
	})
})

describe('hasAnyDateParam', () => {
	it('returns false for empty params', () => {
		expect(hasAnyDateParam(new URLSearchParams())).toBe(false)
	})

	it('returns false when only non-date filters are present', () => {
		const params = new URLSearchParams()
		params.append('statuses', 'EMITIDO')
		params.set('agentName', 'John')
		expect(hasAnyDateParam(params)).toBe(false)
	})

	it('detects fondeo range (dateFrom/dateTo)', () => {
		const params = new URLSearchParams()
		params.set('dateFrom', '2026-06-01')
		params.set('dateTo', '2026-06-10')
		expect(hasAnyDateParam(params)).toBe(true)
	})

	it('detects creation range (createdFrom/createdTo)', () => {
		const params = new URLSearchParams()
		params.set('createdFrom', '2026-06-01')
		params.set('createdTo', '2026-06-10')
		expect(hasAnyDateParam(params)).toBe(true)
	})

	it('detects issued range (dateIssuedFrom/dateIssuedTo)', () => {
		const params = new URLSearchParams()
		params.set('dateIssuedFrom', '2026-06-01')
		params.set('dateIssuedTo', '2026-06-10')
		expect(hasAnyDateParam(params)).toBe(true)
	})

	it('detects a partial pair (only from) so the default never clobbers user input', () => {
		const params = new URLSearchParams()
		params.set('createdFrom', '2026-06-01')
		expect(hasAnyDateParam(params)).toBe(true)
	})

	it('ignores empty-string date params', () => {
		const params = new URLSearchParams()
		params.set('dateFrom', '')
		expect(hasAnyDateParam(params)).toBe(false)
	})
})

describe('buildDefaultDateSeedQuery', () => {
	const now = new Date('2026-03-15T17:00:00Z')

	it('seeds the current month on the role default dimension', () => {
		const query = buildDefaultDateSeedQuery(UserRole.AGENTE, {}, now)
		const params = new URLSearchParams(query ?? '')
		expect(params.get('createdFrom')).toBe('2026-03-01')
		expect(params.get('createdTo')).toBe('2026-03-15')
		expect(params.get('dateFrom')).toBeNull()
	})

	it('preserves existing non-date params, including repeated keys', () => {
		const query = buildDefaultDateSeedQuery(
			UserRole.ADMIN,
			{ statuses: ['EMITIDO', 'FONDEADO'], agentName: 'Ana', empty: undefined },
			now
		)
		const params = new URLSearchParams(query ?? '')
		expect(params.getAll('statuses')).toEqual(['EMITIDO', 'FONDEADO'])
		expect(params.get('agentName')).toBe('Ana')
		expect(params.has('empty')).toBe(false)
		expect(params.get('createdFrom')).toBe('2026-03-01')
	})

	it('returns null when the URL already carries a date filter', () => {
		expect(
			buildDefaultDateSeedQuery(
				UserRole.ADMIN,
				{ dateIssuedFrom: '2026-01-01', dateIssuedTo: '2026-01-31' },
				now
			)
		).toBeNull()
	})

	it('returns null for roles without a default date filter', () => {
		expect(buildDefaultDateSeedQuery(UserRole.DEFAULT, {}, now)).toBeNull()
		expect(buildDefaultDateSeedQuery(undefined, {}, now)).toBeNull()
	})
})
