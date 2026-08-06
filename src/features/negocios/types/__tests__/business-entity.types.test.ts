import { describe, it, expect } from 'vitest'
import {
	BUSINESS_NOVEDAD_STATUS,
	MANUAL_NOVEDAD_STATUSES,
} from '../business-entity.types'

describe('BUSINESS_NOVEDAD_STATUS (novedad-gestion-manual)', () => {
	it('has exactly 5 keys: NUEVA, SOMETIDA_DEVOLUCION, DECLINADA, PENDIENTE, CANCELADA', () => {
		expect(Object.keys(BUSINESS_NOVEDAD_STATUS).sort()).toEqual(
			[
				'CANCELADA',
				'DECLINADA',
				'NUEVA',
				'PENDIENTE',
				'SOMETIDA_DEVOLUCION',
			].sort()
		)
	})

	it('SOMETIDA_DEVOLUCION value fits VarChar(20)', () => {
		expect(BUSINESS_NOVEDAD_STATUS.SOMETIDA_DEVOLUCION.length).toBeLessThanOrEqual(20)
	})
})

describe('MANUAL_NOVEDAD_STATUSES', () => {
	it('contains exactly the 4 manual statuses, excluding NUEVA', () => {
		expect([...MANUAL_NOVEDAD_STATUSES].sort()).toEqual(
			['SOMETIDA_DEVOLUCION', 'DECLINADA', 'PENDIENTE', 'CANCELADA'].sort()
		)
		expect(MANUAL_NOVEDAD_STATUSES).not.toContain('NUEVA')
	})
})
