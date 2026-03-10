import { describe, it, expect } from 'vitest'
import { rowValidatorService } from '../../services/validators/row.validator.service'
import { FILE_TYPES } from '../../lib/file-types'
import type { ProcessedRecord } from '../../types/load-file.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(data: Record<string, unknown>): ProcessedRecord {
	return { rowNumber: 1, isValid: true, errors: [], data }
}

const VOLUNTARIA_HEADERS = ['Cto', 'Base', 'Com', 'Tipo de Comision', 'Desde', 'Hasta']
const POLIZA_HEADERS = [
	'Contrato Largo',
	'BASE',
	'Valor Comisión',
	'Plan de Compensación',
]

// ---------------------------------------------------------------------------
// isEmptyValue
// ---------------------------------------------------------------------------

describe('RowValidatorService.isEmptyValue', () => {
	it('returns true for null', () => {
		expect(rowValidatorService.isEmptyValue(null)).toBe(true)
	})

	it('returns true for undefined', () => {
		expect(rowValidatorService.isEmptyValue(undefined)).toBe(true)
	})

	it('returns true for empty string', () => {
		expect(rowValidatorService.isEmptyValue('')).toBe(true)
	})

	it('returns true for whitespace-only string', () => {
		expect(rowValidatorService.isEmptyValue('   ')).toBe(true)
	})

	it('returns false for a valid string', () => {
		expect(rowValidatorService.isEmptyValue('hello')).toBe(false)
	})

	it('returns false for a number', () => {
		expect(rowValidatorService.isEmptyValue(0)).toBe(false)
	})
})

// ---------------------------------------------------------------------------
// cleanStringValue
// ---------------------------------------------------------------------------

describe('RowValidatorService.cleanStringValue', () => {
	it('returns null for null input', () => {
		expect(rowValidatorService.cleanStringValue(null)).toBe(null)
	})

	it('returns null for undefined input', () => {
		expect(rowValidatorService.cleanStringValue(undefined)).toBe(null)
	})

	it('returns null for empty string', () => {
		expect(rowValidatorService.cleanStringValue('')).toBe(null)
	})

	it('returns null for whitespace-only string', () => {
		expect(rowValidatorService.cleanStringValue('   ')).toBe(null)
	})

	it('returns trimmed string for padded value', () => {
		expect(rowValidatorService.cleanStringValue('  hello  ')).toBe('hello')
	})

	it('returns the value as string for a number', () => {
		expect(rowValidatorService.cleanStringValue(42)).toBe('42')
	})
})

// ---------------------------------------------------------------------------
// parseDate
// ---------------------------------------------------------------------------

describe('RowValidatorService.parseDate', () => {
	it('returns null for null input', () => {
		expect(rowValidatorService.parseDate(null)).toBe(null)
	})

	it('returns null for empty string', () => {
		expect(rowValidatorService.parseDate('')).toBe(null)
	})

	it('returns the same Date for a Date input', () => {
		const d = new Date('2023-06-15')
		expect(rowValidatorService.parseDate(d)).toBe(d)
	})

	it('parses a valid ISO date string', () => {
		// Use mid-year to avoid UTC→local timezone crossing year boundary
		const result = rowValidatorService.parseDate('2023-06-15')
		expect(result).toBeInstanceOf(Date)
		expect(result!.getUTCFullYear()).toBe(2023)
	})

	it('returns null for an invalid date string', () => {
		expect(rowValidatorService.parseDate('not-a-date')).toBe(null)
	})

	it('parses an Excel serial number to a valid date', () => {
		// Excel serial 44927 → 2023-01-01
		const result = rowValidatorService.parseDate(44927)
		expect(result).toBeInstanceOf(Date)
		expect(result!.getFullYear()).toBeGreaterThanOrEqual(2022)
		expect(result!.getFullYear()).toBeLessThanOrEqual(2024)
	})
})

// ---------------------------------------------------------------------------
// getColumnValue
// ---------------------------------------------------------------------------

describe('RowValidatorService.getColumnValue', () => {
	it('returns value via exact header match', () => {
		const record = makeRecord({ Base: 500 })
		expect(rowValidatorService.getColumnValue(record, 'Base', ['Base'])).toBe(500)
	})

	it('returns value via single-word fuzzy match (word boundary)', () => {
		// header 'mi Base' normalized → 'mi base'; \bbase\b matches because space is a word boundary
		const record = makeRecord({ 'mi Base': 999 })
		expect(
			rowValidatorService.getColumnValue(record, 'Base', ['mi Base'])
		).toBe(999)
	})

	it('returns value via multi-word fuzzy match (ordered words)', () => {
		// Required: 'Tipo Comision', header: 'Tipo de Comision'
		const record = makeRecord({ 'Tipo de Comision': 'PENSION' })
		const result = rowValidatorService.getColumnValue(
			record,
			'Tipo Comision',
			['Tipo de Comision']
		)
		expect(result).toBe('PENSION')
	})

	it('returns null when no header matches', () => {
		const record = makeRecord({ Foo: 'bar' })
		expect(
			rowValidatorService.getColumnValue(record, 'NonExistent', ['Foo'])
		).toBe(null)
	})

	it('returns null for multi-word required when words are in wrong order', () => {
		const record = makeRecord({ 'Comision Tipo': 'X' })
		// Required is 'Tipo Comision' but header has them reversed
		const result = rowValidatorService.getColumnValue(
			record,
			'Tipo Comision',
			['Comision Tipo']
		)
		// The fuzzy match checks ordered occurrence — 'tipo' appears at index 9 after 'comision' at 0
		// so lastIndex would fail → null
		expect(result).toBe(null)
	})
})

