import { describe, expect, it } from 'vitest'
import {
	CRM_REPORT_DEFAULT_DAYS,
	parseCrmReportQuery,
} from '@/features/leads/reports/crm-report-query.schema'

// 2026-11-10 03:00 UTC is still 2026-11-09 in Bogotá.
const NOW = new Date('2026-11-10T03:00:00Z')

function parse(search: string) {
	return parseCrmReportQuery(new URLSearchParams(search), NOW)
}

describe('parseCrmReportQuery', () => {
	it('defaults to the last 90 Bogotá days ending today', () => {
		expect(CRM_REPORT_DEFAULT_DAYS).toBe(90)
		expect(parse('')).toEqual({ ok: true, query: { from: '2026-08-12', to: '2026-11-09', ownerIds: [] } })
	})

	it('accepts an explicit range and repeated owners', () => {
		expect(parse('from=2026-01-01&to=2026-03-31&owner=4&owner=9&owner=4')).toEqual({
			ok: true,
			query: { from: '2026-01-01', to: '2026-03-31', ownerIds: [4, 9] },
		})
	})

	it.each([
		['from=2026-01-01', 'single bound'],
		['to=2026-01-01', 'single bound'],
		['from=2026-13-01&to=2026-12-31', 'malformed'],
		['from=2026-02-30&to=2026-03-01', 'impossible day'],
		['from=2026-03-02&to=2026-03-01', 'reversed'],
		['from=2025-01-01&to=2026-01-03', 'too long'],
		['owner=abc', 'bad owner'],
		['owner=0', 'non positive owner'],
	])('rejects %s (%s)', (search) => {
		expect(parse(search).ok).toBe(false)
	})

	it('accepts a span of exactly 366 days', () => {
		expect(parse('from=2024-01-01&to=2024-12-31').ok).toBe(true)
	})

	it('rejects more than 50 owners', () => {
		const owners = Array.from({ length: 51 }, (_, index) => `owner=${index + 1}`).join('&')
		expect(parse(owners).ok).toBe(false)
	})
})
