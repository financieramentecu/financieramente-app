import { describe, it, expect } from 'vitest'
import {
	createProductConfigurationSchema,
	updateProductConfigurationSchema,
} from '../../lib/product-configuration-schemas'

describe('product-configuration-schemas', () => {
	describe('createProductConfigurationSchema', () => {
		it('should validate valid data (happy path)', () => {
			const validData = {
				idProduct: 1,
				idCategory: 3,
				idCompany: 1,
			}

			const result = createProductConfigurationSchema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.idProduct).toBe(1)
				expect(result.data.idCategory).toBe(3)
			}
		})

		it('should reject missing idProduct', () => {
			const data = {
				idCategory: 3,
				idCompany: 1,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject missing idCategory', () => {
			const data = {
				idProduct: 1,
				idCompany: 1,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject missing idCompany', () => {
			const data = {
				idProduct: 1,
				idCategory: 3,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject zero idProduct', () => {
			const data = {
				idProduct: 0,
				idCategory: 3,
				idCompany: 1,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject negative idProduct', () => {
			const data = {
				idProduct: -1,
				idCategory: 3,
				idCompany: 1,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject non-integer idProduct', () => {
			const data = {
				idProduct: 1.5,
				idCategory: 3,
				idCompany: 1,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject negative idCategory', () => {
			const data = {
				idProduct: 1,
				idCategory: -5,
				idCompany: 1,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject string values', () => {
			const data = {
				idProduct: 'one',
				idCategory: 3,
				idCompany: 1,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject empty object', () => {
			const result = createProductConfigurationSchema.safeParse({})
			expect(result.success).toBe(false)
		})

		it('should ignore unexpected fields like idClientOrigin', () => {
			const data = {
				idProduct: 1,
				idCategory: 3,
				idCompany: 1,
				idClientOrigin: 99, // should be stripped/ignored
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect('idClientOrigin' in result.data).toBe(false)
			}
		})
	})

	describe('updateProductConfigurationSchema', () => {
		it('should validate valid data (happy path)', () => {
			const data = {
				idProductPercentageCommissionNewBusinesses: 5,
			}

			const result = updateProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.idProductPercentageCommissionNewBusinesses).toBe(5)
			}
		})

		it('should reject missing field', () => {
			const result = updateProductConfigurationSchema.safeParse({})
			expect(result.success).toBe(false)
		})

		it('should reject zero value', () => {
			const data = {
				idProductPercentageCommissionNewBusinesses: 0,
			}

			const result = updateProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject negative value', () => {
			const data = {
				idProductPercentageCommissionNewBusinesses: -1,
			}

			const result = updateProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject non-integer value', () => {
			const data = {
				idProductPercentageCommissionNewBusinesses: 1.5,
			}

			const result = updateProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})
	})
})
