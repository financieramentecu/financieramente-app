import { describe, it, expect } from 'vitest'

import {
	UserRole,
	isValidRole,
	isBusinessOwnerRole,
	getRoleName,
	ROLE_NAMES,
	ROLE_DESCRIPTIONS,
} from '../roles'

describe('UserRole.PARTNER', () => {
	it('is a valid role with the PARTNER code', () => {
		expect(UserRole.PARTNER).toBe('PARTNER')
		expect(isValidRole('PARTNER')).toBe(true)
	})

	it('has a display name and description', () => {
		expect(getRoleName(UserRole.PARTNER)).toBe('Partner Externo')
		expect(ROLE_NAMES[UserRole.PARTNER]).toBeTruthy()
		expect(ROLE_DESCRIPTIONS[UserRole.PARTNER]).toBeTruthy()
	})


})

describe('isBusinessOwnerRole', () => {
	it.each([UserRole.AGENTE, UserRole.PARTNER])('returns true for %s', (role) => {
		expect(isBusinessOwnerRole(role)).toBe(true)
	})

	it.each([
		UserRole.ADMIN,
		UserRole.SIN_ROL,
		UserRole.ASISTENTE_GERENCIA_OPERATIVA,
		UserRole.ANALISTA_SOPORTE,
		UserRole.CONSULTOR,
		'UNKNOWN_ROLE',
		'',
		undefined,
		null,
	])('returns false for %s', (role) => {
		expect(isBusinessOwnerRole(role)).toBe(false)
	})
})
