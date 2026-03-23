import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { validateExcelStructure } from '@/features/load-file/lib/validate-excel-structure'
import {
	FILE_TYPES,
	POLIZA_REQUIRED_HEADERS,
	VOLUNTARIA_REQUIRED_HEADERS,
} from '@/features/load-file/lib/file-types'

function buildFile(headers: readonly string[]): File {
	const worksheet = XLSX.utils.aoa_to_sheet([Array.from(headers), ['']])
	const workbook = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
	const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
	const file = new File([buffer], 'test.xlsx', {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	})

	if (typeof file.arrayBuffer !== 'function') {
		const arrayBuffer =
			buffer instanceof ArrayBuffer
				? buffer
				: buffer.buffer.slice(
						buffer.byteOffset,
						buffer.byteOffset + buffer.byteLength
					)

		Object.defineProperty(file, 'arrayBuffer', {
			value: async () => arrayBuffer,
		})
	}

	return file
}

describe('validateExcelStructure', () => {
	it('validates POLIZA headers', async () => {
		const file = buildFile(POLIZA_REQUIRED_HEADERS)
		const result = await validateExcelStructure(file, FILE_TYPES.POLIZA)
		expect(result.isValid).toBe(true)
	})

	it('validates VOLUNTARIA headers', async () => {
		const file = buildFile(VOLUNTARIA_REQUIRED_HEADERS)
		const result = await validateExcelStructure(file, FILE_TYPES.VOLUNTARIA)
		expect(result.isValid).toBe(true)
	})

	it('rejects mismatched headers for file type', async () => {
		const file = buildFile(VOLUNTARIA_REQUIRED_HEADERS)
		const result = await validateExcelStructure(file, FILE_TYPES.POLIZA)
		expect(result.isValid).toBe(false)
		expect(result.missingColumns?.length || 0).toBeGreaterThan(0)
	})

	it('returns error when the Excel file is empty (no rows)', async () => {
		const worksheet = XLSX.utils.aoa_to_sheet([])
		const workbook = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
		const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
		const file = new File([buffer], 'empty.xlsx', {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		})
		Object.defineProperty(file, 'arrayBuffer', {
			value: async () =>
				buffer instanceof ArrayBuffer
					? buffer
					: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
		})

		const result = await validateExcelStructure(file, FILE_TYPES.POLIZA)

		expect(result.isValid).toBe(false)
		expect(result.error).toMatch(/vacío/)
	})

	it('returns error when the file is corrupted and cannot be parsed', async () => {
		const blob = new Blob(['not-an-excel-file'], { type: 'application/octet-stream' })
		const file = new File([blob], 'corrupt.xlsx', {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		})

		const result = await validateExcelStructure(file, FILE_TYPES.POLIZA)

		expect(result.isValid).toBe(false)
		expect(result.error).toBeDefined()
	})

	it('accepts POLIZA headers with non-accented column name (Plan de Compensacion)', async () => {
		// Header comparison is accent-insensitive via normalizeHeaderValue in header-utils.
		// Required column is "Plan de Compensación"; file has "Plan de Compensacion" (no accent).
		const headersWithoutAccent = POLIZA_REQUIRED_HEADERS.map((h) =>
			h === 'Plan de Compensación' ? 'Plan de Compensacion' : h
		)
		const file = buildFile(headersWithoutAccent)
		const result = await validateExcelStructure(file, FILE_TYPES.POLIZA)
		expect(result.isValid).toBe(true)
	})
})
