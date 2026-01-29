import { describe, it, expect } from 'vitest'
import {
	formatCurrencyInput,
	parseCurrencyInput,
} from '../lib/currency-formatters'

describe('formatCurrencyInput', () => {
	describe('Formateo de números enteros', () => {
		it('debe formatear números pequeños sin separadores', () => {
			expect(formatCurrencyInput(0)).toBe('0')
			expect(formatCurrencyInput(1)).toBe('1')
			expect(formatCurrencyInput(99)).toBe('99')
			expect(formatCurrencyInput(999)).toBe('999')
		})

		it('debe formatear números con separador de miles', () => {
			expect(formatCurrencyInput(1000)).toBe('1.000')
			expect(formatCurrencyInput(10000)).toBe('10.000')
			expect(formatCurrencyInput(100000)).toBe('100.000')
			expect(formatCurrencyInput(1000000)).toBe('1.000.000')
		})

		it('debe formatear números muy grandes correctamente', () => {
			expect(formatCurrencyInput(1000000000)).toBe('1.000.000.000')
			expect(formatCurrencyInput(1234567890)).toBe('1.234.567.890')
		})
	})

	describe('Formateo de números decimales', () => {
		it('debe formatear números con un decimal usando coma', () => {
			expect(formatCurrencyInput(1.5)).toBe('1,5')
			expect(formatCurrencyInput(10.5)).toBe('10,5')
			expect(formatCurrencyInput(1000.5)).toBe('1.000,5')
		})

		it('debe formatear números con dos decimales usando coma', () => {
			expect(formatCurrencyInput(1.5)).toBe('1,5')
			expect(formatCurrencyInput(10.99)).toBe('10,99')
			expect(formatCurrencyInput(1000.5)).toBe('1.000,5')
			expect(formatCurrencyInput(1000000.5)).toBe('1.000.000,5')
		})

		it('debe redondear a máximo 2 decimales', () => {
			expect(formatCurrencyInput(1.999)).toBe('2')
			expect(formatCurrencyInput(1.995)).toBe('2')
			expect(formatCurrencyInput(1.994)).toBe('1,99')
		})
	})

	describe('Valores como string', () => {
		it('debe formatear strings numéricos correctamente', () => {
			expect(formatCurrencyInput('1000')).toBe('1.000')
			expect(formatCurrencyInput('1000.5')).toBe('1.000,5')
			expect(formatCurrencyInput('1000000')).toBe('1.000.000')
		})
	})

	describe('Casos edge', () => {
		it('debe retornar string vacío para valores inválidos', () => {
			expect(formatCurrencyInput('')).toBe('')
			expect(formatCurrencyInput(null as unknown as number)).toBe('')
			expect(formatCurrencyInput(undefined as unknown as number)).toBe('')
			expect(formatCurrencyInput('abc')).toBe('')
			expect(formatCurrencyInput(NaN)).toBe('')
		})

		it('debe manejar valores negativos', () => {
			expect(formatCurrencyInput(-1000)).toBe('-1.000')
			expect(formatCurrencyInput(-1000.5)).toBe('-1.000,5')
		})

		it('debe manejar cero correctamente', () => {
			expect(formatCurrencyInput(0)).toBe('0')
			expect(formatCurrencyInput(0.0)).toBe('0')
			expect(formatCurrencyInput(0.5)).toBe('0,5')
		})
	})
})

