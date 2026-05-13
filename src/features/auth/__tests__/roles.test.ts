import { describe, it, expect } from 'vitest'
import {
	UserRole,
	canEditContractWhenBusinessEmitido,
} from '@/features/auth/lib/roles'

describe('canEditContractWhenBusinessEmitido', () => {
	it('returns true for ADMIN', () => {
		expect(canEditContractWhenBusinessEmitido(UserRole.ADMIN)).toBe(true)
	})

	it('returns true for ASISTENTE_GERENCIA_OPERATIVA', () => {
		expect(
			canEditContractWhenBusinessEmitido(
				UserRole.ASISTENTE_GERENCIA_OPERATIVA
			)
		).toBe(true)
	})

	it('returns false for AGENTE', () => {
		expect(canEditContractWhenBusinessEmitido(UserRole.AGENTE)).toBe(false)
	})

	it('returns true for ANALISTA_SOPORTE', () => {
		expect(
			canEditContractWhenBusinessEmitido(UserRole.ANALISTA_SOPORTE)
		).toBe(true)
	})

	it('returns false for DEFAULT', () => {
		expect(canEditContractWhenBusinessEmitido(UserRole.DEFAULT)).toBe(false)
	})

	it('returns false for undefined', () => {
		expect(canEditContractWhenBusinessEmitido(undefined)).toBe(false)
	})

	it('returns false for empty string', () => {
		expect(canEditContractWhenBusinessEmitido('')).toBe(false)
	})

	it('returns false for invalid role string', () => {
		expect(canEditContractWhenBusinessEmitido('NOT_A_ROLE')).toBe(false)
	})
})
