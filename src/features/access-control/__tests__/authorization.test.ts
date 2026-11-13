import { describe, it, expect } from 'vitest'
import {
	can,
	getScope,
	meetsMinLevel,
	canWithLevel,
	isOwnerScope,
} from '../lib/authorization'
import { buildLevelOrder } from '../lib/level-order'
import type { RoleGrants } from '../types/access-control.types'

const LEVELS = [
	{ code: 'LEVEL_0', nextCode: 'LEVEL_1' },
	{ code: 'LEVEL_1', nextCode: 'LEVEL_2' },
	{ code: 'LEVEL_2', nextCode: 'LEVEL_3' },
	{ code: 'LEVEL_3', nextCode: null },
	{ code: 'PARTNER_EXTERNAL', nextCode: null },
]

describe('buildLevelOrder', () => {
	it('orders levels from lowest to highest following the chain', () => {
		expect(buildLevelOrder(LEVELS)).toEqual([
			'LEVEL_0',
			'LEVEL_1',
			'LEVEL_2',
			'LEVEL_3',
		])
	})

	it('leaves out levels that are outside the chain (PARTNER_EXTERNAL)', () => {
		expect(buildLevelOrder(LEVELS)).not.toContain('PARTNER_EXTERNAL')
	})

	it('does not loop forever on a cyclic chain', () => {
		const cyclic = [
			{ code: 'A', nextCode: 'B' },
			{ code: 'B', nextCode: 'A' },
		]
		expect(() => buildLevelOrder(cyclic)).not.toThrow()
	})
})

describe('can / getScope', () => {
	const grants: RoleGrants = {
		'negocios.ver': { scope: 'TEAM' },
		'aportes.fondear': {},
	}

	it('grants only what the role has', () => {
		expect(can(grants, 'negocios.ver')).toBe(true)
		expect(can(grants, 'aportes.fondear')).toBe(true)
		expect(can(grants, 'liquidacion.liquidar')).toBe(false)
	})

	it('fails closed on missing grants or unknown permissions', () => {
		expect(can(undefined, 'negocios.ver')).toBe(false)
		expect(can({}, 'negocios.ver')).toBe(false)
	})

	it('returns the scope only when the permission is granted and has one', () => {
		expect(getScope(grants, 'negocios.ver')).toBe('TEAM')
		expect(getScope(grants, 'aportes.fondear')).toBeUndefined()
		expect(getScope(grants, 'liquidacion.liquidar')).toBeUndefined()
	})
})

describe('meetsMinLevel', () => {
	const order = buildLevelOrder(LEVELS)

	it('passes when the grant has no minimum level', () => {
		expect(meetsMinLevel({}, undefined, order)).toBe(true)
	})

	it('passes at the minimum level and above', () => {
		const grant = { minLevelCode: 'LEVEL_2' }
		expect(meetsMinLevel(grant, 'LEVEL_2', order)).toBe(true)
		expect(meetsMinLevel(grant, 'LEVEL_3', order)).toBe(true)
	})

	it('fails below the minimum level', () => {
		expect(meetsMinLevel({ minLevelCode: 'LEVEL_2' }, 'LEVEL_1', order)).toBe(false)
	})

	it('fails when the user has no level, an unknown level or PARTNER_EXTERNAL', () => {
		const grant = { minLevelCode: 'LEVEL_2' }
		expect(meetsMinLevel(grant, undefined, order)).toBe(false)
		expect(meetsMinLevel(grant, null, order)).toBe(false)
		expect(meetsMinLevel(grant, 'PARTNER_EXTERNAL', order)).toBe(false)
		expect(meetsMinLevel(grant, 'NOPE', order)).toBe(false)
	})

	it('fails closed when the minimum level itself is not in the chain', () => {
		expect(meetsMinLevel({ minLevelCode: 'GONE' }, 'LEVEL_3', order)).toBe(false)
	})
})

describe('canWithLevel', () => {
	const order = buildLevelOrder(LEVELS)
	const grants: RoleGrants = {
		'negocios.exportar': { scope: 'TEAM', minLevelCode: 'LEVEL_2' },
	}

	it('requires both the permission and the minimum level', () => {
		expect(canWithLevel(grants, 'negocios.exportar', 'LEVEL_2', order)).toBe(true)
		expect(canWithLevel(grants, 'negocios.exportar', 'LEVEL_1', order)).toBe(false)
		expect(canWithLevel(grants, 'negocios.ver', 'LEVEL_3', order)).toBe(false)
	})
})

describe('isOwnerScope', () => {
	it('is true only for OWN and TEAM', () => {
		expect(isOwnerScope('OWN')).toBe(true)
		expect(isOwnerScope('TEAM')).toBe(true)
		expect(isOwnerScope('COMPANY')).toBe(false)
		expect(isOwnerScope(undefined)).toBe(false)
	})
})
