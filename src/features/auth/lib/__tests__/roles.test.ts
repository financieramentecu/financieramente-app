import { describe, it, expect } from 'vitest'

import {
	UserRole,
	canViewPayments,
	canFundPayments,
	canDeleteBusinessComprobante,
	isReadOnlyRole,
	isWriteBypassRole,
	isGlobalVisibilityRole,
	isValidRole,
	isBusinessOwnerRole,
	getRoleName,
	ROLE_NAMES,
	ROLE_DESCRIPTIONS,
} from '../roles'

describe('canViewPayments', () => {
	it('returns true for ADMIN', () => {
		expect(canViewPayments(UserRole.ADMIN)).toBe(true)
	})

	it('returns true for ASISTENTE_GERENCIA_OPERATIVA', () => {
		expect(canViewPayments(UserRole.ASISTENTE_GERENCIA_OPERATIVA)).toBe(true)
	})

	it('returns true for AGENTE', () => {
		expect(canViewPayments(UserRole.AGENTE)).toBe(true)
	})

	it('returns false for ANALISTA_SOPORTE', () => {
		expect(canViewPayments(UserRole.ANALISTA_SOPORTE)).toBe(false)
	})

	it('returns false for DEFAULT', () => {
		expect(canViewPayments(UserRole.DEFAULT)).toBe(false)
	})

	it('returns false for undefined', () => {
		expect(canViewPayments(undefined)).toBe(false)
	})

	it('returns false for empty string', () => {
		expect(canViewPayments('')).toBe(false)
	})

	it('returns false for unknown role string', () => {
		expect(canViewPayments('UNKNOWN_ROLE')).toBe(false)
	})
})

describe('canFundPayments', () => {
	it('returns true for ADMIN', () => {
		expect(canFundPayments(UserRole.ADMIN)).toBe(true)
	})

	it('returns true for ASISTENTE_GERENCIA_OPERATIVA', () => {
		expect(canFundPayments(UserRole.ASISTENTE_GERENCIA_OPERATIVA)).toBe(true)
	})

	it('returns false for AGENTE (Coach cannot fund payments)', () => {
		expect(canFundPayments(UserRole.AGENTE)).toBe(false)
	})

	it('returns true for ANALISTA_SOPORTE', () => {
		expect(canFundPayments(UserRole.ANALISTA_SOPORTE)).toBe(true)
	})

	it('returns false for DEFAULT', () => {
		expect(canFundPayments(UserRole.DEFAULT)).toBe(false)
	})

	it('returns false for undefined', () => {
		expect(canFundPayments(undefined)).toBe(false)
	})

	it('returns false for empty string', () => {
		expect(canFundPayments('')).toBe(false)
	})

	it('returns false for unknown role string', () => {
		expect(canFundPayments('UNKNOWN_ROLE')).toBe(false)
	})
})

describe('canDeleteBusinessComprobante', () => {
	it('returns true for ADMIN', () => {
		expect(canDeleteBusinessComprobante(UserRole.ADMIN)).toBe(true)
	})

	it('returns true for ASISTENTE_GERENCIA_OPERATIVA', () => {
		expect(
			canDeleteBusinessComprobante(UserRole.ASISTENTE_GERENCIA_OPERATIVA)
		).toBe(true)
	})

	it('returns true for ANALISTA_SOPORTE', () => {
		expect(canDeleteBusinessComprobante(UserRole.ANALISTA_SOPORTE)).toBe(true)
	})

	it('returns true for AGENTE (Money Strategist)', () => {
		expect(canDeleteBusinessComprobante(UserRole.AGENTE)).toBe(true)
	})

	it('returns false for DEFAULT', () => {
		expect(canDeleteBusinessComprobante(UserRole.DEFAULT)).toBe(false)
	})

	it('returns false for undefined', () => {
		expect(canDeleteBusinessComprobante(undefined)).toBe(false)
	})

	it('returns false for empty string', () => {
		expect(canDeleteBusinessComprobante('')).toBe(false)
	})

	it('returns false for unknown role string', () => {
		expect(canDeleteBusinessComprobante('UNKNOWN_ROLE')).toBe(false)
	})
})

describe.each([
	{
		role: UserRole.ADMIN,
		readOnly: false,
		writeBypass: true,
		globalVisibility: true,
	},
	{
		role: UserRole.ASISTENTE_GERENCIA_OPERATIVA,
		readOnly: false,
		writeBypass: true,
		globalVisibility: true,
	},
	{
		role: UserRole.ANALISTA_SOPORTE,
		readOnly: false,
		writeBypass: true,
		globalVisibility: true,
	},
	{
		role: UserRole.AGENTE,
		readOnly: false,
		writeBypass: false,
		globalVisibility: false,
	},
	{
		role: UserRole.DEFAULT,
		readOnly: false,
		writeBypass: false,
		globalVisibility: false,
	},
	{
		role: UserRole.CONSULTOR,
		readOnly: true,
		writeBypass: false,
		globalVisibility: true,
	},
])('read-only / write-bypass / global-visibility predicates for $role', (tc) => {
	it(`isReadOnlyRole(${tc.role}) === ${tc.readOnly}`, () => {
		expect(isReadOnlyRole(tc.role)).toBe(tc.readOnly)
	})

	it(`isWriteBypassRole(${tc.role}) === ${tc.writeBypass}`, () => {
		expect(isWriteBypassRole(tc.role)).toBe(tc.writeBypass)
	})

	it(`isGlobalVisibilityRole(${tc.role}) === ${tc.globalVisibility}`, () => {
		expect(isGlobalVisibilityRole(tc.role)).toBe(tc.globalVisibility)
	})
})

describe('read-only / write-bypass / global-visibility predicates edge cases', () => {
	it('isReadOnlyRole returns false for undefined', () => {
		expect(isReadOnlyRole(undefined)).toBe(false)
	})

	it('isReadOnlyRole returns false for null', () => {
		expect(isReadOnlyRole(null)).toBe(false)
	})

	it('isWriteBypassRole returns false for unknown role string', () => {
		expect(isWriteBypassRole('UNKNOWN_ROLE')).toBe(false)
	})

	it('isGlobalVisibilityRole returns false for empty string', () => {
		expect(isGlobalVisibilityRole('')).toBe(false)
	})
})

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

	it('is neither write-bypass, read-only nor global visibility', () => {
		expect(isWriteBypassRole(UserRole.PARTNER)).toBe(false)
		expect(isReadOnlyRole(UserRole.PARTNER)).toBe(false)
		expect(isGlobalVisibilityRole(UserRole.PARTNER)).toBe(false)
	})

	it('cannot fund payments but may delete comprobantes (product-owner decision 2026-10-11)', () => {
		expect(canFundPayments(UserRole.PARTNER)).toBe(false)
		expect(canDeleteBusinessComprobante(UserRole.PARTNER)).toBe(true)
	})
})

describe('isBusinessOwnerRole', () => {
	it.each([UserRole.AGENTE, UserRole.PARTNER])('returns true for %s', (role) => {
		expect(isBusinessOwnerRole(role)).toBe(true)
	})

	it.each([
		UserRole.ADMIN,
		UserRole.DEFAULT,
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