// ---------------------------------------------------------------------------
// validateAndExtractRow — error paths
// ---------------------------------------------------------------------------

describe('RowValidatorService.validateAndExtractRow — validation errors', () => {
	it('throws when contract (Cto) is missing', () => {
		const record = makeRecord({
			Cto: '',
			Base: 1000,
			Com: 100,
			'Tipo de Comision': 'T',
			Desde: new Date('2023-01-01'),
			Hasta: new Date('2023-01-31'),
		})
		expect(() =>
			rowValidatorService.validateAndExtractRow(
				record,
				VOLUNTARIA_HEADERS,
				FILE_TYPES.VOLUNTARIA
			)
		).toThrow('El campo Cto (ID de contrato) está vacío')
	})

	it('throws when Base is empty', () => {
		const record = makeRecord({
			Cto: 'VOL-001',
			Base: '',
			Com: 100,
			'Tipo de Comision': 'T',
			Desde: new Date('2023-01-01'),
			Hasta: new Date('2023-01-31'),
		})
		expect(() =>
			rowValidatorService.validateAndExtractRow(
				record,
				VOLUNTARIA_HEADERS,
				FILE_TYPES.VOLUNTARIA
			)
		).toThrow('El campo Base es requerido')
	})

	it('throws when Base is not a valid number', () => {
		const record = makeRecord({
			Cto: 'VOL-001',
			Base: 'NOT_A_NUMBER',
			Com: 100,
			'Tipo de Comision': 'T',
			Desde: new Date('2023-01-01'),
			Hasta: new Date('2023-01-31'),
		})
		expect(() =>
			rowValidatorService.validateAndExtractRow(
				record,
				VOLUNTARIA_HEADERS,
				FILE_TYPES.VOLUNTARIA
			)
		).toThrow('Valor numérico inválido')
	})

	it('throws when Com is empty', () => {
		const record = makeRecord({
			Cto: 'VOL-001',
			Base: 1000,
			Com: '',
			'Tipo de Comision': 'T',
			Desde: new Date('2023-01-01'),
			Hasta: new Date('2023-01-31'),
		})
		expect(() =>
			rowValidatorService.validateAndExtractRow(
				record,
				VOLUNTARIA_HEADERS,
				FILE_TYPES.VOLUNTARIA
			)
		).toThrow('El campo Comisión es requerido')
	})

	it('throws when Voluntaria dates are missing', () => {
		const record = makeRecord({
			Cto: 'VOL-001',
			Base: 1000,
			Com: 100,
			'Tipo de Comision': 'T',
			Desde: '',
			Hasta: '',
		})
		expect(() =>
			rowValidatorService.validateAndExtractRow(
				record,
				VOLUNTARIA_HEADERS,
				FILE_TYPES.VOLUNTARIA
			)
		).toThrow('Las fechas Desde o Hasta están vacías o son inválidas')
	})
})

// ---------------------------------------------------------------------------
// validateAndExtractRow — happy paths
// ---------------------------------------------------------------------------

describe('RowValidatorService.validateAndExtractRow — happy paths', () => {
	it('extracts all fields correctly for VOLUNTARIA', () => {
		const record = makeRecord({
			Cto: 'VOL-123',
			Base: 2000,
			Com: 150,
			'Tipo de Comision': 'PENSION',
			Desde: new Date('2023-03-01'),
			Hasta: new Date('2023-03-31'),
		})

		const result = rowValidatorService.validateAndExtractRow(
			record,
			VOLUNTARIA_HEADERS,
			FILE_TYPES.VOLUNTARIA
		)

		expect(result.contract).toBe('VOL-123')
		expect(result.descripcion).toBe('PENSION')
		expect(Number(result.base)).toBe(2000)
		expect(Number(result.commission)).toBe(150)
		expect(result.startDate).toBeInstanceOf(Date)
		expect(result.endDate).toBeInstanceOf(Date)
	})

	it('extracts all fields correctly for POLIZA (no dates)', () => {
		const record = makeRecord({
			'Contrato Largo': 'POL-456',
			BASE: 5000,
			'Valor Comisión': 300,
			'Plan de Compensación': 'PLAN A',
		})

		const result = rowValidatorService.validateAndExtractRow(
			record,
			POLIZA_HEADERS,
			FILE_TYPES.POLIZA
		)

		expect(result.contract).toBe('POL-456')
		expect(result.descripcion).toBe('PLAN A')
		expect(Number(result.base)).toBe(5000)
		expect(Number(result.commission)).toBe(300)
		expect(result.startDate).toBe(null)
		expect(result.endDate).toBe(null)
	})

	it('returns null descripcion when descripcion column is empty', () => {
		const record = makeRecord({
			Cto: 'VOL-001',
			Base: 100,
			Com: 10,
			'Tipo de Comision': '',
			Desde: new Date('2023-01-01'),
			Hasta: new Date('2023-01-31'),
		})

		const result = rowValidatorService.validateAndExtractRow(
			record,
			VOLUNTARIA_HEADERS,
			FILE_TYPES.VOLUNTARIA
		)

		expect(result.descripcion).toBe(null)
	})
})
