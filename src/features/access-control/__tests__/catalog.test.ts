import { describe, it, expect } from 'vitest'
import {
	PERMISSION_CATALOG,
	PERMISSION_CODES,
} from '../catalog/permissions.catalog'
import { DEFAULT_ROLE_GRANTS } from '../catalog/default-role-grants'

const ROLE_CODES = [
	'ADMIN',
	'ASISTENTE_GERENCIA_OPERATIVA',
	'ANALISTA_SOPORTE',
	'AGENTE',
	'CONSULTOR',
	'PARTNER',
	'SIN_ROL',
]

describe('permission catalog', () => {
	it('has unique permission codes', () => {
		const codes = PERMISSION_CATALOG.map((p) => p.code)
		expect(new Set(codes).size).toBe(codes.length)
	})

	it('only offers a minimum level on permissions that support it', () => {
		const withMinLevel = PERMISSION_CATALOG.filter((p) => p.supportsMinLevel)
		expect(withMinLevel.map((p) => p.code)).toEqual(['negocios.exportar'])
	})
})

describe('default role grants', () => {
	it('defines grants for every system role', () => {
		expect(Object.keys(DEFAULT_ROLE_GRANTS).sort()).toEqual([...ROLE_CODES].sort())
	})

	it('only references permissions that exist in the catalog', () => {
		for (const grants of Object.values(DEFAULT_ROLE_GRANTS)) {
			for (const code of Object.keys(grants)) {
				expect(PERMISSION_CODES.has(code)).toBe(true)
			}
		}
	})

	it('only sets a scope on permissions that support scope', () => {
		const scoped = new Set(
			PERMISSION_CATALOG.filter((p) => p.supportsScope).map((p) => p.code)
		)
		for (const grants of Object.values(DEFAULT_ROLE_GRANTS)) {
			for (const [code, grant] of Object.entries(grants)) {
				if (grant.scope) expect(scoped.has(code)).toBe(true)
			}
		}
	})

	it('S7: ADMIN has every permission, with COMPANY scope when it supports scope', () => {
		const admin = DEFAULT_ROLE_GRANTS.ADMIN
		for (const permission of PERMISSION_CATALOG) {
			const grant = admin[permission.code]
			expect(grant, permission.code).toBeDefined()
			if (permission.supportsScope) expect(grant.scope).toBe('COMPANY')
		}
	})

	it('S8: SIN_ROL has no permissions', () => {
		expect(Object.keys(DEFAULT_ROLE_GRANTS.SIN_ROL)).toEqual([])
	})

	it('S3: ANALISTA_SOPORTE sees company-wide businesses', () => {
		expect(DEFAULT_ROLE_GRANTS.ANALISTA_SOPORTE['negocios.ver']?.scope).toBe(
			'COMPANY'
		)
	})

	it('S4: ANALISTA_SOPORTE can fund aportes but cannot view them', () => {
		const grants = DEFAULT_ROLE_GRANTS.ANALISTA_SOPORTE
		expect(grants['aportes.fondear']).toBeDefined()
		expect(grants['aportes.ver']).toBeUndefined()
	})

	it('S5: ANALISTA_SOPORTE cannot liquidate by default', () => {
		expect(
			DEFAULT_ROLE_GRANTS.ANALISTA_SOPORTE['liquidacion.liquidar']
		).toBeUndefined()
	})

	it('S6: ASISTENTE has no bulk load nor configuration/admin permissions by default', () => {
		const grants = DEFAULT_ROLE_GRANTS.ASISTENTE_GERENCIA_OPERATIVA
		const adminOnly = PERMISSION_CATALOG.filter((p) =>
			/^(carga\.masiva|configuracion\.|usuarios\.|partners\.|roles\.)/.test(p.code)
		)
		expect(adminOnly.length).toBeGreaterThan(0)
		for (const permission of adminOnly) {
			expect(grants[permission.code], permission.code).toBeUndefined()
		}
	})

	it('S9: AGENTE exports the business list from LEVEL_2 within their team', () => {
		expect(DEFAULT_ROLE_GRANTS.AGENTE['negocios.exportar']).toEqual({
			scope: 'TEAM',
			minLevelCode: 'LEVEL_2',
		})
	})
})
