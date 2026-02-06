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
				idClientOrigin: 2,
				idCategory: 3,
			}

			const result = createProductConfigurationSchema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.idProduct).toBe(1)
				expect(result.data.idClientOrigin).toBe(2)
				expect(result.data.idCategory).toBe(3)
			}
		})

		it('should reject missing idProduct', () => {
			const data = {
				idClientOrigin: 2,
				idCategory: 3,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject missing idClientOrigin', () => {
			const data = {
				idProduct: 1,
				idCategory: 3,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject missing idCategory', () => {
			const data = {
				idProduct: 1,
				idClientOrigin: 2,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject zero idProduct', () => {
			const data = {
				idProduct: 0,
				idClientOrigin: 2,
				idCategory: 3,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject negative idProduct', () => {
			const data = {
				idProduct: -1,
				idClientOrigin: 2,
				idCategory: 3,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject non-integer idProduct', () => {
			const data = {
				idProduct: 1.5,
				idClientOrigin: 2,
				idCategory: 3,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject zero idClientOrigin', () => {
			const data = {
				idProduct: 1,
				idClientOrigin: 0,
				idCategory: 3,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject negative idCategory', () => {
			const data = {
				idProduct: 1,
				idClientOrigin: 2,
				idCategory: -5,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject string values', () => {
			const data = {
				idProduct: 'one',
				idClientOrigin: 2,
				idCategory: 3,
			}

			const result = createProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject empty object', () => {
			const result = createProductConfigurationSchema.safeParse({})
			expect(result.success).toBe(false)
		})
	})

	describe('updateProductConfigurationSchema', () => {
		it('should validate valid data (happy path)', () => {
			const data = {
				idProductPercentajeCommisionNewBusinesses: 5,
			}

			const result = updateProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(
					result.data.idProductPercentajeCommisionNewBusinesses
				).toBe(5)
			}
		})

		it('should reject missing field', () => {
			const result = updateProductConfigurationSchema.safeParse({})
			expect(result.success).toBe(false)
		})

		it('should reject zero value', () => {
			const data = {
				idProductPercentajeCommisionNewBusinesses: 0,
			}

			const result = updateProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject negative value', () => {
			const data = {
				idProductPercentajeCommisionNewBusinesses: -1,
			}

			const result = updateProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject non-integer value', () => {
			const data = {
				idProductPercentajeCommisionNewBusinesses: 1.5,
			}

			const result = updateProductConfigurationSchema.safeParse(data)
			expect(result.success).toBe(false)
		})
	})
})
