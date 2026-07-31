import { describe, it, expect } from 'vitest'

import {
	UserRole,
	canViewPayments,
	canFundPayments,
	canDeleteBusinessComprobante,
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
