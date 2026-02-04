import { describe, expect, it } from 'vitest'
import { buildProductConfigurationCode } from '../../lib/product-configuration-code'

describe('buildProductConfigurationCode', () => {
	it('normaliza espacios a guión bajo y une con guión en mayúsculas', () => {
		expect(
			buildProductConfigurationCode('CREA PATRIMONIO', 'Propio', 'Junior')
		).toBe('CREA_PATRIMONIO-PROPIO-JUNIOR')
	})

	it('devuelve CREA_PATRIMONIO-PROPIO-JUNIOR para el ejemplo del plan', () => {
		expect(
			buildProductConfigurationCode('Crea Patrimonio', 'Propio', 'Junior')
		).toBe('CREA_PATRIMONIO-PROPIO-JUNIOR')
	})

	it('maneja nombres ya en mayúsculas sin espacios', () => {
		expect(buildProductConfigurationCode('SKANDIA', 'PROPIO', 'JUNIOR')).toBe(
			'SKANDIA-PROPIO-JUNIOR'
		)
	})

	it('reemplaza múltiples espacios por un solo guión bajo', () => {
		expect(
			buildProductConfigurationCode('CREA   PATRIMONIO', 'Propio', 'Junior')
		).toBe('CREA_PATRIMONIO-PROPIO-JUNIOR')
	})

	it('recorta espacios al inicio y final', () => {
		expect(
			buildProductConfigurationCode(
				'  CREA PATRIMONIO  ',
				' Propio ',
				' Junior '
			)
		).toBe('CREA_PATRIMONIO-PROPIO-JUNIOR')
	})
})
