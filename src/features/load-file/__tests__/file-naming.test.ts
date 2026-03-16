import { describe, it, expect } from 'vitest'
import { generateSyncFileName } from '../lib/file-naming'

describe('generateSyncFileName', () => {
	describe('All 12 months produce correct Spanish uppercase names', () => {
		it('month 1 → ENERO', () => {
			expect(generateSyncFileName('POLIZA', 1, 2026)).toBe(
				'SINCRONIZACION-POLIZA-ENERO-2026'
			)
		})

		it('month 2 → FEBRERO', () => {
			expect(generateSyncFileName('POLIZA', 2, 2026)).toBe(
				'SINCRONIZACION-POLIZA-FEBRERO-2026'
			)
		})

		it('month 3 → MARZO', () => {
			expect(generateSyncFileName('POLIZA', 3, 2026)).toBe(
				'SINCRONIZACION-POLIZA-MARZO-2026'
			)
		})

		it('month 4 → ABRIL', () => {
			expect(generateSyncFileName('POLIZA', 4, 2026)).toBe(
				'SINCRONIZACION-POLIZA-ABRIL-2026'
			)
		})

		it('month 5 → MAYO', () => {
			expect(generateSyncFileName('POLIZA', 5, 2026)).toBe(
				'SINCRONIZACION-POLIZA-MAYO-2026'
			)
		})

		it('month 6 → JUNIO', () => {
			expect(generateSyncFileName('POLIZA', 6, 2026)).toBe(
				'SINCRONIZACION-POLIZA-JUNIO-2026'
			)
		})

		it('month 7 → JULIO', () => {
			expect(generateSyncFileName('POLIZA', 7, 2026)).toBe(
				'SINCRONIZACION-POLIZA-JULIO-2026'
			)
		})

		it('month 8 → AGOSTO', () => {
			expect(generateSyncFileName('POLIZA', 8, 2026)).toBe(
				'SINCRONIZACION-POLIZA-AGOSTO-2026'
			)
		})

		it('month 9 → SEPTIEMBRE', () => {
			expect(generateSyncFileName('POLIZA', 9, 2026)).toBe(
				'SINCRONIZACION-POLIZA-SEPTIEMBRE-2026'
			)
		})

		it('month 10 → OCTUBRE', () => {
			expect(generateSyncFileName('POLIZA', 10, 2026)).toBe(
				'SINCRONIZACION-POLIZA-OCTUBRE-2026'
			)
		})

		it('month 11 → NOVIEMBRE', () => {
			expect(generateSyncFileName('POLIZA', 11, 2026)).toBe(
				'SINCRONIZACION-POLIZA-NOVIEMBRE-2026'
			)
		})

		it('month 12 → DICIEMBRE', () => {
			expect(generateSyncFileName('POLIZA', 12, 2026)).toBe(
				'SINCRONIZACION-POLIZA-DICIEMBRE-2026'
			)
		})
	})

	describe('Spec scenarios', () => {
		it('generateSyncFileName("POLIZA", 2, 2026) → "SINCRONIZACION-POLIZA-FEBRERO-2026"', () => {
			expect(generateSyncFileName('POLIZA', 2, 2026)).toBe(
				'SINCRONIZACION-POLIZA-FEBRERO-2026'
			)
		})

		it('generateSyncFileName("VOLUNTARIA", 12, 2025) → "SINCRONIZACION-VOLUNTARIA-DICIEMBRE-2025"', () => {
			expect(generateSyncFileName('VOLUNTARIA', 12, 2025)).toBe(
				'SINCRONIZACION-VOLUNTARIA-DICIEMBRE-2025'
			)
		})
	})

	describe('fileType is uppercased', () => {
		it('lowercased fileType is converted to uppercase', () => {
			expect(generateSyncFileName('poliza', 2, 2026)).toBe(
				'SINCRONIZACION-POLIZA-FEBRERO-2026'
			)
		})

		it('mixed-case fileType is converted to uppercase', () => {
			expect(generateSyncFileName('Voluntaria', 3, 2025)).toBe(
				'SINCRONIZACION-VOLUNTARIA-MARZO-2025'
			)
		})
	})

	describe('Invalid month throws error', () => {
		it('month 0 throws Error with message "Invalid month: 0"', () => {
			expect(() => generateSyncFileName('POLIZA', 0, 2026)).toThrow(
				'Invalid month: 0'
			)
		})

		it('month 13 throws Error with message "Invalid month: 13"', () => {
			expect(() => generateSyncFileName('POLIZA', 13, 2026)).toThrow(
				'Invalid month: 13'
			)
		})

		it('negative month throws error', () => {
			expect(() => generateSyncFileName('POLIZA', -1, 2026)).toThrow(
				'Invalid month: -1'
			)
		})
	})

	describe('Year is included correctly', () => {
		it('year 2025 is reflected in the output', () => {
			expect(generateSyncFileName('POLIZA', 1, 2025)).toBe(
				'SINCRONIZACION-POLIZA-ENERO-2025'
			)
		})

		it('year 2030 is reflected in the output', () => {
			expect(generateSyncFileName('POLIZA', 6, 2030)).toBe(
				'SINCRONIZACION-POLIZA-JUNIO-2030'
			)
		})
	})
})
