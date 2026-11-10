import { describe, expect, it } from 'vitest'
import { parseLeadParam, resolveCrmTabs, resolveInitialCrmTab } from '@/features/leads/lib/crm-tabs'

describe('resolveCrmTabs', () => {
	it('enables Actividades only while crm_tasks is on', () => {
		const on = resolveCrmTabs((flag) => flag === 'crm_tasks')
		const off = resolveCrmTabs(() => false)
		expect(on.find((t) => t.id === 'activities')?.enabled).toBe(true)
		expect(off.find((t) => t.id === 'activities')?.enabled).toBe(false)
		expect(off.find((t) => t.id === 'pipeline')?.enabled).toBe(true)
		expect(on.find((t) => t.id === 'reports')?.enabled).toBe(false)
	})

	it('enables Reportes only while crm_reports is on', () => {
		const on = resolveCrmTabs((flag) => flag === 'crm_reports')
		expect(on.find((t) => t.id === 'reports')?.enabled).toBe(true)
		expect(resolveCrmTabs(() => false).find((t) => t.id === 'reports')?.enabled).toBe(false)
	})
})

describe('resolveInitialCrmTab', () => {
	const tabs = resolveCrmTabs(() => true)
	it('selects the tab named in the URL', () => {
		expect(resolveInitialCrmTab('actividades', tabs)).toBe('activities')
	})
	it('falls back to the pipeline for unknown or disabled tabs', () => {
		expect(resolveInitialCrmTab('otra', tabs)).toBe('pipeline')
		expect(resolveInitialCrmTab('reportes', tabs)).toBe('reports')
		expect(resolveInitialCrmTab('reportes', resolveCrmTabs(() => false))).toBe('pipeline')
		expect(resolveInitialCrmTab('actividades', resolveCrmTabs(() => false))).toBe('pipeline')
		expect(resolveInitialCrmTab(null, tabs)).toBe('pipeline')
	})
})

describe('parseLeadParam', () => {
	it.each([
		['42', 42],
		['0', null],
		['x', null],
		[null, null],
	])('%j → %j', (value, expected) => {
		expect(parseLeadParam(value)).toBe(expected)
	})
})