describe('parseCurrencyInput', () => {
	describe('Parsing de valores formateados', () => {
		it('debe parsear números sin separadores', () => {
			expect(parseCurrencyInput('0')).toBe(0)
			expect(parseCurrencyInput('1')).toBe(1)
			expect(parseCurrencyInput('99')).toBe(99)
			expect(parseCurrencyInput('999')).toBe(999)
		})

		it('debe parsear números con separador de miles (punto)', () => {
			expect(parseCurrencyInput('1.000')).toBe(1000)
			expect(parseCurrencyInput('10.000')).toBe(10000)
			expect(parseCurrencyInput('100.000')).toBe(100000)
			expect(parseCurrencyInput('1.000.000')).toBe(1000000)
		})

		it('debe parsear números con separador decimal (coma)', () => {
			expect(parseCurrencyInput('1,5')).toBe(1.5)
			expect(parseCurrencyInput('10,99')).toBe(10.99)
			expect(parseCurrencyInput('1000,50')).toBe(1000.5)
		})

		it('debe parsear números con ambos separadores', () => {
			expect(parseCurrencyInput('1.000,5')).toBe(1000.5)
			expect(parseCurrencyInput('1.000.000,50')).toBe(1000000.5)
			expect(parseCurrencyInput('10.000.000,99')).toBe(10000000.99)
		})

		it('debe parsear números muy grandes correctamente', () => {
			expect(parseCurrencyInput('1.000.000.000')).toBe(1000000000)
			expect(parseCurrencyInput('1.234.567.890')).toBe(1234567890)
			expect(parseCurrencyInput('1.234.567.890,50')).toBe(1234567890.5)
		})
	})

	describe('Valores vacíos e inválidos', () => {
		it('debe retornar null para valores vacíos', () => {
			expect(parseCurrencyInput('')).toBeNull()
			expect(parseCurrencyInput('   ')).toBeNull()
			expect(parseCurrencyInput('\t')).toBeNull()
		})

		it('debe retornar null para solo caracteres especiales', () => {
			expect(parseCurrencyInput('.')).toBeNull()
			expect(parseCurrencyInput(',')).toBeNull()
			expect(parseCurrencyInput('..')).toBeNull()
			expect(parseCurrencyInput(',,')).toBeNull()
			expect(parseCurrencyInput('.,')).toBeNull()
			expect(parseCurrencyInput('...')).toBeNull()
		})

		it('debe retornar null para valores no numéricos', () => {
			expect(parseCurrencyInput('abc')).toBeNull()
			expect(parseCurrencyInput('1.2.3')).toBeNull() // Puntos en posiciones incorrectas
			expect(parseCurrencyInput('1,2,3')).toBeNull() // Múltiples comas
			expect(parseCurrencyInput('texto123')).toBeNull() // Caracteres no numéricos
			expect(parseCurrencyInput('12.3.4')).toBeNull() // Puntos en grupos incorrectos
		})
	})

	describe('Casos edge', () => {
		it('debe manejar valores negativos', () => {
			expect(parseCurrencyInput('-1.000')).toBe(-1000)
			expect(parseCurrencyInput('-1.000,5')).toBe(-1000.5)
		})

		it('debe manejar cero correctamente', () => {
			expect(parseCurrencyInput('0')).toBe(0)
			expect(parseCurrencyInput('0,0')).toBe(0)
			expect(parseCurrencyInput('0,5')).toBe(0.5)
		})

		it('debe ignorar espacios en blanco', () => {
			expect(parseCurrencyInput(' 1.000 ')).toBe(1000)
			expect(parseCurrencyInput('1.000,5 ')).toBe(1000.5)
			expect(parseCurrencyInput(' 1.000,5')).toBe(1000.5)
		})

		it('debe rechazar valores con múltiples comas', () => {
			// Múltiples comas son inválidas según el formato colombiano
			expect(parseCurrencyInput('1,5,3')).toBeNull()
			expect(parseCurrencyInput('1,2,3,4')).toBeNull()
		})
	})

	describe('Roundtrip: format -> parse', () => {
		it('debe mantener el valor después de formatear y parsear', () => {
			const values = [
				0, 1, 100, 1000, 10000, 1000000, 1.5, 10.99, 1000.5, 1000000.5,
			]

			values.forEach((value) => {
				const formatted = formatCurrencyInput(value)
				const parsed = parseCurrencyInput(formatted)
				// Permitir pequeña diferencia por redondeo
				if (parsed !== null) {
					expect(Math.abs(parsed - value)).toBeLessThan(0.01)
				}
			})
		})
	})
})
