import { describe, expect, it } from 'vitest'
import { buildProductConfigurationCode } from '../../lib/product-configuration-code'

describe('buildProductConfigurationCode', () => {
	it('normaliza espacios a guión bajo y une con guión en mayúsculas', () => {
		expect(buildProductConfigurationCode('Skandia', 'CREA PATRIMONIO', 'Junior')).toBe(
			'SKANDIA-CREA_PATRIMONIO-JUNIOR'
		)
	})

	it('devuelve SKANDIA-CREA_PATRIMONIO-JUNIOR para el ejemplo del plan', () => {
		expect(buildProductConfigurationCode('Skandia', 'Crea Patrimonio', 'Junior')).toBe(
			'SKANDIA-CREA_PATRIMONIO-JUNIOR'
		)
	})

	it('maneja nombres ya en mayúsculas sin espacios', () => {
		expect(buildProductConfigurationCode('SKANDIA', 'PRODUCTO', 'JUNIOR')).toBe(
			'SKANDIA-PRODUCTO-JUNIOR'
		)
	})

	it('reemplaza múltiples espacios por un solo guión bajo', () => {
		expect(
			buildProductConfigurationCode('Skandia', 'CREA   PATRIMONIO', 'Junior')
		).toBe('SKANDIA-CREA_PATRIMONIO-JUNIOR')
	})

	it('recorta espacios al inicio y final', () => {
		expect(
			buildProductConfigurationCode(' Skandia ', '  CREA PATRIMONIO  ', ' Junior ')
		).toBe('SKANDIA-CREA_PATRIMONIO-JUNIOR')
	})

	it('should build code with 3 segments: company-product-category (no origin)', () => {
		const result = buildProductConfigurationCode('CREA PATRIMONIO', 'PROPIO', 'MS JUNIOR')
		expect(result).toBe('CREA_PATRIMONIO-PROPIO-MS_JUNIOR')
	})

	it('should reject 4-argument calls (no origin param)', () => {
		// TypeScript debe rechazar el 4to argumento
		// @ts-expect-error — origin param was removed
		buildProductConfigurationCode('A', 'B', 'C', 'D')
	})
})
