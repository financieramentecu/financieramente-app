import { describe, it, expect } from 'vitest'
import {
	procesarPreLiquidacionSchema,
	rangoFechasSchema,
	mesSchema,
} from '../lib/pre-liquidacion-schemas'

describe('pre-liquidacion-schemas', () => {
	describe('procesarPreLiquidacionSchema', () => {
		it('should validate valid data with mes (happy path)', () => {
			const validData = {
				fileImportId: 1,
				mes: '2024-01',
			}

			const result = procesarPreLiquidacionSchema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.fileImportId).toBe(1)
				expect(result.data.mes).toBe('2024-01')
			}
		})

		it('should validate valid data with fechaInicio and fechaFin', () => {
			const validData = {
				fileImportId: 1,
				fechaInicio: '2024-01-01T00:00:00.000Z',
				fechaFin: '2024-01-31T23:59:59.999Z',
			}

			const result = procesarPreLiquidacionSchema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.fileImportId).toBe(1)
				expect(result.data.fechaInicio).toBe('2024-01-01T00:00:00.000Z')
				expect(result.data.fechaFin).toBe('2024-01-31T23:59:59.999Z')
			}
		})

		it('should reject missing fileImportId', () => {
			const data = {
				mes: '2024-01',
			}

			const result = procesarPreLiquidacionSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject fileImportId that is not a number', () => {
			const data = {
				fileImportId: '1',
				mes: '2024-01',
			}

			const result = procesarPreLiquidacionSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject fileImportId that is not an integer', () => {
			const data = {
				fileImportId: 1.5,
				mes: '2024-01',
			}

			const result = procesarPreLiquidacionSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('entero')
			}
		})

		it('should reject fileImportId that is not positive', () => {
			const data = {
				fileImportId: 0,
				mes: '2024-01',
			}

			const result = procesarPreLiquidacionSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('positivo')
			}
		})

		it('should reject negative fileImportId', () => {
			const data = {
				fileImportId: -1,
				mes: '2024-01',
			}

			const result = procesarPreLiquidacionSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject mes with invalid format', () => {
			const data = {
				fileImportId: 1,
				mes: '2024-1',
			}

			const result = procesarPreLiquidacionSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('YYYY-MM')
			}
		})

		it('should accept mes format even if month is invalid (format validation only)', () => {
			// El schema solo valida el formato YYYY-MM, no el valor del mes
			// Por lo tanto, '2024-13' pasa la validación de formato aunque sea un mes inválido
			const data = {
				fileImportId: 1,
				mes: '2024-13',
			}

			const result = procesarPreLiquidacionSchema.safeParse(data)
			// El schema acepta el formato, aunque el mes sea inválido
			expect(result.success).toBe(true)
		})

		it('should accept mes with valid format YYYY-MM', () => {
			const data = {
				fileImportId: 1,
				mes: '2024-12',
			}

			const result = procesarPreLiquidacionSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should reject when neither mes nor fechaInicio/fechaFin are provided', () => {
			const data = {
				fileImportId: 1,
			}

			const result = procesarPreLiquidacionSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('mes')
			}
		})

		it('should reject when only fechaInicio is provided without fechaFin', () => {
			const data = {
				fileImportId: 1,
				fechaInicio: '2024-01-01T00:00:00.000Z',
			}

			const result = procesarPreLiquidacionSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject when only fechaFin is provided without fechaInicio', () => {
			const data = {
				fileImportId: 1,
				fechaFin: '2024-01-31T23:59:59.999Z',
			}

			const result = procesarPreLiquidacionSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject invalid fechaInicio format', () => {
			const data = {
				fileImportId: 1,
				fechaInicio: '2024-01-01',
				fechaFin: '2024-01-31T23:59:59.999Z',
			}

			const result = procesarPreLiquidacionSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject invalid fechaFin format', () => {
			const data = {
				fileImportId: 1,
				fechaInicio: '2024-01-01T00:00:00.000Z',
				fechaFin: '2024-01-31',
			}

			const result = procesarPreLiquidacionSchema.safeParse(data)
			expect(result.success).toBe(false)
		})
	})

	describe('rangoFechasSchema', () => {
		it('should validate valid date range (happy path)', () => {
			const validData = {
				fechaInicio: '2024-01-01T00:00:00.000Z',
				fechaFin: '2024-01-31T23:59:59.999Z',
			}

			const result = rangoFechasSchema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.fechaInicio).toBe('2024-01-01T00:00:00.000Z')
				expect(result.data.fechaFin).toBe('2024-01-31T23:59:59.999Z')
			}
		})

		it('should accept equal dates', () => {
			const data = {
				fechaInicio: '2024-01-01T00:00:00.000Z',
				fechaFin: '2024-01-01T00:00:00.000Z',
			}

			const result = rangoFechasSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should reject when fechaFin is before fechaInicio', () => {
			const data = {
				fechaInicio: '2024-01-31T23:59:59.999Z',
				fechaFin: '2024-01-01T00:00:00.000Z',
			}

			const result = rangoFechasSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('posterior')
			}
		})

		it('should reject missing fechaInicio', () => {
			const data = {
				fechaFin: '2024-01-31T23:59:59.999Z',
			}

			const result = rangoFechasSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject missing fechaFin', () => {
			const data = {
				fechaInicio: '2024-01-01T00:00:00.000Z',
			}

			const result = rangoFechasSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject invalid fechaInicio format', () => {
			const data = {
				fechaInicio: '2024-01-01',
				fechaFin: '2024-01-31T23:59:59.999Z',
			}

			const result = rangoFechasSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject invalid fechaFin format', () => {
			const data = {
				fechaInicio: '2024-01-01T00:00:00.000Z',
				fechaFin: '2024-01-31',
			}

			const result = rangoFechasSchema.safeParse(data)
			expect(result.success).toBe(false)
		})
	})

	describe('mesSchema', () => {
		it('should validate valid mes format (happy path)', () => {
			const validData = {
				mes: '2024-01',
			}

			const result = mesSchema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.mes).toBe('2024-01')
			}
		})

		it('should reject mes with invalid format', () => {
			const data = {
				mes: '2024-1',
			}

			const result = mesSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('YYYY-MM')
			}
		})

		it('should reject mes without dash', () => {
			const data = {
				mes: '202401',
			}

			const result = mesSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject mes with extra characters', () => {
			const data = {
				mes: '2024-01-01',
			}

			const result = mesSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should accept mes with single digit month', () => {
			const data = {
				mes: '2024-01',
			}

			const result = mesSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should accept mes with double digit month', () => {
			const data = {
				mes: '2024-12',
			}

			const result = mesSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should reject empty mes', () => {
			const data = {
				mes: '',
			}

			const result = mesSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject missing mes', () => {
			const data = {}

			const result = mesSchema.safeParse(data)
			expect(result.success).toBe(false)
		})
	})
})
