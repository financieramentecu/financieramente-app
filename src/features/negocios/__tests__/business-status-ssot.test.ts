import { describe, it, expect } from 'vitest'
import { BUSINESS_STATUS as fromEntity } from '../types/business-entity.types'
import { BUSINESS_STATUS as fromStatusTypes } from '../types/business-status.types'

/**
 * HU3 / delta spec: una sola definición canónica de BUSINESS_STATUS.
 */
describe('BUSINESS_STATUS single source of truth', () => {
	it('re-export from business-status.types is the same object as business-entity.types', () => {
		expect(fromEntity).toBe(fromStatusTypes)
		expect(fromEntity.FONDEADO).toBe('FONDEADO')
	})
})
