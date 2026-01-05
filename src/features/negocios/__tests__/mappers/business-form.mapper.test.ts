import { describe, it, expect } from 'vitest'
import {
	businessEntityToFormData,
	formDataToUpdateRequest,
	hasFormChanges,
} from '../../mappers/business-form.mapper'
import { createMockBusiness } from '../fixtures/mock-business'

describe('businessEntityToFormData', () => {
	describe('Happy Path', () => {
		it('should transform BusinessEntity to form data', () => {
			const business = createMockBusiness()

			const result = businessEntityToFormData(business)

			expect(result.email).toBe(business.client.email)
			expect(result.identityNumber).toBe(business.client.identityNumber)
			expect(result.contract).toBe(business.contract)
			expect(result.value).toBe(business.value)
		})

		it('should split fullName into name and lastNames', () => {
			const business = createMockBusiness({
				client: {
					id: 1,
					fullName: 'María García López',
					identityNumber: '1234567890',
					email: 'maria@test.com',
					phone: '3001234567',
				},
			})

			const result = businessEntityToFormData(business)

			expect(result.name).toBe('María')
			expect(result.lastNames).toBe('García López')
		})

		it('should convert IDs to strings for select fields', () => {
			const business = createMockBusiness()

			const result = businessEntityToFormData(business)

			expect(result.compania).toBe('1')
			expect(result.producto).toBe('1')
			expect(result.currency).toBe('1')
			expect(result.periodicity).toBe('1')
			expect(result.clientOrigin).toBe('1')
			expect(result.agent).toBe('2')
		})

		it('should map term correctly', () => {
			const business = createMockBusiness({ term: 24 })

			const result = businessEntityToFormData(business)

			expect(result.terms).toBe(24)
		})
	})

	describe('Flujos Alternos', () => {
		it('should handle null email', () => {
			const business = createMockBusiness({
				client: {
					id: 1,
					fullName: 'Test User',
					identityNumber: '123',
					email: null,
					phone: null,
				},
			})

			const result = businessEntityToFormData(business)

			expect(result.email).toBe('')
		})

		it('should handle null periodicity', () => {
			const business = createMockBusiness({ periodicity: null })

			const result = businessEntityToFormData(business)

			expect(result.periodicity).toBe('')
		})

		it('should handle null contract', () => {
			const business = createMockBusiness({ contract: null })

			const result = businessEntityToFormData(business)

			expect(result.contract).toBe('')
		})

		it('should handle null term', () => {
			const business = createMockBusiness({ term: null })

			const result = businessEntityToFormData(business)

			expect(result.terms).toBeUndefined()
		})

		it('should handle single name without lastName', () => {
			const business = createMockBusiness({
				client: {
					id: 1,
					fullName: 'María',
					identityNumber: '123',
					email: null,
					phone: null,
				},
			})

			const result = businessEntityToFormData(business)

			expect(result.name).toBe('María')
			expect(result.lastNames).toBe('')
		})
	})
})

describe('formDataToUpdateRequest', () => {
	it('should extract contract for update', () => {
		const formData = {
			contract: 'PN0005678',
			email: 'test@test.com',
			name: 'Test',
		}

		const result = formDataToUpdateRequest(formData)

		expect(result).toEqual({ contract: 'PN0005678' })
	})

	it('should return undefined contract when empty', () => {
		const formData = {
			contract: '',
		}

		const result = formDataToUpdateRequest(formData)

		expect(result.contract).toBeUndefined()
	})
})

describe('hasFormChanges', () => {
	it('should return true when contract changed', () => {
		const current = { contract: 'PN0005678' }
		const original = { contract: 'PN0001234' }

		expect(hasFormChanges(current, original)).toBe(true)
	})

	it('should return false when contract is the same', () => {
		const current = { contract: 'PN0001234' }
		const original = { contract: 'PN0001234' }

		expect(hasFormChanges(current, original)).toBe(false)
	})

	it('should return true when contract added', () => {
		const current = { contract: 'PN0005678' }
		const original = { contract: '' }

		expect(hasFormChanges(current, original)).toBe(true)
	})
})
