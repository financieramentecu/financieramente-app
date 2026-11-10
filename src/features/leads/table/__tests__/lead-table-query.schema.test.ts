import { describe, expect, it } from 'vitest'
import {
	DEFAULT_LEAD_TABLE_QUERY,
	parseLeadTableQuery,
	parseSavedLeadTableQuery,
	toLeadTableSearchParams,
} from '@/features/leads/table/lead-table-query.schema'

function parse(qs: string) {
	return parseLeadTableQuery(new URLSearchParams(qs))
}

describe('parseLeadTableQuery', () => {
	it('applies defaults when nothing is sent', () => {
		expect(parse('')).toEqual({ ok: true, query: DEFAULT_LEAD_TABLE_QUERY })
		expect(DEFAULT_LEAD_TABLE_QUERY).toMatchObject({ sort: 'createdAt', dir: 'desc', page: 1, pageSize: 25, idle: false })
	})

	it('parses repeated filters, search, range, idle, sort and paging', () => {
		const result = parse('q=%20ana%20&status=OPEN&status=WON&stage=3&owner=7&owner=8&tag=2&from=2026-11-01&to=2026-11-30&idle=1&sort=estimatedValue&dir=asc&page=3&pageSize=50')
		expect(result).toEqual({
			ok: true,
			query: {
				q: 'ana',
				statuses: ['OPEN', 'WON'],
				stageIds: [3],
				ownerIds: [7, 8],
				tagIds: [2],
				from: '2026-11-01',
				to: '2026-11-30',
				idle: true,
				sort: 'estimatedValue',
				dir: 'asc',
				page: 3,
				pageSize: 50,
			},
		})
	})

	it.each([
		['pageSize=500'],
		['pageSize=5'],
		['page=0'],
		['status=MAYBE'],
		['stage=abc'],
		['sort=password'],
		['from=2026-11-01'],
		['from=2026-12-01&to=2026-11-01'],
		['from=01/11/2026&to=2026-11-30'],
		[`q=${'x'.repeat(101)}`],
	])('rejects %s', (qs) => {
		expect(parse(qs).ok).toBe(false)
	})

	it('drops an empty search', () => {
		const result = parse('q=%20%20')
		expect(result.ok && result.query.q).toBeUndefined()
	})
})

describe('saved view query', () => {
	it('round-trips through URL params without paging', () => {
		const result = parse('q=ana&status=OPEN&tag=2&idle=1&sort=name&dir=asc&page=4')
		if (!result.ok) throw new Error('expected ok')
		const params = toLeadTableSearchParams({ ...result.query, page: 1 })
		expect(params.get('page')).toBeNull()
		expect(parse(params.toString())).toEqual({ ok: true, query: { ...result.query, page: 1 } })
	})

	it('omits defaults from URL params', () => {
		expect(toLeadTableSearchParams(DEFAULT_LEAD_TABLE_QUERY).toString()).toBe('')
	})

	it('validates a stored JSON query and strips paging', () => {
		expect(parseSavedLeadTableQuery({ statuses: ['OPEN'], sort: 'name', dir: 'asc', page: 9 })).toEqual({
			ok: true,
			query: { ...DEFAULT_LEAD_TABLE_QUERY, statuses: ['OPEN'], sort: 'name', dir: 'asc' },
		})
		expect(parseSavedLeadTableQuery({ statuses: ['NOPE'] }).ok).toBe(false)
		expect(parseSavedLeadTableQuery('x').ok).toBe(false)
	})
})
