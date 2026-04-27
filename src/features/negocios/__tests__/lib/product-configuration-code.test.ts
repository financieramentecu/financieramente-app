import { describe, expect, it } from 'vitest'
import { buildProductConfigurationCode } from '../../lib/product-configuration-code'

describe('buildProductConfigurationCode', () => {
	it('normaliza espacios a guión bajo y une con guión en mayúsculas', () => {
		expect(
			buildProductConfigurationCode('Skandia', 'CREA PATRIMONIO', 'Propio', 'Junior')
		).toBe('SKANDIA-CREA_PATRIMONIO-PROPIO-JUNIOR')
	})

	it('devuelve SKANDIA-CREA_PATRIMONIO-PROPIO-JUNIOR para el ejemplo del plan', () => {
		expect(
			buildProductConfigurationCode('Skandia', 'Crea Patrimonio', 'Propio', 'Junior')
		).toBe('SKANDIA-CREA_PATRIMONIO-PROPIO-JUNIOR')
	})

	it('maneja nombres ya en mayúsculas sin espacios', () => {
		expect(buildProductConfigurationCode('SKANDIA', 'PRODUCTO', 'PROPIO', 'JUNIOR')).toBe(
			'SKANDIA-PRODUCTO-PROPIO-JUNIOR'
		)
	})

	it('reemplaza múltiples espacios por un solo guión bajo', () => {
		expect(
			buildProductConfigurationCode('Skandia', 'CREA   PATRIMONIO', 'Propio', 'Junior')
		).toBe('SKANDIA-CREA_PATRIMONIO-PROPIO-JUNIOR')
	})

	it('recorta espacios al inicio y final', () => {
		expect(
			buildProductConfigurationCode(
				' Skandia ',
				'  CREA PATRIMONIO  ',
				' Propio ',
				' Junior '
			)
		).toBe('SKANDIA-CREA_PATRIMONIO-PROPIO-JUNIOR')
	})
})
