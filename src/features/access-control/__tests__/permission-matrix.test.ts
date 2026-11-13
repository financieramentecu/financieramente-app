import { describe, it, expect } from 'vitest'
import {
	groupCatalogByModule,
	setModuleGrants,
	filterModuleGroups,
	toggleGrant,
	setScope,
	setMinLevel,
	findDependencyWarnings,
	grantsEqual,
} from '../lib/permission-matrix'
import { PERMISSION_CATALOG } from '../catalog/permissions.catalog'

const def = (code: string) => PERMISSION_CATALOG.find((p) => p.code === code)!

describe('groupCatalogByModule', () => {
	it('groups in catalog order and keeps every permission once', () => {
		const groups = groupCatalogByModule(PERMISSION_CATALOG)
		expect(groups[0].module).toBe('Dashboard')
		expect(groups.flatMap((g) => g.permissions)).toHaveLength(PERMISSION_CATALOG.length)
	})
})

describe('toggleGrant', () => {
	it('grants a scoped permission with the narrowest scope (OWN)', () => {
		expect(toggleGrant({}, def('negocios.ver'), true)).toEqual({ 'negocios.ver': { scope: 'OWN' } })
	})

	it('grants an unscoped permission with an empty grant', () => {
		expect(toggleGrant({}, def('aportes.fondear'), true)).toEqual({ 'aportes.fondear': {} })
	})

	it('removes the grant and does not mutate the input', () => {
		const grants = { 'aportes.fondear': {} }
		expect(toggleGrant(grants, def('aportes.fondear'), false)).toEqual({})
		expect(grants).toEqual({ 'aportes.fondear': {} })
	})
})

describe('setScope / setMinLevel', () => {
	it('changes the scope of a granted permission only', () => {
		expect(setScope({ 'negocios.ver': { scope: 'OWN' } }, 'negocios.ver', 'TEAM')).toEqual({
			'negocios.ver': { scope: 'TEAM' },
		})
		expect(setScope({}, 'negocios.ver', 'TEAM')).toEqual({})
	})

	it('sets and clears the minimum level keeping the scope', () => {
		const base = { 'negocios.exportar': { scope: 'TEAM' as const } }
		const withLevel = setMinLevel(base, 'negocios.exportar', 'LEVEL_2')
		expect(withLevel).toEqual({ 'negocios.exportar': { scope: 'TEAM', minLevelCode: 'LEVEL_2' } })
		expect(setMinLevel(withLevel, 'negocios.exportar', undefined)).toEqual(base)
	})
})

describe('findDependencyWarnings', () => {
	it('warns when fondear is granted without ver (S4)', () => {
		const warnings = findDependencyWarnings({ 'aportes.fondear': {} })
		expect(warnings).toEqual([
			expect.objectContaining({ code: 'aportes.fondear', requires: 'aportes.ver' }),
		])
	})

	it('has no warning when the dependency is granted or the permission is absent', () => {
		expect(findDependencyWarnings({ 'aportes.fondear': {}, 'aportes.ver': { scope: 'OWN' } })).toEqual([])
		expect(findDependencyWarnings({})).toEqual([])
	})
})

describe('grantsEqual', () => {
	it('compares ignoring key order', () => {
		expect(grantsEqual({ a: {}, b: { scope: 'OWN' } }, { b: { scope: 'OWN' }, a: {} })).toBe(true)
		expect(grantsEqual({ a: {} }, { a: { scope: 'OWN' } })).toBe(false)
		expect(grantsEqual({ a: {} }, {})).toBe(false)
	})
})

describe('setModuleGrants', () => {
	const negocios = PERMISSION_CATALOG.filter((p) => p.module === 'Negocios')

	it('enables every permission of the module, scoped ones with the narrowest scope', () => {
		const grants = setModuleGrants({}, negocios, true)
		expect(Object.keys(grants)).toHaveLength(negocios.length)
		expect(grants['negocios.ver']).toEqual({ scope: 'OWN' })
		expect(grants['negocios.crear']).toEqual({})
	})

	it('keeps the scope and level of grants that were already on', () => {
		const grants = setModuleGrants(
			{ 'negocios.exportar': { scope: 'TEAM', minLevelCode: 'LEVEL_2' } },
			negocios,
			true
		)
		expect(grants['negocios.exportar']).toEqual({ scope: 'TEAM', minLevelCode: 'LEVEL_2' })
	})

	it('removes only the module permissions and leaves the rest', () => {
		const grants = setModuleGrants(
			{ 'negocios.ver': { scope: 'OWN' }, 'leads.ver': { scope: 'OWN' } },
			negocios,
			false
		)
		expect(grants).toEqual({ 'leads.ver': { scope: 'OWN' } })
	})
})

describe('filterModuleGroups', () => {
	const groups = groupCatalogByModule(PERMISSION_CATALOG)

	it('matches by name ignoring case and accents, dropping empty modules', () => {
		const result = filterModuleGroups(groups, 'EXPORTAR', {}, false)
		expect(result.length).toBeGreaterThan(0)
		expect(result.every((g) => g.permissions.length > 0)).toBe(true)
		expect(result.flatMap((g) => g.permissions).every((p) => /exportar/i.test(p.name))).toBe(true)
		const accent = filterModuleGroups(groups, 'comision', {}, false)
		expect(accent.flatMap((g) => g.permissions).length).toBeGreaterThan(0)
	})

	it('shows only granted permissions when asked', () => {
		const result = filterModuleGroups(groups, '', { 'negocios.ver': { scope: 'OWN' } }, true)
		expect(result.flatMap((g) => g.permissions.map((p) => p.code))).toEqual(['negocios.ver'])
	})

	it('returns everything without a query or filter', () => {
		const result = filterModuleGroups(groups, '  ', {}, false)
		expect(result.flatMap((g) => g.permissions)).toHaveLength(PERMISSION_CATALOG.length)
	})
})
